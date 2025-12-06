'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import OfficerNav from '@/components/officer/OfficerNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import {
  Crown,
  Briefcase,
  ClipboardList,
  Eye,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Calendar,
  BarChart3,
  Search,
  Filter,
  MapPin,
  CheckSquare,
  Square,
  X,
  Loader,
  LucideIcon,
  RotateCcw,
  Pause,
  FileSpreadsheet,
  Download,
  ChevronLeft,
  ChevronRight,
  Settings,
  Save,
  X as XIcon
} from 'lucide-react';

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
  verifiedByName?: string | null; // Name of officer who performed manual check-in
  verifiedByEmail?: string | null; // Email of officer who performed manual check-in
  verifiedAt?: string;
  verificationNote?: string;
  cancelReason?: string;
  lateReason?: string;
  createdAt?: string;
  updatedAt?: string;
  dayNumber?: number; // For multiple_days activities
  slotDate?: string; // For multiple_days activities
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
  registeredDaySlots?: Array<{ day: number; slot: 'morning' | 'afternoon' | 'evening' }>;
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
  type?: 'single_day' | 'multiple_days';
  schedule?: Array<{
    day: number;
    date: string;
    activities: string;
  }>;
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
  full: number; // 80-100% participation
  incomplete: number; // 60-80% participation
  insufficient: number; // <60% participation
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
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
    invalid: 0,
    full: 0,
    incomplete: 0,
    insufficient: 0
  });
  const [loading, setLoading] = useState(true);
  
  // Participation percentage thresholds (configurable by officer)
  const [participationThresholds, setParticipationThresholds] = useState<{ 
    full: { min: number; max: number }; 
    incomplete: { min: number; max: number }; 
    insufficient: { min: number; max: number } 
  }>(() => {
    // Load from localStorage or use defaults
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`participationThresholds_${activityId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Support both old format (single number) and new format (min/max)
          if (parsed) {
            if (parsed.full && typeof parsed.full === 'object' && parsed.full.min !== undefined && parsed.full.max !== undefined) {
              return parsed; // New format
            } else if (typeof parsed.full === 'number') {
              // Convert old format to new format
              return {
                full: { min: parsed.full, max: 100 },
                incomplete: { min: parsed.incomplete || 60, max: parsed.full - 1 },
                insufficient: { min: parsed.insufficient || 0, max: (parsed.incomplete || 60) - 1 }
              };
            }
          }
        } catch (e) {
          // Invalid JSON, use defaults
        }
      }
    }
    return {
      full: { min: 80, max: 100 }, // 80-100% = Đầy đủ
      incomplete: { min: 60, max: 80 }, // 60-80% = Không đầy đủ
      insufficient: { min: 0, max: 60 } // 0-60% = Thiếu
    };
  });
  
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'checkedIn' | 'notCheckedIn'>('all');
  const [filterParticipationStatus, setFilterParticipationStatus] = useState<'all' | 'fullyAttended' | 'incomplete' | 'notAttended'>('all');
  const [filterAttendanceStatus, setFilterAttendanceStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filterValidationStatus, setFilterValidationStatus] = useState<'all' | 'perfect' | 'late_but_valid' | 'manual_check_in'>('all');
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [verifyingAttendance, setVerifyingAttendance] = useState<Set<string>>(new Set());
  const [verificationNote, setVerificationNote] = useState<{ [key: string]: string }>({});
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null); // For multiple_days: selected day number
  const [weekSelectionModal, setWeekSelectionModal] = useState(false);
  const [cancelModal, setCancelModal] = useState<{ open: boolean; attendanceId: string | null; participantId?: string | null; selectedDay?: number | null }>({ open: false, attendanceId: null, participantId: null, selectedDay: null });
  const [cancelReason, setCancelReason] = useState<string>('');
  const [checkInAllModal, setCheckInAllModal] = useState<{ open: boolean; checkedIn: boolean }>({ open: false, checkedIn: true });
  const [detailModal, setDetailModal] = useState<{ open: boolean; attendance: AttendanceRecord | null; participant: Participant | null }>({ open: false, attendance: null, participant: null });
  const [manualCheckInModal, setManualCheckInModal] = useState<{ 
    open: boolean; 
    participant: Participant | null; 
    slot: TimeSlot | null;
    checkInType: 'start' | 'end' | null;
    slotDate?: string;
    dayNumber?: number;
  }>({ 
    open: false, 
    participant: null, 
    slot: null,
    checkInType: null
  });
  const [manualCheckInPhoto, setManualCheckInPhoto] = useState<File | null>(null);
  const [manualCheckInPhotoPreview, setManualCheckInPhotoPreview] = useState<string | null>(null);
  const [bulkManualCheckInModal, setBulkManualCheckInModal] = useState<{
    open: boolean;
    slot: TimeSlot | null;
    checkInType: 'start' | 'end' | null;
    checkBoth: boolean;
    slotDate?: string;
    dayNumber?: number;
    shouldOverride: boolean;
    allSlots: boolean;
  }>({
    open: false,
    slot: null,
    checkInType: null,
    checkBoth: false,
    shouldOverride: false,
    allSlots: false
  });
  const [confirmCheckInAllSessionsModal, setConfirmCheckInAllSessionsModal] = useState<{
    open: boolean;
    participant: Participant | null;
    selectedDay?: number | null;
  }>({
    open: false,
    participant: null,
    selectedDay: null
  });
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

  const hasAccess = user && (user.role === 'CLUB_DEPUTY' || user.role === 'OFFICER' || user.role === 'CLUB_MEMBER');

  // Load theme only once on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // Listen for theme changes
    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem('theme');
      setIsDarkMode(currentTheme === 'dark');
    };

    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      // Save current selectedDay before fetching to preserve it
      const currentSelectedDay = selectedDay;
      
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
            const schedule = activityData.data.activity.schedule || data.data.activity.schedule || [];
            let timeSlots = activityData.data.activity.timeSlots || data.data.activity.timeSlots || [];
            
            // For multiple_days, if timeSlots is empty, extract from schedule
            if (activityData.data.activity.type === 'multiple_days' && (!timeSlots || timeSlots.length === 0) && schedule.length > 0) {
              timeSlots = extractTimeSlotsFromSchedule(schedule);
            }
            
            const activityDataToSet = {
              ...data.data.activity,
              type: activityData.data.activity.type,
              schedule: schedule,
              timeSlots: timeSlots,
              locationData: activityData.data.activity.locationData || data.data.activity.locationData,
              multiTimeLocations: activityData.data.activity.multiTimeLocations || data.data.activity.multiTimeLocations
            };
            
            // Debug: Log location data
            console.log('Activity location data:', {
              hasLocationData: !!activityDataToSet.locationData,
              locationData: activityDataToSet.locationData,
              hasMultiTimeLocations: !!(activityDataToSet.multiTimeLocations && activityDataToSet.multiTimeLocations.length > 0),
              multiTimeLocations: activityDataToSet.multiTimeLocations
            });
            
        setActivity(activityDataToSet);
        
        // Restore selectedDay if it still exists in schedule, otherwise prioritize current day, then nearest upcoming day, then first day
        if (activityDataToSet.type === 'multiple_days' && activityDataToSet.schedule && activityDataToSet.schedule.length > 0) {
          if (currentSelectedDay !== null && activityDataToSet.schedule.some((s: any) => s.day === currentSelectedDay)) {
            // Restore the previously selected day
            setSelectedDay(currentSelectedDay);
          } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Try to find current day
            const currentDaySchedule = activityDataToSet.schedule.find((s: any) => {
              const scheduleDate = s.date?.$date ? new Date(s.date.$date) : new Date(s.date);
              scheduleDate.setHours(0, 0, 0, 0);
              return scheduleDate.getTime() === today.getTime();
            });
            
            if (currentDaySchedule) {
              // Select current day if found
              setSelectedDay(currentDaySchedule.day);
            } else {
              // Find nearest upcoming day (closest future day)
              const upcomingDays = activityDataToSet.schedule
                .map((s: any) => {
                  const scheduleDate = s.date?.$date ? new Date(s.date.$date) : new Date(s.date);
                  scheduleDate.setHours(0, 0, 0, 0);
                  return { day: s.day, date: scheduleDate };
                })
                .filter((item: any) => item.date >= today)
                .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
              
              if (upcomingDays.length > 0) {
                // Select nearest upcoming day
                setSelectedDay(upcomingDays[0].day);
              } else {
                // If no upcoming days, select first day
            setSelectedDay(activityDataToSet.schedule[0].day);
              }
            }
          }
        } else {
          setSelectedDay(null);
        }
          } else {
            const schedule = data.data.activity.schedule || [];
            let timeSlots = data.data.activity.timeSlots || [];
            
            // For multiple_days, if timeSlots is empty, extract from schedule
            if (data.data.activity.type === 'multiple_days' && (!timeSlots || timeSlots.length === 0) && schedule.length > 0) {
              timeSlots = extractTimeSlotsFromSchedule(schedule);
            }
            
            const activityToSet = {
              ...data.data.activity,
              type: data.data.activity.type,
              timeSlots: timeSlots,
              schedule: schedule,
              locationData: data.data.activity.locationData,
              multiTimeLocations: data.data.activity.multiTimeLocations
            };
            setActivity(activityToSet);
            // Restore selectedDay if it still exists in schedule, otherwise prioritize current day, then nearest upcoming day, then first day
            if (activityToSet.type === 'multiple_days' && activityToSet.schedule && activityToSet.schedule.length > 0) {
              if (currentSelectedDay !== null && activityToSet.schedule.some((s: any) => s.day === currentSelectedDay)) {
                // Restore the previously selected day
                setSelectedDay(currentSelectedDay);
              } else {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                // Try to find current day
                const currentDaySchedule = activityToSet.schedule.find((s: any) => {
                  const scheduleDate = s.date?.$date ? new Date(s.date.$date) : new Date(s.date);
                  scheduleDate.setHours(0, 0, 0, 0);
                  return scheduleDate.getTime() === today.getTime();
                });
                
                if (currentDaySchedule) {
                  // Select current day if found
                  setSelectedDay(currentDaySchedule.day);
                } else {
                  // Find nearest upcoming day (closest future day)
                  const upcomingDays = activityToSet.schedule
                    .map((s: any) => {
                      const scheduleDate = s.date?.$date ? new Date(s.date.$date) : new Date(s.date);
                      scheduleDate.setHours(0, 0, 0, 0);
                      return { day: s.day, date: scheduleDate };
                    })
                    .filter((item: any) => item.date >= today)
                    .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
                  
                  if (upcomingDays.length > 0) {
                    // Select nearest upcoming day
                    setSelectedDay(upcomingDays[0].day);
                  } else {
                    // If no upcoming days, select first day
                setSelectedDay(activityToSet.schedule[0].day);
                  }
                }
              }
            } else {
              setSelectedDay(null);
            }
          }
        } else {
          const schedule = data.data.activity.schedule || [];
          let timeSlots = data.data.activity.timeSlots || [];
          
          // For multiple_days, if timeSlots is empty, extract from schedule
          if (data.data.activity.type === 'multiple_days' && (!timeSlots || timeSlots.length === 0) && schedule.length > 0) {
            timeSlots = extractTimeSlotsFromSchedule(schedule);
          }
          
          const activityToSet = {
            ...data.data.activity,
            timeSlots: timeSlots,
            schedule: schedule
          };
          setActivity(activityToSet);
          // Restore selectedDay if it still exists in schedule, otherwise prioritize current day, then nearest upcoming day, then first day
          if (activityToSet.type === 'multiple_days' && activityToSet.schedule && activityToSet.schedule.length > 0) {
            if (currentSelectedDay !== null && activityToSet.schedule.some((s: any) => s.day === currentSelectedDay)) {
              // Restore the previously selected day
              setSelectedDay(currentSelectedDay);
            } else {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              // Try to find current day
              const currentDaySchedule = activityToSet.schedule.find((s: any) => {
                const scheduleDate = s.date?.$date ? new Date(s.date.$date) : new Date(s.date);
                scheduleDate.setHours(0, 0, 0, 0);
                return scheduleDate.getTime() === today.getTime();
              });
              
              if (currentDaySchedule) {
                // Select current day if found
                setSelectedDay(currentDaySchedule.day);
              } else {
                // Find nearest upcoming day (closest future day)
                const upcomingDays = activityToSet.schedule
                  .map((s: any) => {
                    const scheduleDate = s.date?.$date ? new Date(s.date.$date) : new Date(s.date);
                    scheduleDate.setHours(0, 0, 0, 0);
                    return { day: s.day, date: scheduleDate };
                  })
                  .filter((item: any) => item.date >= today)
                  .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
                
                if (upcomingDays.length > 0) {
                  // Select nearest upcoming day
                  setSelectedDay(upcomingDays[0].day);
                } else {
                  // If no upcoming days, select first day
              setSelectedDay(activityToSet.schedule[0].day);
                }
              }
            }
          } else {
            setSelectedDay(null);
          }
        }
        
        const participantsData = data.data.participants || [];
        setParticipants(participantsData);
        
        // Calculate stats based on actual participants data
        const total = participantsData.length;
        // Count checkedIn: participants who have at least one attendance record (approved or pending)
        const checkedIn = participantsData.filter((p: Participant) => 
          p.attendances && p.attendances.length > 0 && 
          p.attendances.some((a: AttendanceRecord) => a.status === 'approved' || a.status === 'pending')
        ).length;
        const notCheckedIn = total - checkedIn;
        const attendanceRate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
        
        const baseStats = data.data.statistics || {
          total: 0,
          checkedIn: 0,
          notCheckedIn: 0,
          attendanceRate: 0
        };
        setStats({
          total,
          checkedIn,
          notCheckedIn,
          attendanceRate,
          perfect: baseStats.perfect || 0,
          lateButValid: baseStats.lateButValid || 0,
          invalid: baseStats.invalid || 0,
          full: 0, // These are calculated in calculatedStats useMemo
          incomplete: 0,
          insufficient: 0
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  // Fetch attendance data when auth is ready and user has access
  useEffect(() => {
    if (!authLoading && hasAccess) {
      fetchAttendance();
    } else if (authLoading === false && user && !hasAccess) {
      setLoading(false);
      setError('Bạn không có quyền truy cập trang này.');
    }
  }, [activityId, hasAccess, authLoading, fetchAttendance]);

  // Auto-select day when activity is loaded for multiple_days (prioritize current day, then nearest upcoming day)
  useEffect(() => {
    if (activity && activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0) {
      // Only set if not already set or if the current selectedDay is not in the schedule
      const dayExists = activity.schedule.some((d: any) => d.day === selectedDay);
      if (selectedDay === null || !dayExists) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Try to find current day
        const currentDaySchedule = activity.schedule.find((d: any) => {
          const scheduleDate = d.date?.$date ? new Date(d.date.$date) : new Date(d.date);
          scheduleDate.setHours(0, 0, 0, 0);
          return scheduleDate.getTime() === today.getTime();
        });
        
        if (currentDaySchedule) {
          // Select current day if found
          setSelectedDay(currentDaySchedule.day);
        } else {
          // Find nearest upcoming day (closest future day)
          const upcomingDays = activity.schedule
            .map((d: any) => {
              const scheduleDate = d.date?.$date ? new Date(d.date.$date) : new Date(d.date);
              scheduleDate.setHours(0, 0, 0, 0);
              return { day: d.day, date: scheduleDate };
            })
            .filter((item: any) => item.date >= today)
            .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
          
          if (upcomingDays.length > 0) {
            // Select nearest upcoming day
            setSelectedDay(upcomingDays[0].day);
          } else {
            // If no upcoming days, select first day
        const firstDay = activity.schedule[0].day;
        setSelectedDay(firstDay);
          }
        }
      }
    } else if (activity && activity.type !== 'multiple_days') {
      setSelectedDay(null);
    }
    
    // Debug: Log activity data
    if (activity) {
      console.log('Activity data:', {
        type: activity.type,
        hasSchedule: !!activity.schedule,
        scheduleLength: activity.schedule?.length,
        hasTimeSlots: !!activity.timeSlots,
        timeSlotsType: typeof activity.timeSlots,
        isArray: Array.isArray(activity.timeSlots),
        timeSlotsLength: activity.timeSlots?.length,
        timeSlots: activity.timeSlots
      });
    }
  }, [activity, selectedDay]);

  // Initialize selectedSessions when modal opens
  useEffect(() => {
    if (confirmCheckInAllSessionsModal.open && confirmCheckInAllSessionsModal.participant) {
      const missingInfo = calculateMissingCheckIns(confirmCheckInAllSessionsModal.participant, confirmCheckInAllSessionsModal.selectedDay);
      if (missingInfo.sessions.length > 0) {
        // Select all sessions (including "not_started" ones) when modal first opens
        setSelectedSessions(new Set(missingInfo.sessions.map(s => s.key)));
      } else {
        setSelectedSessions(new Set());
      }
    } else if (!confirmCheckInAllSessionsModal.open) {
      // Reset when modal closes
      setSelectedSessions(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmCheckInAllSessionsModal.open, confirmCheckInAllSessionsModal.participant?.userId, confirmCheckInAllSessionsModal.selectedDay]);

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

  // Calculate missing check-ins for a participant
  // selectedDay: only calculate for this day if provided (for multiple_days activities)
  // Returns detailed information about each missing check-in
  const calculateMissingCheckIns = (participant: Participant, selectedDay?: number | null): { 
    count: number; 
    details: string[];
    sessions: Array<{
      key: string;
      label: string;
      slot: any;
      checkInType: 'start' | 'end';
      dayNumber?: number;
      slotDate?: string;
      dayDate?: Date;
    }>;
  } => {
    if (!activity) return { count: 0, details: [], sessions: [] };
    
    const activeSlots = activity.timeSlots?.filter((s: any) => s.isActive) || [];
    const details: string[] = [];
    const sessions: Array<{
      key: string;
      label: string;
      slot: any;
      checkInType: 'start' | 'end';
      dayNumber?: number;
      slotDate?: string;
      dayDate?: Date;
    }> = [];
    let count = 0;

    if (activity.type === 'single_day') {
      activeSlots.forEach((slot: any) => {
        // Only count if participant has registered for this slot
        if (!isSlotRegistered(participant, slot)) {
          return;
        }
        
        const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', activity.date);
        if (!startStatus.hasCheckedIn) {
          count++;
          const label = `${slot.name} - Đầu buổi`;
          details.push(label);
          sessions.push({
            key: `${slot.name}-start`,
            label,
            slot,
            checkInType: 'start',
            slotDate: activity.date,
            dayDate: new Date(activity.date)
          });
        }
        
        const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', activity.date);
        if (!endStatus.hasCheckedIn) {
          count++;
          const label = `${slot.name} - Cuối buổi`;
          details.push(label);
          sessions.push({
            key: `${slot.name}-end`,
            label,
            slot,
            checkInType: 'end',
            slotDate: activity.date,
            dayDate: new Date(activity.date)
          });
        }
      });
    } else if (activity.type === 'multiple_days' && activity.schedule) {
      // If selectedDay is provided, only calculate for that day
      const daysToCheck = selectedDay !== null && selectedDay !== undefined
        ? activity.schedule.filter((scheduleDay: any) => scheduleDay.day === selectedDay)
        : activity.schedule;
      
      daysToCheck.forEach((scheduleDay: any) => {
        const dayDate = scheduleDay.date;
        const dayNumber = scheduleDay.day;
        
        activeSlots.forEach((slot: any) => {
          // Only count if participant has registered for this slot
          if (!isSlotRegistered(participant, slot, dayNumber)) {
            return;
          }
          
          const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', dayDate, dayNumber);
          if (!startStatus.hasCheckedIn) {
            count++;
            const label = `Ngày ${dayNumber} - ${slot.name} - Đầu buổi`;
            details.push(label);
            sessions.push({
              key: `day${dayNumber}-${slot.name}-start`,
              label,
              slot,
              checkInType: 'start',
              dayNumber,
              slotDate: dayDate,
              dayDate: new Date(dayDate)
            });
          }
          
          const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', dayDate, dayNumber);
          if (!endStatus.hasCheckedIn) {
            count++;
            const label = `Ngày ${dayNumber} - ${slot.name} - Cuối buổi`;
            details.push(label);
            sessions.push({
              key: `day${dayNumber}-${slot.name}-end`,
              label,
              slot,
              checkInType: 'end',
              dayNumber,
              slotDate: dayDate,
              dayDate: new Date(dayDate)
            });
          }
        });
      });
    }

    return { count, details, sessions };
  };

  // Helper function to extract location from schedule activities text
  const extractLocationFromScheduleActivities = (activitiesText: string, slotName: string): { lat: number; lng: number; address: string } | null => {
    if (!activitiesText) return null;
    
    // Map slot name to search pattern
    const slotPatterns: { [key: string]: RegExp } = {
      'Buổi Sáng': /Buổi Sáng[^]*?Địa điểm map:\s*([^(]+?)\s*\(([\d.]+),\s*([\d.]+)\)/,
      'Buổi Chiều': /Buổi Chiều[^]*?Địa điểm map:\s*([^(]+?)\s*\(([\d.]+),\s*([\d.]+)\)/,
      'Buổi Tối': /Buổi Tối[^]*?Địa điểm map:\s*([^(]+?)\s*\(([\d.]+),\s*([\d.]+)\)/
    };
    
    const pattern = slotPatterns[slotName];
    if (!pattern) return null;
    
    const match = activitiesText.match(pattern);
    if (match) {
      const address = match[1].trim();
      const lat = Number(match[2]);
      const lng = Number(match[3]);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng, address };
      }
    }
    
    // Fallback: try to find any location in the text (for daily location)
    const fallbackMatch = activitiesText.match(/Địa điểm map:\s*([^(]+?)\s*\(([\d.]+),\s*([\d.]+)\)/);
    if (fallbackMatch) {
      const address = fallbackMatch[1].trim();
      const lat = Number(fallbackMatch[2]);
      const lng = Number(fallbackMatch[3]);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng, address };
      }
    }
    
    return null;
  };

  // Helper function to get location for a specific slot
  const getLocationForSlot = (slot: any, dayNumber?: number): { lat: number; lng: number; address: string } => {
    if (!activity) {
      throw new Error('Thiếu thông tin hoạt động');
    }

    // For multiple_days activities, try to extract location from schedule
    if (activity.type === 'multiple_days' && dayNumber !== undefined && activity.schedule) {
      const scheduleDay = activity.schedule.find((s: any) => s.day === dayNumber);
      if (scheduleDay && scheduleDay.activities) {
        const slotName = (slot.name || '').trim();
        const extractedLocation = extractLocationFromScheduleActivities(scheduleDay.activities, slotName);
        if (extractedLocation) {
          return extractedLocation;
        }
      }
    }

    // If activity has multiTimeLocations, try to find matching location
    if (activity.multiTimeLocations && activity.multiTimeLocations.length > 0) {
      // Map slot name to timeSlot enum
      const timeSlotMap: { [key: string]: 'morning' | 'afternoon' | 'evening' } = {
        'Buổi Sáng': 'morning',
        'Buổi Chiều': 'afternoon',
        'Buổi Tối': 'evening'
      };
      
      const slotName = (slot.name || '').trim();
      const timeSlotEnum = timeSlotMap[slotName];
      
      if (timeSlotEnum) {
        const multiLocation = activity.multiTimeLocations.find(mtl => mtl.timeSlot === timeSlotEnum);
        if (multiLocation && multiLocation.location) {
          // Handle both number and string types, and check for null/undefined
          const latValue = multiLocation.location.lat;
          const lngValue = multiLocation.location.lng;
          
          if (latValue === null || latValue === undefined || lngValue === null || lngValue === undefined) {
            throw new Error(`Vị trí không hợp lệ cho ${slotName}: thiếu thông tin lat hoặc lng`);
          }
          
          const lat = Number(latValue);
          const lng = Number(lngValue);
          
          if (isNaN(lat) || isNaN(lng)) {
            console.error('Invalid location data:', {
              slotName,
              multiLocation,
              latValue,
              lngValue,
              lat,
              lng
            });
            throw new Error(`Vị trí không hợp lệ cho ${slotName}: lat hoặc lng không phải số (lat: ${latValue}, lng: ${lngValue})`);
          }
          
          return {
            lat,
            lng,
            address: multiLocation.location.address || activity.location || ''
          };
        }
      }
    }

    // Fallback to single locationData
    if (activity.locationData && typeof activity.locationData === 'object') {
      // Check if locationData has lat and lng properties
      const latValue = activity.locationData.lat;
      const lngValue = activity.locationData.lng;
      
      // Only proceed if both lat and lng exist and are not null/undefined
      if (latValue !== null && latValue !== undefined && lngValue !== null && lngValue !== undefined) {
        const lat = Number(latValue);
        const lng = Number(lngValue);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          return {
            lat,
            lng,
            address: activity.locationData.address || activity.location || ''
          };
        } else {
          console.error('Invalid location data (NaN):', {
            locationData: activity.locationData,
            latValue,
            lngValue,
            lat,
            lng
          });
        }
      } else {
        console.error('Missing lat/lng in locationData:', {
          locationData: activity.locationData,
          hasLat: latValue !== null && latValue !== undefined,
          hasLng: lngValue !== null && lngValue !== undefined
        });
      }
    }

    // If we reach here, no valid location was found
    console.error('No valid location data found:', {
      hasLocationData: !!activity.locationData,
      locationDataType: typeof activity.locationData,
      locationDataKeys: activity.locationData ? Object.keys(activity.locationData) : [],
      hasMultiTimeLocations: !!(activity.multiTimeLocations && activity.multiTimeLocations.length > 0),
      multiTimeLocationsCount: activity.multiTimeLocations?.length || 0,
      activityId: activity._id,
      activityName: activity.name
    });
    
    throw new Error('Hoạt động này chưa có thông tin địa điểm. Vui lòng liên hệ admin để cấu hình địa điểm cho hoạt động.');
  };

  const handleManualCheckInAllSessions = async (
    participant: Participant, 
    selectedDayForCheckIn?: number | null,
    selectedSessionsData?: Array<{
      key: string;
      label: string;
      slot: any;
      checkInType: 'start' | 'end';
      dayNumber?: number;
      slotDate?: string;
      dayDate?: Date;
    }>
  ) => {
    const participantId = typeof participant.userId === 'object' && participant.userId !== null
      ? participant.userId._id || String(participant.userId)
      : String(participant.userId);
    
    if (processing.has(participantId) || !activity) return;
    
    try {
      setProcessing(prev => new Set(prev).add(participantId));
      setError(null);

      const token = localStorage.getItem('token');
      const promises: Promise<boolean>[] = [];

      // If selectedSessionsData is provided, only check-in selected sessions
      if (selectedSessionsData && selectedSessionsData.length > 0) {
        selectedSessionsData.forEach((session) => {
          const slot = session.slot;
          const slotLocation = getLocationForSlot(slot, session.dayNumber);
          
          // Calculate check-in time based on checkInType
          const timeStr = session.checkInType === 'start' ? slot.startTime : slot.endTime;
          const [hour, minute] = timeStr.split(':').map(Number);
          const checkInTime = new Date(session.dayDate || activity.date);
          checkInTime.setHours(hour, minute, 0, 0);
          
          // Determine timeSlot name
          let timeSlotName = slot.name;
          if (activity.type === 'multiple_days' && session.dayNumber) {
            timeSlotName = `Ngày ${session.dayNumber} - ${slot.name}`;
          }
          
          const promise = fetch(`/api/activities/${activityId}/attendance`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: participantId,
              checkedIn: true,
              location: slotLocation,
              timeSlot: timeSlotName,
              checkInType: session.checkInType,
              checkInTime: checkInTime.toISOString(),
              dayNumber: session.dayNumber,
              slotDate: session.slotDate,
              isManualCheckIn: true,
              verificationNote: session.dayNumber
                ? `Điểm danh thủ công bởi officer (ngày ${session.dayNumber})`
                : 'Điểm danh thủ công bởi officer'
            }),
          }).then(response => response.ok);
          
          promises.push(promise);
        });
      } else {
        // Fallback to old behavior: check all missing sessions
        const activeSlots = activity.timeSlots?.filter((s: any) => s.isActive) || [];

        if (activity.type === 'single_day') {
        // Single day: Check all registered slots only
        const activityDate = new Date(activity.date);
        
        activeSlots.forEach((slot: any) => {
          // Only check-in for slots that participant has registered for
          if (!isSlotRegistered(participant, slot)) {
            return;
          }
          
          // Get location for this specific slot
          const slotLocation = getLocationForSlot(slot);
          
          // Check start check-in
          const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', activity.date);
          if (!startStatus.hasCheckedIn) {
            const [startHour, startMinute] = slot.startTime.split(':').map(Number);
            const checkInTime = new Date(activityDate);
            checkInTime.setHours(startHour, startMinute, 0, 0);
            
            const promise = fetch(`/api/activities/${activityId}/attendance`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                userId: participantId,
                checkedIn: true,
                location: slotLocation,
                timeSlot: slot.name,
                checkInType: 'start',
                checkInTime: checkInTime.toISOString(),
                isManualCheckIn: true,
                verificationNote: 'Điểm danh thủ công bởi officer (tất cả buổi đã đăng ký)'
              }),
            }).then(response => response.ok);
            
            promises.push(promise);
          }
          
          // Check end check-in
          const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', activity.date);
          if (!endStatus.hasCheckedIn) {
            const [endHour, endMinute] = slot.endTime.split(':').map(Number);
            const checkInTime = new Date(activityDate);
            checkInTime.setHours(endHour, endMinute, 0, 0);
            
            const promise = fetch(`/api/activities/${activityId}/attendance`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                userId: participantId,
                checkedIn: true,
                location: slotLocation,
                timeSlot: slot.name,
                checkInType: 'end',
                checkInTime: checkInTime.toISOString(),
                isManualCheckIn: true,
                verificationNote: 'Điểm danh thủ công bởi officer (tất cả buổi đã đăng ký)'
              }),
            }).then(response => response.ok);
            
            promises.push(promise);
          }
        });
      } else if (activity.type === 'multiple_days' && activity.schedule) {
        // Multiple days: Check all registered slots for selected day only (or all days if selectedDayForCheckIn is not provided)
        const daysToCheck = selectedDayForCheckIn !== null && selectedDayForCheckIn !== undefined
          ? activity.schedule.filter((scheduleDay: any) => scheduleDay.day === selectedDayForCheckIn)
          : activity.schedule;
        
        daysToCheck.forEach((scheduleDay: any) => {
          const dayDate = scheduleDay.date;
          const dayNumber = scheduleDay.day;
          
          activeSlots.forEach((slot: any) => {
            // Only check-in for slots that participant has registered for
            if (!isSlotRegistered(participant, slot, dayNumber)) {
              return;
            }
            
            // Get location for this specific slot (pass dayNumber for multiple_days)
            const slotLocation = getLocationForSlot(slot, dayNumber);
            
            // Check start check-in
            const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', dayDate, dayNumber);
            if (!startStatus.hasCheckedIn) {
              const [startHour, startMinute] = slot.startTime.split(':').map(Number);
              const activityDate = new Date(dayDate);
              const checkInTime = new Date(activityDate);
              checkInTime.setHours(startHour, startMinute, 0, 0);
              
              const timeSlotName = `Ngày ${dayNumber} - ${slot.name}`;
              
              const promise = fetch(`/api/activities/${activityId}/attendance`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  userId: participantId,
                  checkedIn: true,
                  location: slotLocation,
                  timeSlot: timeSlotName,
                  checkInType: 'start',
                  checkInTime: checkInTime.toISOString(),
                  dayNumber: dayNumber,
                  slotDate: dayDate,
                  isManualCheckIn: true,
                  verificationNote: selectedDayForCheckIn !== null && selectedDayForCheckIn !== undefined
                    ? `Điểm danh thủ công bởi officer (tất cả buổi đã đăng ký ngày ${dayNumber})`
                    : 'Điểm danh thủ công bởi officer (tất cả buổi đã đăng ký)'
                }),
              }).then(response => response.ok);
              
              promises.push(promise);
            }
            
            // Check end check-in
            const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', dayDate, dayNumber);
            if (!endStatus.hasCheckedIn) {
              const [endHour, endMinute] = slot.endTime.split(':').map(Number);
              const activityDate = new Date(dayDate);
              const checkInTime = new Date(activityDate);
              checkInTime.setHours(endHour, endMinute, 0, 0);
              
              const timeSlotName = `Ngày ${dayNumber} - ${slot.name}`;
              
              const promise = fetch(`/api/activities/${activityId}/attendance`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  userId: participantId,
                  checkedIn: true,
                  location: slotLocation,
                  timeSlot: timeSlotName,
                  checkInType: 'end',
                  checkInTime: checkInTime.toISOString(),
                  dayNumber: dayNumber,
                  slotDate: dayDate,
                  isManualCheckIn: true,
                  verificationNote: selectedDayForCheckIn !== null && selectedDayForCheckIn !== undefined
                    ? `Điểm danh thủ công bởi officer (tất cả buổi đã đăng ký ngày ${dayNumber})`
                    : 'Điểm danh thủ công bởi officer (tất cả buổi đã đăng ký)'
                }),
              }).then(response => response.ok);
              
              promises.push(promise);
            }
          });
        });
      }
      }

      if (promises.length === 0) {
        const message = selectedDayForCheckIn !== null && selectedDayForCheckIn !== undefined
          ? `Người này đã điểm danh đầy đủ tất cả các buổi trong ngày ${selectedDayForCheckIn}`
          : 'Người này đã điểm danh đầy đủ tất cả các buổi';
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(null), 3000);
        return;
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r).length;
      
      await fetchAttendance();
      const message = selectedDayForCheckIn !== null && selectedDayForCheckIn !== undefined
        ? `Đã điểm danh thủ công ${successCount}/${promises.length} lượt điểm danh cho ${participant.name} trong ngày ${selectedDayForCheckIn} thành công`
        : `Đã điểm danh thủ công ${successCount}/${promises.length} lượt điểm danh cho ${participant.name} thành công`;
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi điểm danh tất cả buổi');
    } finally {
      setProcessing(prev => {
        const newSet = new Set(prev);
        newSet.delete(participantId);
        return newSet;
      });
    }
  };

  const handleManualCheckIn = async (
    participant: Participant,
    slot: TimeSlot,
    checkInType: 'start' | 'end',
    slotDate?: string,
    dayNumber?: number
  ) => {
    const participantId = typeof participant.userId === 'object' && participant.userId !== null
      ? participant.userId._id || String(participant.userId)
      : String(participant.userId);
    
    if (processing.has(participantId) || !activity) return;
    
    // TypeScript guard: activity is not null after the check above
    const currentActivity = activity;
    if (!currentActivity) return;
    
    try {
      setProcessing(prev => new Set(prev).add(participantId));
      setError(null);
      
      // Calculate activityDate first (needed for getLocationForSlot and checkInTime)
      // For multiple_days, ensure dayNumber and slotDate are set
      let finalDayNumber = dayNumber;
      let finalSlotDate = slotDate;
      
      if (currentActivity.type === 'multiple_days' && (finalDayNumber === undefined || finalSlotDate === undefined)) {
        // If dayNumber or slotDate is missing, try to get from selectedDay
        if (selectedDay !== null && currentActivity.schedule) {
          const scheduleDay = currentActivity.schedule.find((s: any) => s.day === selectedDay);
          if (scheduleDay) {
            finalDayNumber = finalDayNumber || selectedDay;
            finalSlotDate = finalSlotDate || scheduleDay.date;
          }
        }
        // If still missing, use first day as fallback
        if ((finalDayNumber === undefined || finalSlotDate === undefined) && currentActivity.schedule && currentActivity.schedule.length > 0) {
          const firstDay = currentActivity.schedule[0];
          finalDayNumber = finalDayNumber || firstDay.day;
          finalSlotDate = finalSlotDate || firstDay.date;
        }
      }
      
      let activityDate: Date;
      
      if (currentActivity.type === 'multiple_days' && finalSlotDate) {
        activityDate = new Date(finalSlotDate);
      } else if (currentActivity.type === 'multiple_days' && finalDayNumber !== undefined && currentActivity.schedule) {
        const scheduleDay = currentActivity.schedule.find((s: any) => s.day === finalDayNumber);
        if (scheduleDay && scheduleDay.date) {
          activityDate = new Date(scheduleDay.date);
        } else {
          activityDate = new Date(currentActivity.date);
        }
      } else {
        activityDate = new Date(currentActivity.date);
      }
      
      // Get location from activity settings (admin configured location)
      const location = getLocationForSlot(slot, finalDayNumber);
      
      // Calculate checkInTime based on slot time settings (admin configured time)
      let checkInTime: Date;
      
      const [startHour, startMinute] = slot.startTime.split(':').map(Number);
      const [endHour, endMinute] = slot.endTime.split(':').map(Number);
      
      if (checkInType === 'start') {
        checkInTime = new Date(activityDate);
        checkInTime.setHours(startHour, startMinute, 0, 0);
      } else {
        checkInTime = new Date(activityDate);
        checkInTime.setHours(endHour, endMinute, 0, 0);
      }
      
      // Format timeSlot
      let timeSlotName = slot.name;
      if (currentActivity.type === 'multiple_days' && finalDayNumber !== undefined) {
        timeSlotName = `Ngày ${finalDayNumber} - ${slot.name}`;
      }
      
      // Upload photo if provided
      let photoUrl: string | null = null;
      if (manualCheckInPhoto) {
        try {
          const formData = new FormData();
          formData.append('attendancePhoto', manualCheckInPhoto, `manual_attendance_${activityId}_${participantId}_${Date.now()}.jpg`);
          
          const token = localStorage.getItem('token');
          const uploadResponse = await fetch('/api/upload/attendance-photo', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          
          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || 'Không thể tải ảnh lên');
          }
          
          const uploadData = await uploadResponse.json();
          if (uploadData.success && uploadData.url) {
            photoUrl = uploadData.url;
          }
        } catch (photoError) {
          console.error('Error uploading photo:', photoError);
          throw new Error('Lỗi khi tải ảnh. Vui lòng thử lại.');
        }
      }
      
      // Ensure location has correct format (lat and lng must be numbers)
      const locationPayload = {
        lat: Number(location.lat),
        lng: Number(location.lng),
        ...(location.address ? { address: location.address } : {})
      };

      // Validate location payload
      if (isNaN(locationPayload.lat) || isNaN(locationPayload.lng)) {
        throw new Error('Vị trí không hợp lệ: lat và lng phải là số');
      }

      const requestBody = {
          userId: participantId,
          checkedIn: true,
        location: locationPayload,
          timeSlot: timeSlotName,
          checkInType: checkInType,
          checkInTime: checkInTime.toISOString(),
          photoUrl: photoUrl,
          dayNumber: finalDayNumber,
        slotDate: finalSlotDate,
          isManualCheckIn: true, // Flag to indicate manual check-in by officer
          verificationNote: 'Điểm danh thủ công bởi officer'
      };

      console.log('Manual check-in request:', {
        userId: participantId,
        timeSlot: timeSlotName,
        checkInType,
        location: locationPayload,
        dayNumber: finalDayNumber,
        slotDate: finalSlotDate,
        isManualCheckIn: true
      });

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/activities/${activityId}/attendance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Manual check-in error:', errorData);
        throw new Error(errorData.message || 'Không thể điểm danh thủ công');
      }

      await fetchAttendance();
      setManualCheckInModal({ open: false, participant: null, slot: null, checkInType: null });
      setManualCheckInPhoto(null);
      setManualCheckInPhotoPreview(null);
      setSuccessMessage('Đã điểm danh thủ công thành công');
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
    
    // If checking in, open bulk manual check-in modal
    if (checkedIn) {
      // Find first active slot as default
      const defaultSlot = activity?.timeSlots?.find((s: any) => s.isActive) || null;
      setBulkManualCheckInModal({
        open: true,
        slot: defaultSlot,
        checkInType: 'start',
        checkBoth: false,
        shouldOverride: false,
        allSlots: false
      });
      return;
    }
    
    // If canceling, proceed with direct API call
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
            checkedIn: false
          }),
        });
        return response.ok;
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r).length;
      
      await fetchAttendance();
      setSelectedParticipants(new Set());
      setSuccessMessage(`Đã hủy điểm danh ${successCount} người thành công`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  };

  const handleBulkManualCheckIn = async () => {
    if (selectedParticipants.size === 0 || !activity) {
      return;
    }
    
    // If not all slots, need a specific slot
    if (!bulkManualCheckInModal.allSlots && !bulkManualCheckInModal.slot) {
      return;
    }
    
    // If checkBoth is false and not all slots, need checkInType
    if (!bulkManualCheckInModal.allSlots && !bulkManualCheckInModal.checkBoth && !bulkManualCheckInModal.checkInType) {
      return;
    }

    try {
      setError(null);
      const token = localStorage.getItem('token');

      // Upload photo if provided
      let photoUrl: string | null = null;
      if (manualCheckInPhoto) {
        try {
          const formData = new FormData();
          formData.append('attendancePhoto', manualCheckInPhoto, `bulk_manual_attendance_${activityId}_${Date.now()}.jpg`);
          
          const uploadResponse = await fetch('/api/upload/attendance-photo', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          
          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || 'Không thể tải ảnh lên');
          }
          
          const uploadData = await uploadResponse.json();
          if (uploadData.success && uploadData.url) {
            photoUrl = uploadData.url;
          }
        } catch (photoError) {
          console.error('Error uploading photo:', photoError);
          throw new Error('Lỗi khi tải ảnh. Vui lòng thử lại.');
        }
      }

      // Get selected participants
      const selectedParticipantsList = filteredParticipants.filter(p => {
        const participantId = typeof p.userId === 'object' && p.userId !== null
          ? p.userId._id || String(p.userId)
          : String(p.userId);
        return selectedParticipants.has(participantId);
      });

      const activeSlots = activity.timeSlots?.filter((s: any) => s.isActive) || [];
      
      // If all slots, process all active slots
      if (bulkManualCheckInModal.allSlots) {
        const promises: Promise<boolean>[] = [];
        
        if (activity.type === 'single_day') {
          activeSlots.forEach((slot: any) => {
            // Get location for this specific slot
            const slotLocation = getLocationForSlot(slot);
            
            const [startHour, startMinute] = slot.startTime.split(':').map(Number);
            const [endHour, endMinute] = slot.endTime.split(':').map(Number);
            const activityDate = new Date(activity.date);
            
            selectedParticipantsList.forEach((participant) => {
              const participantId = typeof participant.userId === 'object' && participant.userId !== null
                ? participant.userId._id || String(participant.userId)
                : String(participant.userId);
              
              // Check start
              const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', activity.date);
              if (!startStatus.hasCheckedIn || bulkManualCheckInModal.shouldOverride) {
                const checkInTime = new Date(activityDate);
                checkInTime.setHours(startHour, startMinute, 0, 0);
                
                promises.push(
                  fetch(`/api/activities/${activityId}/attendance`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      userId: participantId,
                      checkedIn: true,
                      location: slotLocation,
                      timeSlot: slot.name,
                      checkInType: 'start',
                      checkInTime: checkInTime.toISOString(),
                      photoUrl: photoUrl,
                      isManualCheckIn: true,
                      verificationNote: 'Điểm danh thủ công bởi officer (đồng loạt - tất cả buổi)'
                    }),
                  }).then(response => response.ok)
                );
              }
              
              // Check end
              const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', activity.date);
              if (!endStatus.hasCheckedIn || bulkManualCheckInModal.shouldOverride) {
                const checkInTime = new Date(activityDate);
                checkInTime.setHours(endHour, endMinute, 0, 0);
                
                promises.push(
                  fetch(`/api/activities/${activityId}/attendance`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      userId: participantId,
                      checkedIn: true,
                      location: slotLocation,
                      timeSlot: slot.name,
                      checkInType: 'end',
                      checkInTime: checkInTime.toISOString(),
                      photoUrl: photoUrl,
                      isManualCheckIn: true,
                      verificationNote: 'Điểm danh thủ công bởi officer (đồng loạt - tất cả buổi)'
                    }),
                  }).then(response => response.ok)
                );
              }
            });
          });
        } else if (activity.type === 'multiple_days' && activity.schedule) {
          activity.schedule.forEach((scheduleDay: any) => {
            const dayDate = scheduleDay.date;
            const dayNumber = scheduleDay.day;
            
            activeSlots.forEach((slot: any) => {
              // Get location for this specific slot (pass dayNumber for multiple_days)
              const slotLocation = getLocationForSlot(slot, dayNumber);
              
              const [startHour, startMinute] = slot.startTime.split(':').map(Number);
              const [endHour, endMinute] = slot.endTime.split(':').map(Number);
              const activityDate = new Date(dayDate);
              
              selectedParticipantsList.forEach((participant) => {
                const participantId = typeof participant.userId === 'object' && participant.userId !== null
                  ? participant.userId._id || String(participant.userId)
                  : String(participant.userId);
                
                const timeSlotName = `Ngày ${dayNumber} - ${slot.name}`;
                
                // Check start
                const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', dayDate, dayNumber);
                if (!startStatus.hasCheckedIn || bulkManualCheckInModal.shouldOverride) {
                  const checkInTime = new Date(activityDate);
                  checkInTime.setHours(startHour, startMinute, 0, 0);
                  
                  promises.push(
                    fetch(`/api/activities/${activityId}/attendance`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        userId: participantId,
                        checkedIn: true,
                        location: slotLocation,
                        timeSlot: timeSlotName,
                        checkInType: 'start',
                        checkInTime: checkInTime.toISOString(),
                        dayNumber: dayNumber,
                        slotDate: dayDate,
                        photoUrl: photoUrl,
                        isManualCheckIn: true,
                        verificationNote: 'Điểm danh thủ công bởi officer (đồng loạt - tất cả buổi)'
                      }),
                    }).then(response => response.ok)
                  );
                }
                
                // Check end
                const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', dayDate, dayNumber);
                if (!endStatus.hasCheckedIn || bulkManualCheckInModal.shouldOverride) {
                  const checkInTime = new Date(activityDate);
                  checkInTime.setHours(endHour, endMinute, 0, 0);
                  
                  promises.push(
                    fetch(`/api/activities/${activityId}/attendance`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        userId: participantId,
                        checkedIn: true,
                        location: slotLocation,
                        timeSlot: timeSlotName,
                        checkInType: 'end',
                        checkInTime: checkInTime.toISOString(),
                        dayNumber: dayNumber,
                        slotDate: dayDate,
                        photoUrl: photoUrl,
                        isManualCheckIn: true,
                        verificationNote: 'Điểm danh thủ công bởi officer (đồng loạt - tất cả buổi)'
                      }),
                    }).then(response => response.ok)
                  );
                }
              });
            });
          });
        }
        
        const results = await Promise.all(promises);
        const successCount = results.filter(r => r).length;
        
        await fetchAttendance();
        setBulkManualCheckInModal({ open: false, slot: null, checkInType: null, checkBoth: false, shouldOverride: false, allSlots: false });
        setManualCheckInPhoto(null);
        setManualCheckInPhotoPreview(null);
        setSelectedParticipants(new Set());
        
        let message = `Đã điểm danh thủ công ${successCount}/${promises.length} lượt điểm danh thành công`;
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(null), 5000);
        return;
      }

      // Single slot processing (existing logic)
      const slot = bulkManualCheckInModal.slot!;
      
      // Calculate activity date (for checking existing attendance)
      let activityDateStr: string;
      let slotDate: string | undefined;
      let dayNumber: number | undefined;

      if (activity.type === 'multiple_days' && bulkManualCheckInModal.slotDate) {
        activityDateStr = bulkManualCheckInModal.slotDate;
        slotDate = bulkManualCheckInModal.slotDate;
        dayNumber = bulkManualCheckInModal.dayNumber;
      } else if (activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0) {
        const firstDay = activity.schedule[0];
        activityDateStr = firstDay.date;
        slotDate = firstDay.date;
        dayNumber = firstDay.day;
      } else {
        activityDateStr = activity.date;
      }
      
      // Get location for this specific slot (pass dayNumber for multiple_days)
      const slotLocation = getLocationForSlot(slot, dayNumber);
      
      const checkInTypes = bulkManualCheckInModal.checkBoth 
        ? ['start', 'end'] as const
        : [bulkManualCheckInModal.checkInType!] as const;
      
      const [startHour, startMinute] = slot.startTime.split(':').map(Number);
      const [endHour, endMinute] = slot.endTime.split(':').map(Number);

      // Check which participants already have attendance for this slot and checkInType
      const participantsToCheckIn: typeof selectedParticipantsList = [];
      const alreadyCheckedIn: Array<{ participant: Participant; checkInTypes: ('start' | 'end')[] }> = [];

      selectedParticipantsList.forEach((participant) => {
        const participantId = typeof participant.userId === 'object' && participant.userId !== null
          ? participant.userId._id || String(participant.userId)
          : String(participant.userId);

        const alreadyCheckedInTypes: ('start' | 'end')[] = [];

        checkInTypes.forEach((checkInType) => {
          const statusInfo = getAttendanceStatusWithTime(
            participant,
            slot,
            checkInType,
            activityDateStr,
            dayNumber
          );

          if (statusInfo.hasCheckedIn) {
            alreadyCheckedInTypes.push(checkInType);
          }
        });

        if (alreadyCheckedInTypes.length > 0) {
          alreadyCheckedIn.push({ participant, checkInTypes: alreadyCheckedInTypes });
        } else {
          participantsToCheckIn.push(participant);
        }
      });

      // Filter participants based on shouldOverride option
      const finalParticipantsList = bulkManualCheckInModal.shouldOverride
        ? selectedParticipantsList // Include all if override is enabled
        : participantsToCheckIn; // Only include those not checked in if override is disabled

      // If no participants to check in and override is disabled, show message
      if (finalParticipantsList.length === 0 && !bulkManualCheckInModal.shouldOverride) {
        setError('Tất cả người đã chọn đã điểm danh cho buổi này. Vui lòng bật "Ghi đè" nếu muốn điểm danh lại.');
        return;
      }

      const promises: Promise<boolean>[] = [];

      finalParticipantsList.forEach((participant) => {
        const participantId = typeof participant.userId === 'object' && participant.userId !== null
          ? participant.userId._id || String(participant.userId)
          : String(participant.userId);

        // Calculate activity date
        let activityDate: Date;
        if (activity.type === 'multiple_days' && slotDate) {
          activityDate = new Date(slotDate);
        } else if (activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0) {
          const firstDay = activity.schedule[0];
          activityDate = new Date(firstDay.date);
        } else {
          activityDate = new Date(activity.date);
        }

        // Format timeSlot
        let timeSlotName = slot.name;
        if (activity.type === 'multiple_days' && dayNumber !== undefined) {
          timeSlotName = `Ngày ${dayNumber} - ${slot.name}`;
        }

        // Create check-in for each type (start and/or end)
        checkInTypes.forEach((checkInType) => {
          // Check if already checked in (only if override is disabled)
          if (!bulkManualCheckInModal.shouldOverride) {
            const statusInfo = getAttendanceStatusWithTime(
              participant,
              slot,
              checkInType,
              activityDateStr,
              dayNumber
            );
            if (statusInfo.hasCheckedIn) {
              return; // Skip if already checked in and override is disabled
            }
          }
          
          let checkInTime: Date;
          
          if (checkInType === 'start') {
            checkInTime = new Date(activityDate);
            checkInTime.setHours(startHour, startMinute, 0, 0);
          } else {
            checkInTime = new Date(activityDate);
            checkInTime.setHours(endHour, endMinute, 0, 0);
          }

          const promise = fetch(`/api/activities/${activityId}/attendance`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: participantId,
              checkedIn: true,
              location: slotLocation,
              timeSlot: timeSlotName,
              checkInType: checkInType,
              checkInTime: checkInTime.toISOString(),
              photoUrl: photoUrl,
              dayNumber: dayNumber,
              slotDate: slotDate,
              isManualCheckIn: true,
              verificationNote: 'Điểm danh thủ công bởi officer (đồng loạt)'
            }),
          }).then(response => response.ok);

          promises.push(promise);
        });
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r).length;
      const totalExpected = selectedParticipantsList.length * checkInTypes.length;
      
      await fetchAttendance();
      setBulkManualCheckInModal({ open: false, slot: null, checkInType: null, checkBoth: false, shouldOverride: false, allSlots: false });
      setManualCheckInPhoto(null);
      setManualCheckInPhotoPreview(null);
      setSelectedParticipants(new Set());
      
      // Build detailed success message
      let message = `Đã điểm danh thủ công ${successCount}/${totalExpected} lượt điểm danh thành công`;
      if (alreadyCheckedIn.length > 0) {
        message += ` (${participantsToCheckIn.length} người mới, ${alreadyCheckedIn.length} người đã điểm danh trước đó - đã ghi đè)`;
      } else {
        message += ` (${selectedParticipantsList.length} người)`;
      }
      
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi điểm danh đồng loạt');
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

  const exportToExcel = () => {
    try {
      // Prepare data for export
      const exportData = filteredParticipants.map((participant, index) => {
        const participantName = participant.name || 'N/A';
        const participantEmail = participant.email || 'N/A';
        const participantRole = participant.role || 'Người Tham Gia';

        // Calculate attendance status (for the latest attendance)
        let attendanceStatus = 'Chưa điểm danh';
        let attendanceStatusDetail = 'N/A';
        let checkInTime = 'N/A';
        let checkInLocation = 'N/A';
        let timeSlot = 'N/A';

        if (participant.checkedIn && participant.attendances && participant.attendances.length > 0) {
          const latestAttendance = participant.attendances[participant.attendances.length - 1];

          if (latestAttendance.status === 'approved') {
            attendanceStatus = 'Đã điểm danh';
            attendanceStatusDetail = 'Đã xác nhận';
          } else if (latestAttendance.status === 'pending') {
            attendanceStatus = 'Đã điểm danh';
            attendanceStatusDetail = 'Chờ xác nhận';
          } else if (latestAttendance.status === 'rejected') {
            attendanceStatus = 'Đã điểm danh';
            attendanceStatusDetail = 'Bị từ chối';
          }

          timeSlot = latestAttendance.timeSlot || 'N/A';

          if (latestAttendance.checkInTime) {
            try {
              const date = new Date(latestAttendance.checkInTime);
              checkInTime = date.toLocaleString('vi-VN');
            } catch {
              checkInTime = 'Lỗi thời gian';
            }
          }

          if (latestAttendance.location) {
            checkInLocation = latestAttendance.location.address || `Lat: ${latestAttendance.location.lat}, Lng: ${latestAttendance.location.lng}`;
          }
        }

        return {
          'STT': index + 1,
          'Họ tên': participantName,
          'Email': participantEmail,
          'Vai trò': participantRole,
          'Thời gian/Buổi': timeSlot,
          'Trạng thái điểm danh': attendanceStatus,
          'Chi tiết trạng thái': attendanceStatusDetail,
          'Thời gian điểm danh': checkInTime,
          'Địa điểm điểm danh': checkInLocation
        };
      });

      // Convert to CSV format (Excel compatible)
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);

      // Generate filename with activity name and date
      const activityName = activity?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Hoat_dong';
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${activityName}_Diem_danh_${dateStr}.csv`;

      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Có lỗi xảy ra khi xuất file. Vui lòng thử lại.');
    }
  };

  const exportSelectedToExcel = () => {
    try {
      if (selectedParticipants.size === 0) {
        alert('Vui lòng chọn ít nhất một người để xuất Excel.');
        return;
      }

      // Get selected participants
      const selectedParticipantsList = filteredParticipants.filter(p => {
        const participantId = typeof p.userId === 'object' && p.userId !== null
          ? p.userId._id || String(p.userId)
          : String(p.userId);
        return selectedParticipants.has(participantId);
      });

      // Prepare data for export
      const exportData = selectedParticipantsList.map((participant, index) => {
        const participantName = participant.name || 'N/A';
        const participantEmail = participant.email || 'N/A';
        const participantRole = participant.role || 'Người Tham Gia';

        // Calculate attendance status (for the latest attendance)
        let attendanceStatus = 'Chưa điểm danh';
        let attendanceStatusDetail = 'N/A';
        let checkInTime = 'N/A';
        let checkInLocation = 'N/A';
        let timeSlot = 'N/A';

        if (participant.checkedIn && participant.attendances && participant.attendances.length > 0) {
          const latestAttendance = participant.attendances[participant.attendances.length - 1];

          if (latestAttendance.status === 'approved') {
            attendanceStatus = 'Đã điểm danh';
            attendanceStatusDetail = 'Đã xác nhận';
          } else if (latestAttendance.status === 'pending') {
            attendanceStatus = 'Đã điểm danh';
            attendanceStatusDetail = 'Chờ xác nhận';
          } else if (latestAttendance.status === 'rejected') {
            attendanceStatus = 'Đã điểm danh';
            attendanceStatusDetail = 'Bị từ chối';
          }

          timeSlot = latestAttendance.timeSlot || 'N/A';

          if (latestAttendance.checkInTime) {
            try {
              const date = new Date(latestAttendance.checkInTime);
              checkInTime = date.toLocaleString('vi-VN');
            } catch {
              checkInTime = 'Lỗi thời gian';
            }
          }

          if (latestAttendance.location) {
            checkInLocation = latestAttendance.location.address || `Lat: ${latestAttendance.location.lat}, Lng: ${latestAttendance.location.lng}`;
          }
        }

        return {
          'STT': index + 1,
          'Họ tên': participantName,
          'Email': participantEmail,
          'Vai trò': participantRole,
          'Thời gian/Buổi': timeSlot,
          'Trạng thái điểm danh': attendanceStatus,
          'Chi tiết trạng thái': attendanceStatusDetail,
          'Thời gian điểm danh': checkInTime,
          'Địa điểm điểm danh': checkInLocation
        };
      });

      if (exportData.length === 0) {
        alert('Không có dữ liệu để xuất.');
        return;
      }

      // Convert to CSV format (Excel compatible)
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);

      // Generate filename with activity name and date
      const activityName = activity?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Hoat_dong';
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${activityName}_Diem_danh_Da_chon_${dateStr}.csv`;

      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error exporting selected to Excel:', error);
      alert('Có lỗi xảy ra khi xuất file. Vui lòng thử lại.');
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
  const getVerifierName = (verifiedBy: any, verifiedByName?: string | null): string => {
    // Priority 1: Use verifiedByName if available (manual check-in)
    if (verifiedByName && typeof verifiedByName === 'string' && verifiedByName.trim().length > 0) {
      return verifiedByName.trim();
    }
    
    if (!verifiedBy) {
      return 'Hệ thống tự động';
    }
    
    if (typeof verifiedBy === 'string') {
      // If it's a string, it might be an ID - don't show it
      // Check if it looks like an ObjectId (24 hex characters)
      if (/^[0-9a-fA-F]{24}$/.test(verifiedBy)) {
        return 'Hệ thống tự động';
      }
      return verifiedBy;
    }
    
    if (typeof verifiedBy === 'object') {
      // Check name field first (most common) - this should be set for manual check-ins
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
      
      // Check if it's a populated user object with nested name
      if (verifiedBy.userId && typeof verifiedBy.userId === 'object' && verifiedBy.userId.name) {
        return verifiedBy.userId.name.trim();
      }
      
      // If object has _id but no name, try email as fallback
      if (verifiedBy._id) {
        // If we have email, use it as fallback
        if (verifiedBy.email && typeof verifiedBy.email === 'string' && verifiedBy.email.trim().length > 0) {
          return verifiedBy.email.trim();
        }
        // If no name or email, it's likely an unpopulated ID reference
        return 'Hệ thống tự động';
    }
    
      return 'Hệ thống tự động';
    }
    
    return 'Hệ thống tự động';
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

    // For multiple_days activities, extract location from schedule
    if (activity.type === 'multiple_days' && activity.schedule) {
      // Try to get dayNumber from attendance record, or extract from timeSlot
      let dayNumber = attendance.dayNumber;
      if (dayNumber === undefined && attendance.timeSlot) {
        // Extract day number from timeSlot (e.g., "Ngày 1 - Buổi Sáng" -> 1)
        const dayMatch = attendance.timeSlot.match(/Ngày\s+(\d+)/);
        if (dayMatch) {
          dayNumber = Number(dayMatch[1]);
        }
      }
      
      if (dayNumber !== undefined) {
        const scheduleDay = activity.schedule.find((s: any) => s.day === dayNumber);
        if (scheduleDay && scheduleDay.activities) {
          // Extract slot name from timeSlot (e.g., "Ngày 1 - Buổi Sáng" -> "Buổi Sáng")
          const slotName = attendance.timeSlot?.includes(' - ') 
            ? attendance.timeSlot.split(' - ')[1] 
            : attendance.timeSlot;
          
          const extractedLocation = extractLocationFromScheduleActivities(scheduleDay.activities, slotName || '');
          if (extractedLocation) {
            // Extract radius from schedule text (default to 200m if not found)
            const radiusMatch = scheduleDay.activities.match(/Bán kính:\s*(\d+)m/);
            const radius = radiusMatch ? Number(radiusMatch[1]) : 200;
            
            const distance = calculateDistance(
              userLat,
              userLng,
              extractedLocation.lat,
              extractedLocation.lng
            );
            
            if (distance <= radius) {
              return { valid: true, distance };
            } else {
              return {
                valid: false,
                distance,
                message: `Cách vị trí ${slotName || 'hoạt động'} ${distance.toFixed(0)}m (yêu cầu: trong ${radius}m)`
              };
            }
          }
        }
      }
    }

    // Check single location
    if (activity.locationData && activity.locationData.lat && activity.locationData.lng) {
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
    
    // For multiple_days, use date from schedule or slotDate
    let activityDate: Date;
    if (activity.type === 'multiple_days' && activity.schedule) {
      // Try to get dayNumber from attendance record, or extract from timeSlot
      let dayNumber = attendance.dayNumber;
      if (dayNumber === undefined && attendance.timeSlot) {
        // Extract day number from timeSlot (e.g., "Ngày 1 - Buổi Sáng" -> 1)
        const dayMatch = attendance.timeSlot.match(/Ngày\s+(\d+)/);
        if (dayMatch) {
          dayNumber = Number(dayMatch[1]);
        }
      }
      
      if (dayNumber !== undefined) {
        const scheduleDay = activity.schedule.find((s: any) => s.day === dayNumber);
        if (scheduleDay && scheduleDay.date) {
          activityDate = new Date(scheduleDay.date);
        } else if (attendance.slotDate) {
          activityDate = new Date(attendance.slotDate);
        } else {
          activityDate = new Date(activity.date);
        }
      } else if (attendance.slotDate) {
        activityDate = new Date(attendance.slotDate);
      } else {
        activityDate = new Date(activity.date);
      }
    } else if (attendance.slotDate) {
      activityDate = new Date(attendance.slotDate);
    } else {
      activityDate = new Date(activity.date);
    }
    
    // Extract slot name from timeSlot (e.g., "Ngày 1 - Buổi Sáng" -> "Buổi Sáng")
    const slotName = attendance.timeSlot?.includes(' - ') 
      ? attendance.timeSlot.split(' - ')[1] 
      : attendance.timeSlot;
    
    // Find the time slot
    const timeSlot = activity.timeSlots.find(ts => ts.name === slotName && ts.isActive);
    if (!timeSlot) {
      // If not found, try to find by matching the full timeSlot string
      const fallbackTimeSlot = activity.timeSlots.find(ts => 
        attendance.timeSlot?.includes(ts.name) && ts.isActive
      );
      if (fallbackTimeSlot) {
        // Use fallback timeSlot
        const [startHours, startMinutes] = fallbackTimeSlot.startTime.split(':').map(Number);
        const [endHours, endMinutes] = fallbackTimeSlot.endTime.split(':').map(Number);
        
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
        
        // On-time window: 15 minutes before to 15 minutes after target time
        const onTimeStart = new Date(targetTime);
        onTimeStart.setMinutes(onTimeStart.getMinutes() - 15);
        const onTimeEnd = new Date(targetTime);
        onTimeEnd.setMinutes(onTimeEnd.getMinutes() + 15);
        
        // Late window: from 15 minutes after to 30 minutes after target time
        const lateWindowStart = new Date(targetTime);
        lateWindowStart.setMinutes(lateWindowStart.getMinutes() + 15);
        const lateWindowEnd = new Date(targetTime);
        lateWindowEnd.setMinutes(lateWindowEnd.getMinutes() + 30);
        
        if (checkInTime >= onTimeStart && checkInTime <= onTimeEnd) {
          return { 
            valid: true, 
            isOnTime: true,
            isLate: false,
            isEarly: false,
            isInLateWindow: false
          };
        }
        
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
        
        const diffMinutes = Math.round((checkInTime.getTime() - targetTime.getTime()) / (1000 * 60));
        return { 
          valid: false, 
          isOnTime: false,
          isLate: diffMinutes > 0,
          isEarly: diffMinutes < 0,
          isInLateWindow: false,
          message: `Điểm danh ${Math.abs(diffMinutes)} phút ${diffMinutes > 0 ? 'muộn' : 'sớm'} so với thời gian quy định (quá cửa sổ cho phép)` 
        };
      }
      
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

  // Get time status for a slot (not_started, in_progress, past)
  // checkInType: 'start' for đầu buổi, 'end' for cuối buổi
  // Logic: 
  // - 15 phút trước đến 15 phút sau: Đúng giờ (on_time)
  // - 15 phút sau đến 30 phút sau: Trễ nhưng vẫn điểm danh được (in_progress, late)
  // - Sau 30 phút: Quá trễ, không điểm danh được (past)
  const getTimeStatus = (slot: TimeSlot, activityDate: string, checkInType?: 'start' | 'end'): 'not_started' | 'in_progress' | 'past' => {
    if (!slot || !slot.startTime || !slot.endTime) {
      return 'past';
    }

    const now = new Date();
    const date = new Date(activityDate);
    
    const [startHour, startMinute] = slot.startTime.split(':').map(Number);
    const [endHour, endMinute] = slot.endTime.split(':').map(Number);
    
    const startTime = new Date(date);
    startTime.setHours(startHour, startMinute, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(endHour, endMinute, 0, 0);
    
    // Determine target time based on checkInType
    let targetTime: Date;
    if (checkInType === 'end') {
      // For cuối buổi, use endTime
      targetTime = endTime;
    } else {
      // For đầu buổi or default, use startTime
      targetTime = startTime;
    }
    
    // Allow 15 minutes before target time
    const earlyStart = new Date(targetTime.getTime() - 15 * 60000);
    // Close 30 minutes after target time (15 phút trễ + 15 phút nữa = 30 phút tổng cộng)
    const closeTime = new Date(targetTime.getTime() + 30 * 60000);
    
    if (now < earlyStart) {
      return 'not_started';
    } else if (now >= earlyStart && now <= closeTime) {
      return 'in_progress';
    } else {
      return 'past';
    }
  };

  // Helper function to check if participant has registered for a specific day and slot
  const isSlotRegistered = (
    participant: Participant,
    slot: TimeSlot,
    dayNumber?: number
  ): boolean => {
    // For single_day activities, if no registeredDaySlots, assume registered for all slots (backward compatibility)
    if (!activity || activity.type === 'single_day') {
      if (!participant.registeredDaySlots || participant.registeredDaySlots.length === 0) {
        return true; // Backward compatibility: assume registered for all slots
      }
      // For single_day, check if participant has any registeredDaySlots (any registration means they're registered)
      return participant.registeredDaySlots.length > 0;
    }
    
    // For multiple_days activities, check if participant has registered for this specific day and slot
    if (!participant.registeredDaySlots || participant.registeredDaySlots.length === 0) {
      return false; // No registration means not registered
    }
    
    // Map slot name to slot key
    const timeSlotMap: { [key: string]: 'morning' | 'afternoon' | 'evening' } = {
      'Buổi Sáng': 'morning',
      'Buổi Chiều': 'afternoon',
      'Buổi Tối': 'evening'
    };
    
    const slotKey = timeSlotMap[slot.name];
    if (!slotKey) return false;
    
    // Check if participant has registered for this day and slot
    return participant.registeredDaySlots.some(
      (ds) => ds.day === dayNumber && ds.slot === slotKey
    );
  };

  // Helper function to check if participant has registered for any slot on a specific day
  const hasRegisteredForDay = (
    participant: Participant,
    dayNumber: number
  ): boolean => {
    if (!participant.registeredDaySlots || participant.registeredDaySlots.length === 0) {
      // For single_day, if no registeredDaySlots, assume registered (backward compatibility)
      if (!activity || activity.type === 'single_day') {
        return true;
      }
      return false;
    }
    
    return participant.registeredDaySlots.some((ds) => ds.day === dayNumber);
  };

  // Get attendance status with time information (similar to admin)
  const getAttendanceStatusWithTime = (
    participant: Participant,
    slot: TimeSlot,
    checkInType: 'start' | 'end',
    activityDate: string,
    dayNumber?: number
  ) => {
    // Find matching attendance record
    const attendance = participant.attendances?.find((a) => {
      if (!a.timeSlot || a.checkInType !== checkInType) {
        return false;
      }
      
      // Check date match for both single_day and multiple_days activities
        try {
          const checkInDate = new Date(a.checkInTime);
          const activityDateObj = new Date(activityDate);
          // Compare dates (ignore time)
        if (checkInDate.toLocaleDateString('vi-VN') !== activityDateObj.toLocaleDateString('vi-VN')) {
            return false;
          }
        } catch {
          // If date parsing fails, continue with slot matching
      }
      
      const slotName = (slot.name || '').trim();
      const timeSlot = (a.timeSlot || '').trim();
      
      // Exact match
      if (timeSlot.toLowerCase() === slotName.toLowerCase()) {
        return true;
      }
      
      // For multiple days: check day number
      if (dayNumber !== undefined) {
        const dayMatch = timeSlot.match(/Ngày\s*(\d+)/i);
        if (dayMatch && parseInt(dayMatch[1]) === dayNumber) {
          if (timeSlot.toLowerCase().endsWith(` - ${slotName.toLowerCase()}`)) {
            return true;
          }
        }
      }
      
      // Pattern matching for slot types (e.g., "Buổi Sáng", "Buổi Chiều", "Buổi Tối")
      const slotPattern = /buổi\s+(sáng|chiều|tối)/i;
      const slotNameMatch = slotName.toLowerCase().match(slotPattern);
      const timeSlotMatch = timeSlot.toLowerCase().match(slotPattern);
      if (slotNameMatch && timeSlotMatch && slotNameMatch[1] === timeSlotMatch[1]) {
        return true;
      }
      
      // Additional pattern: check if slot name contains the time slot name
      if (slotName && timeSlot.toLowerCase().includes(slotName.toLowerCase())) {
        return true;
      }
      if (timeSlot && slotName.toLowerCase().includes(timeSlot.toLowerCase())) {
        return true;
      }
      
      return false;
    });
    
    const timeStatus = getTimeStatus(slot, activityDate, checkInType);
    
    if (attendance) {
      // Check if check-in was on time
      const checkInTime = new Date(attendance.checkInTime);
      const slotDate = new Date(activityDate);
      
      const targetTimeStr = checkInType === 'start' ? slot.startTime : slot.endTime;
      if (!targetTimeStr) {
        return {
          attendance,
          status: attendance.status,
          timeStatus: 'unknown',
          hasCheckedIn: true
        };
      }
      
      const [targetHour, targetMinute] = targetTimeStr.split(':').map(Number);
      const targetTime = new Date(slotDate);
      targetTime.setHours(targetHour, targetMinute, 0, 0);
      
      const bufferMinutes = 15;
      const lateTime = new Date(targetTime.getTime() + bufferMinutes * 60000);
      
      const isOnTime = checkInTime <= lateTime;
      
      return {
        attendance,
        status: attendance.status,
        timeStatus: isOnTime ? 'on_time' : 'late',
        hasCheckedIn: true
      };
    } else {
      return {
        attendance: null,
        status: null,
        timeStatus: timeStatus,
        hasCheckedIn: false
      };
    }
  };

  // Check if all slots in a day have not started yet
  const areAllSlotsNotStarted = (activityDate: string, dayNumber?: number): boolean => {
    if (!activity || !activity.timeSlots) return false;
    
    const activeSlots = activity.timeSlots.filter(slot => slot.isActive);
    if (activeSlots.length === 0) return false;
    
    // Check all slots (both start and end) for the day
    for (const slot of activeSlots) {
      const startStatus = getTimeStatus(slot, activityDate, 'start');
      const endStatus = getTimeStatus(slot, activityDate, 'end');
      
      // If any slot has started (in_progress or past), return false
      if (startStatus !== 'not_started' || endStatus !== 'not_started') {
        return false;
      }
    }
    
    return true;
  };

  // Calculate overall attendance percentage for a participant
  // Based on total check-ins needed (each slot has 2 check-ins: start + end)
  // Counts both approved and pending check-ins (pending = already checked in, waiting for approval)
  // Uses getAttendanceStatusWithTime to ensure consistency with UI display
  // Only counts slots that the participant has registered for
  const calculateOverallAttendancePercentage = (participant: Participant, selectedDayForCalculation?: number | null): { 
    percentage: number; 
    completed: number; 
    total: number 
  } => {
    if (!activity || !activity.timeSlots) return { percentage: 0, completed: 0, total: 0 };
    
    const activeSlots = activity.timeSlots.filter(slot => slot.isActive);
    if (activeSlots.length === 0) return { percentage: 0, completed: 0, total: 0 };
    
    let totalCheckIns = 0; // Total check-ins needed (100%)
    let completedCheckIns = 0; // Number of check-ins (approved + pending, excluding rejected)
    
    // For multiple_days activities
    if (activity.type === 'multiple_days' && activity.schedule) {
      // If selectedDayForCalculation is provided, only calculate for that day
      const daysToProcess = selectedDayForCalculation !== null && selectedDayForCalculation !== undefined
        ? activity.schedule.filter(s => s.day === selectedDayForCalculation)
        : activity.schedule;
      
      // Count check-ins across selected days and slots (approved + pending)
      // Only count slots that participant has registered for
      daysToProcess.forEach((scheduleDay, dayIndex) => {
        const dayNumber = scheduleDay.day || (dayIndex + 1);
        activeSlots.forEach((slot) => {
          // Only count if participant has registered for this slot
          if (!isSlotRegistered(participant, slot, dayNumber)) {
            return;
          }
          
          // Count this slot (2 check-ins: start + end)
          totalCheckIns += 2;
          
          // Use getAttendanceStatusWithTime to find attendance records (consistent with UI logic)
          const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', scheduleDay.date, dayNumber);
          if (startStatus.hasCheckedIn && 
              startStatus.attendance && 
              (startStatus.attendance.status === 'approved' || startStatus.attendance.status === 'pending')) {
            completedCheckIns++;
          }
          
          const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', scheduleDay.date, dayNumber);
          if (endStatus.hasCheckedIn && 
              endStatus.attendance && 
              (endStatus.attendance.status === 'approved' || endStatus.attendance.status === 'pending')) {
            completedCheckIns++;
          }
        });
      });
    } else {
      // For single_day activities
      // Only count slots that participant has registered for
      activeSlots.forEach((slot) => {
        // Only count if participant has registered for this slot
        if (!isSlotRegistered(participant, slot)) {
          return;
        }
        
        // Count this slot (2 check-ins: start + end)
        totalCheckIns += 2;
        
        // Use getAttendanceStatusWithTime to find attendance records (consistent with UI logic)
        const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', activity.date);
        if (startStatus.hasCheckedIn && 
            startStatus.attendance && 
            (startStatus.attendance.status === 'approved' || startStatus.attendance.status === 'pending')) {
          completedCheckIns++;
        }
        
        const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', activity.date);
        if (endStatus.hasCheckedIn && 
            endStatus.attendance && 
            (endStatus.attendance.status === 'approved' || endStatus.attendance.status === 'pending')) {
          completedCheckIns++;
        }
      });
    }
    
    const percentage = totalCheckIns > 0 
      ? Math.round((completedCheckIns / totalCheckIns) * 100)
      : 0;
    
    return {
      percentage,
      completed: completedCheckIns,
      total: totalCheckIns
    };
  };

  // Calculate attendance count for a specific slot (start + end check-ins)
  const getSlotAttendanceCount = (participant: Participant, slot: TimeSlot): { count: number; total: number } => {
    if (!participant.attendances || !activity) {
      return { count: 0, total: 2 };
    }

    let count = 0;
    const activityDate = activity.date;

    // Check start check-in
    const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', activityDate);
    if (startStatus.hasCheckedIn && startStatus.attendance?.status === 'approved') {
      count++;
    }

    // Check end check-in
    const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', activityDate);
    if (endStatus.hasCheckedIn && endStatus.attendance?.status === 'approved') {
      count++;
    }

    return { count, total: 2 };
  };

  // Group days by week for multiple_days activities
  const groupDaysByWeek = useMemo(() => {
    if (!activity || activity.type !== 'multiple_days' || !activity.schedule) {
      return [];
    }
    
    const weeks: Array<Array<typeof activity.schedule[0] & { dateObj: Date; dayOfWeek: number }>> = [];
    let currentWeek: Array<typeof activity.schedule[0] & { dateObj: Date; dayOfWeek: number }> = [];
    
    activity.schedule.forEach((day, index) => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();
      
      // Start new week on Monday (day 1) or if it's the first day
      if (dayOfWeek === 1 || currentWeek.length === 0) {
        if (currentWeek.length > 0) {
          weeks.push(currentWeek);
        }
        currentWeek = [{ ...day, dateObj: date, dayOfWeek }];
      } else {
        currentWeek.push({ ...day, dateObj: date, dayOfWeek });
      }
      
      // Push last week
      if (index === (activity.schedule?.length || 0) - 1) {
        weeks.push(currentWeek);
      }
    });
    
    return weeks;
  }, [activity]);

  // Get current week days
  const currentWeekDays = useMemo(() => {
    if (groupDaysByWeek.length === 0) return [];
    return groupDaysByWeek[currentWeekIndex] || [];
  }, [groupDaysByWeek, currentWeekIndex]);

  // Get day name helper
  const getDayName = (date: string): string => {
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
    return days[dayOfWeek] || '';
  };

  // Get week days (Monday to Sunday) for a given week index
  const getWeekDays = useCallback((weekIndex: number) => {
    if (!activity || !activity.schedule || activity.schedule.length === 0) return [];
    
    // Get all dates from schedule
    const allDates = activity.schedule.map((s: any) => new Date(s.date));
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Find the Monday of the first week
    const firstMonday = new Date(minDate);
    const firstDayOfWeek = firstMonday.getDay();
    const daysToMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    firstMonday.setDate(firstMonday.getDate() - daysToMonday);
    
    // Calculate the Monday of the target week
    const targetMonday = new Date(firstMonday);
    targetMonday.setDate(targetMonday.getDate() + (weekIndex * 7));
    
    // Generate all 7 days of the week (Monday to Sunday)
    const weekDays: Array<{ date: Date; scheduleDay: any | null }> = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(targetMonday);
      dayDate.setDate(targetMonday.getDate() + i);
      
      // Find matching schedule day
      const scheduleDay = activity.schedule.find((s: any) => {
        const sDate = new Date(s.date);
        return sDate.toDateString() === dayDate.toDateString();
      });
      
      weekDays.push({ date: dayDate, scheduleDay });
    }
    
    return weekDays;
  }, [activity]);

  // Calculate total weeks needed
  const totalWeeks = useMemo(() => {
    if (!activity || !activity.schedule || activity.schedule.length === 0) return 1;
    
    const allDates = activity.schedule.map((s: any) => new Date(s.date));
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Find the Monday of the first week
    const firstMonday = new Date(minDate);
    const firstDayOfWeek = firstMonday.getDay();
    const daysToMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    firstMonday.setDate(firstMonday.getDate() - daysToMonday);
    
    // Find the Sunday of the last week
    const lastSunday = new Date(maxDate);
    const lastDayOfWeek = lastSunday.getDay();
    const daysToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
    lastSunday.setDate(lastSunday.getDate() + daysToSunday);
    
    // Calculate weeks
    const diffTime = lastSunday.getTime() - firstMonday.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7);
  }, [activity]);

  // Extract timeSlots from schedule for multiple_days activities
  const extractTimeSlotsFromSchedule = (schedule: Array<{ day: number; date: string; activities: string }>): TimeSlot[] => {
    const timeSlotsMap = new Map<string, TimeSlot>();
    
    schedule.forEach((daySchedule) => {
      if (!daySchedule.activities) return;
      
      const lines = daySchedule.activities.split('\n').filter((line: string) => line.trim());
      
      for (const line of lines) {
        // Match: "Buổi Sáng/Chiều/Tối (HH:MM-HH:MM)"
        const slotMatch = line.match(/^Buổi (Sáng|Chiều|Tối)\s*\((\d{2}:\d{2})-(\d{2}:\d{2})\)/);
        if (slotMatch) {
          const slotName = `Buổi ${slotMatch[1]}`;
          const startTime = slotMatch[2];
          const endTime = slotMatch[3];
          
          // Only add if not already in map
          if (!timeSlotsMap.has(slotName)) {
            timeSlotsMap.set(slotName, {
              name: slotName,
              startTime: startTime,
              endTime: endTime,
              isActive: true
            });
          }
        }
      }
    });
    
    return Array.from(timeSlotsMap.values());
  };

  // Handle attendance cell click
  const handleAttendanceClick = (
    participant: Participant,
    slot: TimeSlot,
    checkInType: 'start' | 'end',
    activityDate: string,
    dayNumber?: number
  ) => {
    const statusInfo = getAttendanceStatusWithTime(participant, slot, checkInType, activityDate, dayNumber);
    
    if (statusInfo.attendance) {
      // Show attendance detail modal
      setDetailModal({
        open: true,
        attendance: statusInfo.attendance,
        participant: participant
      });
    }
  };

  // Calculate completed sessions count for a participant
  // Returns: completed (both start and end approved), partial (only start or only end approved), total
  // Only counts slots that the participant has registered for
  const getCompletedSessionsCount = (participant: Participant, selectedDayForCalculation?: number | null): { 
    completed: number; 
    partial: number;
    total: number;
  } => {
    if (!activity || !activity.timeSlots || activity.timeSlots.length === 0) {
      return { completed: 0, partial: 0, total: 0 };
    }

    // For multiple_days, calculate across all days or selected day
    if (activity.type === 'multiple_days' && activity.schedule) {
      const activeSlots = activity.timeSlots.filter(slot => slot.isActive);
      
      // If selectedDayForCalculation is provided, only calculate for that day
      const daysToProcess = selectedDayForCalculation !== null && selectedDayForCalculation !== undefined
        ? activity.schedule.filter(s => s.day === selectedDayForCalculation)
        : activity.schedule;
      
      let totalSessions = 0; // Only count registered slots
      let completedSessions = 0;
      let partialSessions = 0;

      daysToProcess.forEach((scheduleDay) => {
        activeSlots.forEach((slot) => {
          // Only count if participant has registered for this slot
          if (!isSlotRegistered(participant, slot, scheduleDay.day)) {
            return;
          }
          
          // Count this slot (2 check-ins: start + end)
          totalSessions += 2;
          
          // Check by dayNumber or slotDate for better accuracy
          const startRecord = participant.attendances?.find(
            (a) => a.timeSlot === slot.name && 
                  a.checkInType === 'start' && 
                  a.status === 'approved' &&
                  (a.dayNumber === scheduleDay.day || 
                   (a.slotDate && new Date(a.slotDate).toDateString() === new Date(scheduleDay.date).toDateString()) ||
                   new Date(a.checkInTime).toDateString() === new Date(scheduleDay.date).toDateString())
          );
          const endRecord = participant.attendances?.find(
            (a) => a.timeSlot === slot.name && 
                  a.checkInType === 'end' && 
                  a.status === 'approved' &&
                  (a.dayNumber === scheduleDay.day || 
                   (a.slotDate && new Date(a.slotDate).toDateString() === new Date(scheduleDay.date).toDateString()) ||
                   new Date(a.checkInTime).toDateString() === new Date(scheduleDay.date).toDateString())
          );

          if (startRecord && endRecord) {
            completedSessions++;
          } else if (startRecord || endRecord) {
            partialSessions++;
          }
        });
      });

      return { completed: completedSessions, partial: partialSessions, total: totalSessions };
    }

    // For single_day
    // Only count slots that participant has registered for
    const registeredSlots = activity.timeSlots.filter(slot => slot.isActive && isSlotRegistered(participant, slot));
    const totalSlots = registeredSlots.length;
    let completedSlots = 0;
    let partialSlots = 0;

    registeredSlots.forEach((slot) => {
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

  // Calculate attendance statistics by day and time slot
  const getAttendanceStatsByDaySlot = useMemo(() => {
    if (!activity || !participants.length) return {};

    const stats: {
      [key: string]: {
        day: string;
        date: string;
        slot: string;
        total: number;
        checkedIn: number;
        approved: number;
        pending: number;
        rejected: number;
        percentage: number;
      };
    } = {};

    if (activity.type === 'multiple_days' && activity.schedule && activity.timeSlots) {
      const activeSlots = activity.timeSlots.filter(slot => slot.isActive);
      
      activity.schedule.forEach((scheduleDay) => {
        activeSlots.forEach((slot) => {
          const key = `${scheduleDay.date}-${slot.name}`;
          const dayDate = new Date(scheduleDay.date);
          const dayStr = dayDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });
          
          let checkedIn = 0;
          let approved = 0;
          let pending = 0;
          let rejected = 0;

          participants.forEach((participant) => {
            const attendances = participant.attendances?.filter(
              (a) => a.timeSlot === slot.name &&
                    new Date(a.checkInTime).toLocaleDateString('vi-VN') === dayDate.toLocaleDateString('vi-VN')
            ) || [];

            if (attendances.length > 0) {
              checkedIn++;
              attendances.forEach((att) => {
                if (att.status === 'approved') approved++;
                else if (att.status === 'pending') pending++;
                else if (att.status === 'rejected') rejected++;
              });
            }
          });

          const total = participants.length;
          const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

          stats[key] = {
            day: dayStr,
            date: scheduleDay.date,
            slot: slot.name,
            total,
            checkedIn,
            approved,
            pending,
            rejected,
            percentage
          };
        });
      });
    } else if (activity.type === 'single_day' && activity.timeSlots) {
      const activeSlots = activity.timeSlots.filter(slot => slot.isActive);
      const activityDate = activity.date ? new Date(activity.date) : new Date();
      
      activeSlots.forEach((slot) => {
        const key = `${activity.date}-${slot.name}`;
        const dayStr = activityDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });
        
        let checkedIn = 0;
        let approved = 0;
        let pending = 0;
        let rejected = 0;

        participants.forEach((participant) => {
          const attendances = participant.attendances?.filter(
            (a) => a.timeSlot === slot.name
          ) || [];

          if (attendances.length > 0) {
            checkedIn++;
            attendances.forEach((att) => {
              if (att.status === 'approved') approved++;
              else if (att.status === 'pending') pending++;
              else if (att.status === 'rejected') rejected++;
            });
          }
        });

        const total = participants.length;
        const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

        stats[key] = {
          day: dayStr,
          date: activity.date,
          slot: slot.name,
          total,
          checkedIn,
          approved,
          pending,
          rejected,
          percentage
        };
      });
    }

    return stats;
  }, [activity, participants]);

  // Calculate overall attendance percentage based on check-ins
  const calculateAttendancePercentage = useMemo(() => {
    if (!activity || !participants.length) return 0;

    let totalCheckIns = 0;
    let approvedCheckIns = 0;

    if (activity.type === 'multiple_days' && activity.schedule && activity.timeSlots) {
      const activeSlots = activity.timeSlots.filter(slot => slot.isActive);
      const totalExpected = activity.schedule.length * activeSlots.length * 2 * participants.length; // days * slots * 2 (start+end) * participants
      
      participants.forEach((participant) => {
        if (participant.attendances) {
          participant.attendances.forEach((att) => {
            totalCheckIns++;
            if (att.status === 'approved') {
              approvedCheckIns++;
            }
          });
        }
      });

      return totalExpected > 0 ? Math.round((approvedCheckIns / totalExpected) * 100) : 0;
    } else if (activity.type === 'single_day' && activity.timeSlots) {
      const activeSlots = activity.timeSlots.filter(slot => slot.isActive);
      const totalExpected = activeSlots.length * 2 * participants.length; // slots * 2 (start+end) * participants
      
      participants.forEach((participant) => {
        if (participant.attendances) {
          participant.attendances.forEach((att) => {
            totalCheckIns++;
            if (att.status === 'approved') {
              approvedCheckIns++;
            }
          });
        }
      });

      return totalExpected > 0 ? Math.round((approvedCheckIns / totalExpected) * 100) : 0;
    }

    return 0;
  }, [activity, participants]);

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
  // Check if an attendance record was manually checked in by officer
  const isManualCheckInRecord = (attendance: AttendanceRecord | null | undefined): boolean => {
    if (!attendance) return false;
    // Check if verificationNote indicates manual check-in
    if (attendance.verificationNote && 
        (attendance.verificationNote.includes('Điểm danh thủ công') || 
         attendance.verificationNote.includes('manual') ||
         attendance.verificationNote.includes('officer'))) {
      return true;
    }
    // Check if verifiedBy exists and attendance is approved/pending (officer manually checked in)
    if (attendance.verifiedBy && (attendance.status === 'approved' || attendance.status === 'pending')) {
      // If has invalid location or no photo but still approved/pending, it's manual
      const locationValidation = validateLocation(attendance);
      if (!locationValidation.valid || !attendance.photoUrl) {
        return true;
      }
    }
    return false;
  };

  // Check if participant was manually checked in by officer
  const isManuallyCheckedInByOfficer = (participant: Participant): boolean => {
    if (!participant.attendances || participant.attendances.length === 0) {
      return false;
    }

    // Check if any attendance record was manually checked in by officer
    // Criteria for manual check-in by officer:
    // 1. Has invalid location but still approved/pending (students cannot check-in with invalid location)
    // 2. Has no photoUrl but still approved/pending (students must provide photo)
    // Note: If attendance has photoUrl AND valid location, it's student self check-in (not manual)
    for (const attendance of participant.attendances) {
      if (attendance.status === 'approved' || attendance.status === 'pending') {
        // Skip if this is auto-approved (student self check-in on time)
        if (attendance.verificationNote) {
          const note = attendance.verificationNote.toLowerCase();
          if (note.includes('tự động') || note.includes('auto')) {
            continue; // This is auto-approved, skip it
          }
        }
        
        // Check if location is invalid (students cannot check-in with invalid location)
        const locationValidation = validateLocation(attendance);
        if (!locationValidation.valid) {
          return true; // Invalid location but approved/pending = manual check-in by officer
        }
        
        // Check if no photo but still approved/pending (students must provide photo)
        // If has photoUrl AND valid location, it's student self check-in (even if late/pending)
        if (!attendance.photoUrl) {
          return true; // No photo but approved/pending = manual check-in by officer
        }
        
        // If we reach here, it means: valid location AND has photoUrl
        // This is student self check-in (whether on-time or late), NOT manual check-in
        // So we continue to next attendance
      }
    }

    return false;
  };

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

    // Check if there are any pending attendances in late window
    // If yes, participant should be classified as 'late_but_valid' even if some are perfect
    let hasPendingLate = false;
    if (pendingAttendances.length > 0) {
      for (const attendance of pendingAttendances) {
        const locationValidation = validateLocation(attendance);
        const timeValidation = validateTime(attendance);
        
        // Check if in late window (15-30 minutes after) - this is valid but needs approval
        if (locationValidation.valid && timeValidation.valid && timeValidation.isInLateWindow) {
          hasPendingLate = true;
          break;
        }
      }
    }

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
      
      // If has pending late attendances, classify as late_but_valid (even if approved are perfect)
      if (hasPendingLate) {
        return 'late_but_valid';
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
      const isManualCheckIn = isManuallyCheckedInByOfficer(p);
      const matchesValidationStatus = filterValidationStatus === 'all' ||
        (filterValidationStatus === 'perfect' && attendanceType === 'perfect') ||
        (filterValidationStatus === 'late_but_valid' && attendanceType === 'late_but_valid') ||
        (filterValidationStatus === 'manual_check_in' && isManualCheckIn);
      
      // For multiple_days activities: filter out participants who haven't registered for any slot on the selected day
      let matchesSelectedDay = true;
      if (activity && activity.type === 'multiple_days' && selectedDay !== null) {
        matchesSelectedDay = hasRegisteredForDay(p, selectedDay);
      }
      
      return matchesSearch && matchesStatus && matchesParticipationStatus && matchesAttendanceStatus && matchesValidationStatus && matchesSelectedDay;
    });
  }, [participants, searchQuery, filterStatus, filterParticipationStatus, filterAttendanceStatus, filterValidationStatus, activity, selectedDay]);

  // Calculate statistics based on participation percentage with configurable thresholds
  const calculatedStats = useMemo(() => {
    let full = 0;
    let incomplete = 0;
    let insufficient = 0;
    let manualCheckIn = 0;
    
    const { full: fullRange, incomplete: incompleteRange, insufficient: insufficientRange } = participationThresholds;
    
    participants.forEach(p => {
      // Calculate participation percentage for this participant
      const attendanceData = calculateOverallAttendancePercentage(p);
      const percentage = attendanceData.percentage;
      
      // Classify based on configurable thresholds (check if percentage is within range)
      // Priority: full > incomplete > insufficient (check from highest to lowest)
      if (percentage >= fullRange.min && percentage <= fullRange.max) {
        full++;
      } else if (percentage >= incompleteRange.min && percentage <= incompleteRange.max) {
        incomplete++;
      } else if (percentage >= insufficientRange.min && percentage <= insufficientRange.max) {
        insufficient++;
      }
      // Note: If percentage doesn't fall into any range, it's not counted in any category
      // This is intentional - allows flexibility in threshold configuration
      
      // Count participants who were manually checked in by officer
      if (isManuallyCheckedInByOfficer(p)) {
        manualCheckIn++;
      }
    });
    
    return {
      perfect: full, // Keep for backward compatibility
      lateButValid: incomplete, // Keep for backward compatibility
      invalid: manualCheckIn, // Keep 'invalid' key for backward compatibility with UI
      full,
      incomplete,
      insufficient
    };
  }, [participants, activity, participationThresholds]);
  
  // Save thresholds to localStorage when changed
  useEffect(() => {
    if (typeof window !== 'undefined' && activityId) {
      localStorage.setItem(`participationThresholds_${activityId}`, JSON.stringify(participationThresholds));
    }
  }, [participationThresholds, activityId]);
  
  const handleThresholdChange = (
    type: 'full' | 'incomplete' | 'insufficient', 
    field: 'min' | 'max', 
    value: number
  ) => {
    const numValue = Math.max(0, Math.min(100, value)); // Clamp between 0-100
    setParticipationThresholds((prev: { 
      full: { min: number; max: number }; 
      incomplete: { min: number; max: number }; 
      insufficient: { min: number; max: number } 
    }) => {
      const newThresholds = {
        ...prev,
        [type]: {
          ...prev[type],
          [field]: numValue
        }
      };
      
      // Step 1: Ensure min <= max for each range
      if (newThresholds[type].min > newThresholds[type].max) {
        if (field === 'min') {
          newThresholds[type].max = newThresholds[type].min;
        } else {
          newThresholds[type].min = newThresholds[type].max;
        }
      }
      
      // Step 2: Ensure ranges are ordered correctly: insufficient < incomplete < full
      // Order: insufficient.max < incomplete.min <= incomplete.max < full.min <= full.max
      
      if (type === 'full') {
        // Full range should be highest
        if (field === 'min') {
          // If full.min is too low, adjust incomplete.max
          if (newThresholds.full.min <= newThresholds.incomplete.max) {
            newThresholds.incomplete.max = Math.max(0, newThresholds.full.min - 1);
            // Ensure incomplete.min <= incomplete.max after adjustment
            if (newThresholds.incomplete.min > newThresholds.incomplete.max) {
              newThresholds.incomplete.min = newThresholds.incomplete.max;
            }
          }
        } else if (field === 'max') {
          // Ensure full.max >= full.min
          if (newThresholds.full.max < newThresholds.full.min) {
            newThresholds.full.max = newThresholds.full.min;
          }
        }
      } else if (type === 'incomplete') {
        // Incomplete range is in the middle
        if (field === 'min') {
          // If incomplete.min is too low, adjust insufficient.max
          if (newThresholds.incomplete.min <= newThresholds.insufficient.max) {
            newThresholds.insufficient.max = Math.max(0, newThresholds.incomplete.min - 1);
            // Ensure insufficient.min <= insufficient.max after adjustment
            if (newThresholds.insufficient.min > newThresholds.insufficient.max) {
              newThresholds.insufficient.min = newThresholds.insufficient.max;
            }
          }
          // If incomplete.min is too high, adjust full.min
          if (newThresholds.incomplete.min >= newThresholds.full.min) {
            newThresholds.full.min = Math.min(100, newThresholds.incomplete.min + 1);
            // Ensure full.min <= full.max after adjustment
            if (newThresholds.full.min > newThresholds.full.max) {
              newThresholds.full.max = newThresholds.full.min;
            }
          }
        } else if (field === 'max') {
          // If incomplete.max is too high, adjust full.min
          if (newThresholds.incomplete.max >= newThresholds.full.min) {
            newThresholds.full.min = Math.min(100, newThresholds.incomplete.max + 1);
            // Ensure full.min <= full.max after adjustment
            if (newThresholds.full.min > newThresholds.full.max) {
              newThresholds.full.max = newThresholds.full.min;
            }
          }
          // Ensure incomplete.min <= incomplete.max
          if (newThresholds.incomplete.min > newThresholds.incomplete.max) {
            newThresholds.incomplete.min = newThresholds.incomplete.max;
          }
        }
      } else if (type === 'insufficient') {
        // Insufficient range should be lowest
        if (field === 'min') {
          // Ensure insufficient.min >= 0
          if (newThresholds.insufficient.min < 0) {
          newThresholds.insufficient.min = 0;
        }
          // Ensure insufficient.min <= insufficient.max
          if (newThresholds.insufficient.min > newThresholds.insufficient.max) {
            newThresholds.insufficient.max = newThresholds.insufficient.min;
          }
        } else if (field === 'max') {
          // If insufficient.max is too high, adjust incomplete.min
          if (newThresholds.insufficient.max >= newThresholds.incomplete.min) {
            newThresholds.incomplete.min = Math.min(100, newThresholds.insufficient.max + 1);
            // Ensure incomplete.min <= incomplete.max after adjustment
            if (newThresholds.incomplete.min > newThresholds.incomplete.max) {
              newThresholds.incomplete.max = newThresholds.incomplete.min;
            }
            // If incomplete.max is now too high, adjust full.min
            if (newThresholds.incomplete.max >= newThresholds.full.min) {
              newThresholds.full.min = Math.min(100, newThresholds.incomplete.max + 1);
              if (newThresholds.full.min > newThresholds.full.max) {
                newThresholds.full.max = newThresholds.full.min;
              }
            }
          }
          // Ensure insufficient.min <= insufficient.max
          if (newThresholds.insufficient.min > newThresholds.insufficient.max) {
            newThresholds.insufficient.min = newThresholds.insufficient.max;
          }
        }
      }
      
      // Step 3: Final validation - ensure all ranges are valid and ordered
      // Clamp all values to 0-100
      newThresholds.insufficient.min = Math.max(0, Math.min(100, newThresholds.insufficient.min));
      newThresholds.insufficient.max = Math.max(0, Math.min(100, newThresholds.insufficient.max));
      newThresholds.incomplete.min = Math.max(0, Math.min(100, newThresholds.incomplete.min));
      newThresholds.incomplete.max = Math.max(0, Math.min(100, newThresholds.incomplete.max));
      newThresholds.full.min = Math.max(0, Math.min(100, newThresholds.full.min));
      newThresholds.full.max = Math.max(0, Math.min(100, newThresholds.full.max));
      
      // Final order check: ensure insufficient.max < incomplete.min <= incomplete.max < full.min <= full.max
      if (newThresholds.insufficient.max >= newThresholds.incomplete.min) {
        newThresholds.incomplete.min = Math.min(100, newThresholds.insufficient.max + 1);
      }
      if (newThresholds.incomplete.max >= newThresholds.full.min) {
        newThresholds.full.min = Math.min(100, newThresholds.incomplete.max + 1);
      }
      
      return newThresholds;
    });
  };

  const uniqueRoles = useMemo(() => {
    const roles = new Set(participants.map(p => p.role || 'Người Tham Gia'));
    return Array.from(roles).sort();
  }, [participants]);

  const roleConfig: { [key: string]: { icon: LucideIcon; color: string; bg: string; gradient: string } } = {
    'Trưởng Nhóm': {
      icon: Crown,
      color: isDarkMode ? 'text-red-300' : 'text-red-700',
      bg: isDarkMode ? 'bg-red-500/10' : 'bg-red-50',
      gradient: 'from-red-500 to-red-600'
    },
    'Phó Trưởng Nhóm': {
      icon: Briefcase,
      color: isDarkMode ? 'text-orange-300' : 'text-orange-700',
      bg: isDarkMode ? 'bg-orange-500/10' : 'bg-orange-50',
      gradient: 'from-orange-500 to-orange-600'
    },
    'Thành Viên Ban Tổ Chức': {
      icon: ClipboardList,
      color: isDarkMode ? 'text-purple-300' : 'text-purple-700',
      bg: isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50',
      gradient: 'from-purple-500 to-purple-600'
    },
    'Người Giám Sát': {
      icon: Eye,
      color: isDarkMode ? 'text-blue-300' : 'text-blue-700',
      bg: isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50',
      gradient: 'from-blue-500 to-blue-600'
    },
    'Người Tham Gia': {
      icon: Users,
      color: isDarkMode ? 'text-gray-300' : 'text-gray-700',
      bg: isDarkMode ? 'bg-gray-500/10' : 'bg-gray-50',
      gradient: 'from-gray-500 to-gray-600'
    }
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredRole="CLUB_MEMBER">
        <div className={`min-h-screen flex flex-col items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <Loader 
            size={48} 
            className={`animate-spin mb-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
            strokeWidth={2.5}
          />
          <p className={`text-base font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            Đang tải dữ liệu
          </p>
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
            <div className={`border-b ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-5">
                {/* Top Bar - Actions */}
                <div className="flex items-center justify-between mb-5">
                  <button
                    onClick={() => router.back()}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDarkMode
                        ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Quay lại</span>
                  </button>

                  <button
                    onClick={() => router.push(`/officer/activities/${activityId}/participants`)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDarkMode
                        ? 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <Users size={16} strokeWidth={2} />
                    <span>Người tham gia</span>
                  </button>
                </div>

                {/* Title - Centered */}
                <div className="text-center mb-6">
                  <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Quản lý điểm danh
                  </h1>
                  <h2 className={`text-base font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {activity.name}
                  </h2>
                </div>

                {/* Stats Row - Centered */}
                <div className="flex justify-center mb-4">
                  <div className="grid grid-cols-4 gap-3 max-w-2xl w-full">
                    <div className={`text-center p-3 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-gray-800/50 border-blue-700/50' 
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className={`text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        Tổng số
                  </div>
                      <div className={`text-2xl font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        {stats.total}
                  </div>
                  </div>
                    
                    <div className={`text-center p-3 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-gray-800/50 border-green-700/50' 
                        : 'bg-green-50 border-green-200'
                    }`}>
                      <div className={`text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                        Đã điểm danh
                      </div>
                      <div className={`text-2xl font-bold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                        {stats.checkedIn}
                      </div>
                    </div>
                    
                    <div className={`text-center p-3 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-gray-800/50 border-orange-700/50' 
                        : 'bg-orange-50 border-orange-200'
                    }`}>
                      <div className={`text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                        Chưa điểm danh
                      </div>
                      <div className={`text-2xl font-bold ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                        {stats.notCheckedIn}
                      </div>
                    </div>
                    
                  <div className={`text-center p-3 rounded-lg border ${
                    calculateAttendancePercentage >= 80
                        ? isDarkMode 
                          ? 'bg-gray-800/50 border-green-700/50' 
                          : 'bg-green-50 border-green-200'
                      : calculateAttendancePercentage >= 50
                        ? isDarkMode 
                          ? 'bg-gray-800/50 border-yellow-700/50' 
                          : 'bg-yellow-50 border-yellow-200'
                        : isDarkMode 
                          ? 'bg-gray-800/50 border-red-700/50' 
                          : 'bg-red-50 border-red-200'
                    }`}>
                      <div className={`text-xs font-semibold mb-1.5 ${
                      calculateAttendancePercentage >= 80
                          ? isDarkMode ? 'text-green-400' : 'text-green-600'
                        : calculateAttendancePercentage >= 50
                          ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                          : isDarkMode ? 'text-red-400' : 'text-red-600'
                      }`}>
                        Tỷ lệ
                      </div>
                    <div className={`text-2xl font-bold ${
                      calculateAttendancePercentage >= 80
                          ? isDarkMode ? 'text-green-300' : 'text-green-700'
                        : calculateAttendancePercentage >= 50
                          ? isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
                          : isDarkMode ? 'text-red-300' : 'text-red-700'
                      }`}>
                        {calculateAttendancePercentage}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Participation Stats - Centered */}
                <div className="flex justify-center mb-4">
                  <div className={`flex flex-wrap items-center justify-center gap-3 px-4 py-2.5 rounded-lg border max-w-4xl ${
                    isDarkMode 
                      ? 'bg-gray-800/50 border-gray-700' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} strokeWidth={2} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Đầy đủ ({participationThresholds.full.min}-{participationThresholds.full.max}%):
                      </span>
                      <span className={`text-sm font-bold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                        {calculatedStats.full}
                      </span>
                      </div>
                    <div className={`w-px h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} strokeWidth={2} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} />
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Không đầy đủ ({participationThresholds.incomplete.min}-{participationThresholds.incomplete.max}%):
                      </span>
                      <span className={`text-sm font-bold ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                        {calculatedStats.incomplete}
                      </span>
                      </div>
                    <div className={`w-px h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={13} strokeWidth={2} className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} />
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Thiếu ({participationThresholds.insufficient.min}-{participationThresholds.insufficient.max}%):
                      </span>
                      <span className={`text-sm font-bold ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                        {calculatedStats.insufficient}
                      </span>
                      </div>
                    <div className={`w-px h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                    <div className="flex items-center gap-1.5">
                      <XCircle size={13} strokeWidth={2} className={isDarkMode ? 'text-red-400' : 'text-red-600'} />
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Thủ công:
                      </span>
                      <span className={`text-sm font-bold ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                        {calculatedStats.invalid}
                      </span>
                      </div>
                    <button
                      onClick={() => setShowThresholdModal(true)}
                      className={`ml-1 p-1.5 rounded-lg transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                      }`}
                      title="Chỉnh sửa ngưỡng phần trăm"
                    >
                      <Settings size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {/* Date & Location - Centered */}
                <div className="flex justify-center">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {activity.type === 'multiple_days' && activity.schedule ? (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${
                        isDarkMode 
                          ? 'bg-gray-800 text-gray-200 border-gray-700' 
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        <Calendar size={16} strokeWidth={2} />
                        <span>
                          {(() => {
                            try {
                              const firstDate = new Date(activity.schedule![0].date);
                              const lastDate = new Date(activity.schedule![activity.schedule!.length - 1].date);
                              if (isNaN(firstDate.getTime()) || isNaN(lastDate.getTime())) return 'Chưa có ngày';
                              if (activity.schedule!.length === 1) {
                                return firstDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                              }
                              return `${firstDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${lastDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} (${activity.schedule!.length} ngày)`;
                            } catch {
                              return 'Chưa có ngày';
                            }
                          })()}
                        </span>
                      </div>
                    ) : (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${
                        isDarkMode 
                          ? 'bg-gray-800 text-gray-200 border-gray-700' 
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        <Calendar size={16} strokeWidth={2} />
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
                    )}
                  {(() => {
                    // Get location for the selected day (for multiple_days) or use activity.location
                    let displayLocation = activity.location || '';
                    
                    if (activity.type === 'multiple_days' && activity.schedule && selectedDay !== null) {
                      const scheduleDay = activity.schedule.find((s: any) => s.day === selectedDay);
                      if (scheduleDay && scheduleDay.activities) {
                        // Use the existing extractLocationFromScheduleActivities function
                        // Try to extract from first slot (Buổi Sáng) as representative location for the day
                        const extractedLocation = extractLocationFromScheduleActivities(scheduleDay.activities, 'Buổi Sáng');
                        
                        if (extractedLocation && extractedLocation.address) {
                          displayLocation = extractedLocation.address;
                        } else {
                          // Fallback: try to find any location in the text (for daily location)
                          const locationPattern = new RegExp('Địa điểm map:\\s*([^(]+?)\\s*\\(([\\d.]+),\\s*([\\d.]+)\\)');
                          const fallbackMatch = scheduleDay.activities.match(locationPattern);
                          if (fallbackMatch) {
                            const address = fallbackMatch[1].trim();
                            // Only use if it's a valid address (not just coordinates)
                            const coordPattern = new RegExp('^[\\d.\\s,]+$');
                            const isOnlyCoordinates = coordPattern.test(address);
                            if (address && !isOnlyCoordinates && address.length > 3) {
                              displayLocation = address;
                            }
                          }
                          
                          // If still no valid address, try other patterns
                          if (!displayLocation || displayLocation === activity.location) {
                            // Try pattern: "Địa điểm: [address]" or any text before coordinates
                            const lines = scheduleDay.activities.split('\n');
                            for (const line of lines) {
                              if (line.includes('Địa điểm')) {
                                // Pattern: "Địa điểm map: [address] (lat, lng)"
                                const mapPattern = new RegExp('Địa điểm map:\\s*([^(]+?)\\s*\\(');
                                const match1 = line.match(mapPattern);
                                if (match1) {
                                  const addr = match1[1].trim();
                                  const coordPattern1 = new RegExp('^[\\d.\\s,]+$');
                                  const isOnlyCoords = coordPattern1.test(addr);
                                  if (addr && !isOnlyCoords && addr.length > 3) {
                                    displayLocation = addr;
                                    break;
                                  }
                                }
                                
                                // Pattern: "Địa điểm: [address]"
                                const addressPattern = new RegExp('Địa điểm[^:]*:\\s*([^\\n(]+?)(?:\\s*\\(|$)');
                                const match2 = line.match(addressPattern);
                                if (match2) {
                                  const addr = match2[1].trim();
                                  const coordPattern2 = new RegExp('^[\\d.\\s,]+$');
                                  const isOnlyCoords2 = coordPattern2.test(addr);
                                  if (addr && !isOnlyCoords2 && addr.length > 3) {
                                    displayLocation = addr;
                                    break;
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                    
                    // Final check: if displayLocation is just coordinates or empty, use activity.location
                    const coordCheckPattern = new RegExp('^[\\d.\\s,]+$');
                    const isOnlyCoords = displayLocation ? coordCheckPattern.test(displayLocation.trim()) : true;
                    if (!displayLocation || isOnlyCoords) {
                      displayLocation = activity.location || '';
                    }
                    
                    // Only show if we have a valid location
                    return displayLocation ? (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${
                        isDarkMode 
                          ? 'bg-gray-800 text-gray-200 border-gray-700' 
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        <MapPin size={16} strokeWidth={2} />
                        <span className="max-w-xs truncate">
                          {displayLocation.length > 45 ? displayLocation.substring(0, 45) + '...' : displayLocation}
                        </span>
                      </div>
                    ) : null;
                  })()}
                  </div>
                </div>
              </div>
                      </div>
                    )}

          {/* Week Selector for Multiple Days Activity */}
          {activity && activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0 && (
            <div className={`w-full border-b ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-3">
              {/* Week Navigation Header */}
              <div className={`flex items-center justify-center mb-2 px-2 py-1.5 rounded-lg max-w-md mx-auto ${
                isDarkMode ? 'bg-gradient-to-r from-purple-900/30 to-gray-800/50' : 'bg-gradient-to-r from-purple-50 to-gray-50'
              }`}>
                <button
                  onClick={() => setCurrentWeekIndex(Math.max(0, currentWeekIndex - 1))}
                  disabled={currentWeekIndex === 0}
                  className={`p-1 rounded-lg transition-all ${
                    currentWeekIndex === 0
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-white/20'
                  } ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>
                
                <div className="flex items-center gap-1.5 px-3">
                  <Calendar size={16} strokeWidth={2} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                  <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    Tuần {currentWeekIndex + 1}
                  </span>
                  </div>
                
                <button
                  onClick={() => setCurrentWeekIndex(Math.min(totalWeeks - 1, currentWeekIndex + 1))}
                  disabled={currentWeekIndex >= totalWeeks - 1}
                  className={`p-1 rounded-lg transition-all ${
                    currentWeekIndex >= totalWeeks - 1
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-white/20'
                  } ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
                </div>

              {/* Week Days Row */}
              <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-2">
                {getWeekDays(currentWeekIndex).map((dayInfo, index) => {
                  const dayDate = dayInfo.date;
                  const dayDateStr = dayDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                  const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
                  const shortDayName = dayNames[index] || getDayName(dayDate.toISOString());
                  
                  const isSelected = selectedDay === dayInfo.scheduleDay?.day;
                  const hasActivity = dayInfo.scheduleDay !== null && dayInfo.scheduleDay !== undefined;
                  
                  // Calculate attendance stats for this day
                  let completedSessions = 0;
                  let totalSessions = 0;
                  let attendancePercentage = 0;
                  let totalCheckIns = 0;
                  
                  if (hasActivity && dayInfo.scheduleDay && activity.timeSlots) {
                    const activeSlots = activity.timeSlots.filter(slot => slot.isActive);
                    // Total sessions = number of slots * 2 (start + end for each slot)
                    totalSessions = activeSlots.length * 2;
                    
                    // Count completed check-ins for this day
                    const dayCheckIns = filteredParticipants.reduce((count, p) => {
                      const attendances = p.attendances?.filter((a: AttendanceRecord) => {
                        const aDate = new Date(a.checkInTime);
                        // For multiple_days, also check dayNumber or slotDate
                        let dateMatches = aDate.toDateString() === dayDate.toDateString();
                        if (activity.type === 'multiple_days' && dayInfo.scheduleDay) {
                          if (a.dayNumber && a.dayNumber === dayInfo.scheduleDay.day) {
                            dateMatches = true;
                          } else if (a.slotDate) {
                            const slotDateObj = new Date(a.slotDate);
                            dateMatches = slotDateObj.toDateString() === dayDate.toDateString();
                          }
                        }
                        return dateMatches && a.status === 'approved';
                      }) || [];
                      return count + attendances.length;
                    }, 0);
                    
                    totalCheckIns = dayCheckIns;
                    
                    // Count completed sessions (both start and end checked in)
                    activeSlots.forEach((slot: TimeSlot) => {
                      let hasStart = false;
                      let hasEnd = false;
                      
                      filteredParticipants.forEach((p) => {
                        const dayAttendances = p.attendances?.filter((a: AttendanceRecord) => {
                          const aDate = new Date(a.checkInTime);
                          // For multiple_days, also check dayNumber or slotDate
                          let dateMatches = aDate.toDateString() === dayDate.toDateString();
                          if (activity.type === 'multiple_days' && dayInfo.scheduleDay) {
                            if (a.dayNumber && a.dayNumber === dayInfo.scheduleDay.day) {
                              dateMatches = true;
                            } else if (a.slotDate) {
                              const slotDateObj = new Date(a.slotDate);
                              dateMatches = slotDateObj.toDateString() === dayDate.toDateString();
                            }
                          }
                          return dateMatches && a.status === 'approved';
                        }) || [];
                        
                        dayAttendances.forEach((a: AttendanceRecord) => {
                          // Check if timeSlot matches (handle "Ngày X - Buổi Y" format)
                          const slotName = slot.name;
                          const aTimeSlot = a.timeSlot || '';
                          const matchesSlot = aTimeSlot === slotName || 
                                            aTimeSlot.includes(`Ngày ${dayInfo.scheduleDay.day} - ${slotName}`) ||
                                            aTimeSlot.endsWith(` - ${slotName}`);
                          
                          if (matchesSlot) {
                            if (a.checkInType === 'start') hasStart = true;
                            if (a.checkInType === 'end') hasEnd = true;
                          }
                        });
                      });
                      
                      if (hasStart && hasEnd) completedSessions++;
                    });
                    
                    // Calculate percentage based on total check-ins vs total possible check-ins
                    // totalSessions = number of slots * 2 (start + end)
                    if (totalSessions > 0) {
                      attendancePercentage = Math.round((totalCheckIns / totalSessions) * 100);
                    }
                  }
                  
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        if (hasActivity && dayInfo.scheduleDay) {
                          setSelectedDay(dayInfo.scheduleDay.day);
                        }
                      }}
                      disabled={!hasActivity}
                      className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all min-w-[75px] flex-shrink-0 ${
                        !hasActivity
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer hover:scale-105'
                      } ${
                        isSelected
                          ? isDarkMode
                            ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg border-2 border-blue-300'
                            : 'bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg border-2 border-blue-500'
                          : hasActivity
                            ? isDarkMode
                              ? 'bg-gray-800 text-gray-200 hover:bg-gray-700 border-2 border-gray-400'
                              : 'bg-white text-gray-800 hover:bg-gray-50 border-2 border-gray-500'
                            : isDarkMode
                              ? 'bg-gray-900/50 text-gray-500 border-2 border-gray-700'
                              : 'bg-gray-200 text-gray-500 border-2 border-gray-400'
                      }`}
                    >
                      <span className={`text-[10px] font-semibold ${
                        isSelected ? 'text-white' : hasActivity ? '' : 'opacity-60'
                      }`}>
                        {shortDayName}
                      </span>
                      
                      {hasActivity && dayInfo.scheduleDay ? (
                        <>
                          <div className="flex items-center gap-1">
                            {totalCheckIns > 0 && (
                              <span className={`px-1 py-0.5 rounded-full text-[8px] font-bold ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : completedSessions === (totalSessions / 2)
                                    ? 'bg-green-500 text-white'
                                    : isDarkMode
                                      ? 'bg-blue-500/30 text-blue-300'
                                      : 'bg-blue-100 text-blue-700'
                              }`}>
                                {totalCheckIns}/{totalSessions}
                              </span>
                            )}
                            {attendancePercentage >= 0 && (
                              <span className={`px-1 py-0.5 rounded-full text-[8px] font-bold ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : attendancePercentage === 100
                                    ? 'bg-green-500 text-white'
                                    : attendancePercentage >= 80
                                      ? 'bg-blue-500 text-white'
                                      : attendancePercentage >= 60
                                        ? 'bg-orange-500 text-white'
                                        : attendancePercentage > 0
                                          ? 'bg-red-500 text-white'
                                          : 'bg-gray-400 text-white'
                              }`}>
                                {attendancePercentage}%
                              </span>
                            )}
                          </div>
                          <span className={`text-[9px] font-medium ${
                            isSelected ? 'text-white/90' : 'opacity-70'
                          }`}>
                            {totalCheckIns}/{totalSessions * 2}
                          </span>
                        </>
                      ) : (
                        <span className={`text-[8px] italic ${
                          isSelected ? 'text-white/70' : 'opacity-50'
                        }`}>
                          Ngoài phạm vi
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              </div>
            </div>
          )}

          <div className="w-full py-4">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex flex-col lg:flex-row gap-4">
              {/* Left Sidebar - Filters */}
              <aside className="lg:w-64 flex-shrink-0">
                <div className="sticky top-6 space-y-4">
                  {/* View Mode Toggle */}
                  <div className={`rounded-xl p-4 border shadow-sm ${
                    isDarkMode 
                      ? 'bg-gray-800/80 border-gray-700 backdrop-blur-sm' 
                      : 'bg-white border-gray-200'
                  }`}>
                    <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      Chế độ xem
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setViewMode('table');
                          setExpandedRows(new Set()); // Reset expanded rows when switching to table view
                        }}
                        className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                          viewMode === 'table'
                            ? isDarkMode ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-md'
                            : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <BarChart3 size={12} strokeWidth={2} className="inline mr-1" />
                        <span>Bảng</span>
                      </button>
                      <button
                        onClick={() => {
                          setViewMode('cards');
                          setExpandedRows(new Set()); // Reset expanded rows when switching to cards view
                        }}
                        className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                          viewMode === 'cards'
                            ? isDarkMode ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-md'
                            : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <ClipboardList size={12} strokeWidth={2} />
                        <span>Thẻ</span>
                      </button>
                    </div>
                  </div>

                  {/* Search & Filter */}
                  <div className={`rounded-xl p-4 border shadow-sm ${
                    isDarkMode 
                      ? 'bg-gray-800/80 border-gray-700 backdrop-blur-sm' 
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        <Search size={16} strokeWidth={2} />
                        <Filter size={16} strokeWidth={2} />
                        <span>Tìm kiếm & Lọc</span>
                      </h3>
                      {(searchQuery || filterStatus !== 'all' || filterParticipationStatus !== 'all' || filterAttendanceStatus !== 'all' || filterValidationStatus !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setFilterStatus('all');
                            setFilterParticipationStatus('all');
                            setFilterAttendanceStatus('all');
                            setFilterValidationStatus('all');
                          }}
                          className={`text-xs px-2 py-1 rounded-lg transition-all ${
                            isDarkMode 
                              ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                          title="Xóa tất cả bộ lọc"
                        >
                          <RotateCcw size={14} strokeWidth={2} className="inline mr-1" />
                          Xóa bộ lọc
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
                                ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                            } focus:outline-none`}
                          />
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery('')}
                              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-600 transition-colors ${
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
                        <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Trạng thái điểm danh
                        </label>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'checkedIn' | 'notCheckedIn')}
                          className={`w-full px-3 py-2 rounded-lg border text-sm transition-all ${
                            isDarkMode 
                              ? 'bg-gray-700/50 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                              : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          } focus:outline-none`}
                        >
                          <option value="all">Tất cả</option>
                          <option value="checkedIn">Đã điểm danh</option>
                          <option value="notCheckedIn">Chưa điểm danh</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Tham gia buổi
                        </label>
                        <select
                          value={filterParticipationStatus}
                          onChange={(e) => setFilterParticipationStatus(e.target.value as 'all' | 'fullyAttended' | 'incomplete' | 'notAttended')}
                          className={`w-full px-3 py-2 rounded-lg border text-sm transition-all ${
                            isDarkMode 
                              ? 'bg-gray-700/50 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                              : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          } focus:outline-none`}
                        >
                          <option value="all">Tất cả</option>
                          <option value="fullyAttended">Tham gia đầy đủ</option>
                          <option value="incomplete">Tham gia không đầy đủ</option>
                          <option value="notAttended">Chưa tham gia</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Trạng thái xác nhận
                        </label>
                        <select
                          value={filterAttendanceStatus}
                          onChange={(e) => setFilterAttendanceStatus(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
                          className={`w-full px-3 py-2 rounded-lg border text-sm transition-all ${
                            isDarkMode 
                              ? 'bg-gray-700/50 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                              : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          } focus:outline-none`}
                        >
                          <option value="all">Tất cả</option>
                          <option value="pending">Chờ xác nhận</option>
                          <option value="approved">Đã xác nhận</option>
                          <option value="rejected">Đã từ chối</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Phân loại điểm danh
                        </label>
                        <select
                          value={filterValidationStatus}
                          onChange={(e) => setFilterValidationStatus(e.target.value as 'all' | 'perfect' | 'late_but_valid' | 'manual_check_in')}
                          className={`w-full px-3 py-2 rounded-lg border text-sm transition-all ${
                            isDarkMode 
                              ? 'bg-gray-700/50 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                              : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          } focus:outline-none`}
                        >
                          <option value="all">Tất cả</option>
                          <option value="perfect">Đúng giờ & đúng địa điểm</option>
                          <option value="late_but_valid">Trễ nhưng hợp lệ</option>
                          <option value="manual_check_in">Điểm danh thủ công</option>
                        </select>
                      </div>
                      <div className={`pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Hiển thị <span className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{filteredParticipants.length}</span> / <span className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{participants.length}</span> người
                          </p>
                          {filteredParticipants.length !== participants.length && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
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
              <div className="flex-1 min-w-0 w-full overflow-hidden">
                {/* Success/Error Messages */}
                {successMessage && (
                  <div className={`mb-4 p-4 rounded-xl border-2 shadow-md ${
                    isDarkMode 
                      ? 'bg-green-500/10 border-green-500/30 text-green-300' 
                      : 'bg-green-50 border-green-300 text-green-800'
                  }`}>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={20} strokeWidth={2.5} />
                      <p className="text-sm font-medium flex-1">{successMessage}</p>
                      <button
                        onClick={() => setSuccessMessage(null)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          isDarkMode ? 'hover:bg-green-500/20' : 'hover:bg-green-100'
                        }`}
                      >
                        <X size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className={`mb-4 p-4 rounded-xl border-2 shadow-md ${
                    isDarkMode 
                      ? 'bg-red-500/10 border-red-500/30 text-red-300' 
                      : 'bg-red-50 border-red-300 text-red-800'
                  }`}>
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={20} strokeWidth={2.5} />
                      <p className="text-sm font-medium flex-1">{error}</p>
                      <button
                        onClick={() => setError(null)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          isDarkMode ? 'hover:bg-red-500/20' : 'hover:bg-red-100'
                        }`}
                      >
                        <X size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Bulk Actions - Show when participants are selected */}
                {selectedParticipants.size > 0 && (() => {
                  const selectedParticipantsList = filteredParticipants.filter(p => {
                    const participantId = typeof p.userId === 'object' && p.userId !== null
                      ? p.userId._id || String(p.userId)
                      : String(p.userId);
                    return selectedParticipants.has(participantId);
                  });
                  const checkedInCount = selectedParticipantsList.filter(p => p.checkedIn).length;
                  
                  return (
                    <div className={`mb-4 p-4 rounded-xl border-2 shadow-md ${
                      isDarkMode 
                        ? 'bg-blue-500/10 border-blue-500/30' 
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                          Đã chọn {selectedParticipants.size} người
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={exportSelectedToExcel}
                            className="px-2 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <Download size={14} strokeWidth={2.5} />
                          Xuất Excel
                        </button>
                        <button
                          onClick={() => handleBulkCheckIn(true)}
                            className="px-2 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <CheckSquare size={14} strokeWidth={2.5} />
                          Điểm danh đã chọn
                        </button>
                        <button
                          onClick={() => handleBulkCheckIn(false)}
                            disabled={checkedInCount === 0}
                            className="px-2 py-1.5 rounded-lg text-xs font-medium bg-gray-600 text-white hover:bg-gray-700 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={checkedInCount === 0 ? 'Không có người nào đã điểm danh' : ''}
                        >
                            <X size={16} strokeWidth={2.5} />
                          Hủy điểm danh
                        </button>
                        <button
                          onClick={() => setSelectedParticipants(new Set())}
                          className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })()}

                {/* Bulk Actions - Show when no participants are selected */}
                {filteredParticipants.length > 0 && selectedParticipants.size === 0 && (() => {
                  const checkedInCount = filteredParticipants.filter(p => p.checkedIn).length;
                  
                  return (
                    <div className={`mb-4 p-4 rounded-xl border-2 shadow-md ${
                                  isDarkMode
                        ? 'bg-blue-500/10 border-blue-500/30' 
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                          Điểm danh tất cả {filteredParticipants.length} người đang hiển thị
                                  </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                            onClick={exportToExcel}
                            className="px-2 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm flex items-center gap-1.5"
                          >
                            <Download size={14} strokeWidth={2.5} />
                            Xuất Excel
                              </button>
                                  <button
                                    onClick={() => {
                            // If no participants selected, select all first
                            if (selectedParticipants.size === 0) {
                              const allParticipantIds = filteredParticipants.map(p => {
                                          return typeof p.userId === 'object' && p.userId !== null
                                            ? p.userId._id || String(p.userId)
                                            : String(p.userId);
                              });
                              setSelectedParticipants(new Set(allParticipantIds));
                            }
                            // Then open bulk check-in modal
                            const defaultSlot = activity?.timeSlots?.find((s: any) => s.isActive) || null;
                            if (defaultSlot) {
                              setBulkManualCheckInModal({
                                                              open: true,
                                slot: defaultSlot,
                                                              checkInType: 'start',
                                checkBoth: false,
                                shouldOverride: false,
                                allSlots: false
                                                          });
                                                        }
                                                      }}
                          className="px-2 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <CheckSquare size={14} strokeWidth={2.5} />
                          Điểm danh tất cả
                        </button>
                          <button
                            onClick={() => setCheckInAllModal({ open: true, checkedIn: false })}
                            disabled={checkedInCount === 0}
                            className="px-2 py-1.5 rounded-lg text-xs font-medium bg-gray-600 text-white hover:bg-gray-700 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={checkedInCount === 0 ? 'Không có người nào đã điểm danh' : ''}
                          >
                            <X size={14} strokeWidth={2.5} />
                            Hủy điểm danh tất cả
                          </button>
                                                    </div>
                                                    </div>
                                                            </div>
                                                          );
                                                      })()}

                {/* Participants List */}
                {filteredParticipants.length > 0 ? (
                  viewMode === 'table' ? (
                    /* Table View */
                    <div className={`rounded-xl border-2 shadow-lg overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-900' : 'bg-white border-black'}`}>
                      <div className="overflow-x-auto w-full">
                        <table className="w-full border-collapse" style={{ minWidth: '100%' }}>
                          <thead className={`bg-blue-600 border-b-2 border-blue-500`}>
                            <tr className="border-b-2 border-blue-500">
                              <th className={`px-1 py-2 text-center border-r-2 border-blue-500 bg-blue-600 text-white w-10`}>
                                <input
                                  type="checkbox"
                                  checked={selectedParticipants.size === filteredParticipants.length && filteredParticipants.length > 0}
                                  onChange={toggleSelectAll}
                                  className="w-4 h-4 rounded border-gray-300 text-white focus:ring-blue-400 mx-auto"
                                />
                              </th>
                              <th className={`px-1 py-2 text-center text-xs font-semibold uppercase w-10 border-r-2 border-blue-500 bg-blue-600 text-white`}>
                                STT
                              </th>
                              <th className={`px-2 py-2 text-left text-xs font-semibold uppercase border-r-2 border-blue-500 bg-blue-600 text-white w-20`}>
                                Người tham gia
                              </th>
                              <th className={`px-2 py-2 text-left text-xs font-semibold uppercase border-r-2 border-blue-500 bg-blue-600 text-white w-24`}>
                                Vai trò
                              </th>
                              {/* Dynamic columns for time slots - Single Day Activity */}
                              {activity && activity.type === 'single_day' && activity.timeSlots && activity.timeSlots.length > 0 && (
                                <>
                                  {/* Cột phần trăm tổng đã điểm danh */}
                                  <th rowSpan={2} className={`px-2 py-2 text-center text-xs font-semibold uppercase border-r-2 border-blue-500 bg-blue-600 text-white w-16`}>
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="text-[9px] font-bold">%</span>
                                    </div>
                              </th>
                                  <th rowSpan={2} className={`px-2 py-2 text-center text-xs font-semibold uppercase border-r-2 border-blue-500 bg-blue-600 text-white w-20`}>
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="text-[9px] font-bold">Buổi</span>
                                    </div>
                                  </th>
                                  {/* Slot name headers - mỗi slot chỉ 1 cột */}
                                  {activity.timeSlots.filter((s: any) => s.isActive).map((slot: any) => {
                                    // Calculate total attendance count for this slot across all participants
                                    const totalCount = filteredParticipants.reduce((sum, p) => {
                                      const slotCount = getSlotAttendanceCount(p, slot);
                                      return sum + slotCount.count;
                                    }, 0);
                                    const maxPossible = filteredParticipants.length * 2; // 2 check-ins per participant (start + end)
                                    const displayText = `${totalCount}/${maxPossible}`;
                                    
                                    return (
                                      <th key={slot.id || slot.name} className={`px-2 py-2 text-center text-xs font-semibold uppercase border-r-2 border-blue-500 bg-blue-600 text-white w-48`}>
                                        <div className="flex flex-col items-center gap-0.5">
                                          <span className="text-xs font-bold text-white">{slot.name}</span>
                                          <span className="text-[10px] font-medium text-white">
                                            {displayText}
                                          </span>
                                        </div>
                                      </th>
                                    );
                                  })}
                                </>
                              )}
                              {/* Dynamic columns for multiple days activity - Only show selected day */}
                              {activity && activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0 && (activity.timeSlots && Array.isArray(activity.timeSlots) && activity.timeSlots.length > 0) && (
                                <>
                                  {/* Cột phần trăm tổng đã điểm danh */}
                                  <th rowSpan={2} className={`px-2 py-2 text-center text-xs font-semibold uppercase border-r-2 border-blue-500 bg-blue-600 text-white w-16`}>
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="text-[9px] font-bold">%</span>
                                    </div>
                                  </th>
                                  <th rowSpan={2} className={`px-2 py-2 text-center text-xs font-semibold uppercase border-r-2 border-blue-500 bg-blue-600 text-white w-20`}>
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="text-[9px] font-bold">Buổi</span>
                                    </div>
                                  </th>
                                  {/* Show only selected day - Slot headers */}
                                  {(() => {
                                    const dayToShow = selectedDay !== null ? selectedDay : (activity.schedule && activity.schedule.length > 0 ? activity.schedule[0].day : null);
                                    if (dayToShow === null) return null;
                                    const selectedScheduleDay = activity.schedule!.find((d: any) => d.day === dayToShow);
                                    if (!selectedScheduleDay) return null;
                                    
                                    return activity.timeSlots!.map((slot: any) => {
                                      const dayDate = new Date(selectedScheduleDay.date);
                                      // Calculate total attendance count for this day+slot across all participants
                                      const totalCount = filteredParticipants.reduce((sum, p) => {
                                        const attendances = p.attendances?.filter((a: AttendanceRecord) => {
                                          const aDate = new Date(a.checkInTime);
                                          return a.timeSlot === slot.name &&
                                                 aDate.toLocaleDateString('vi-VN') === dayDate.toLocaleDateString('vi-VN') &&
                                                 (a.status === 'approved' || a.status === 'pending');
                                        }) || [];
                                        return sum + attendances.length;
                                      }, 0);
                                      const maxPossible = filteredParticipants.length * 2; // 2 check-ins per participant (start + end)
                                      const displayText = `${totalCount}/${maxPossible}`;
                                      
                                      return (
                                        <th key={slot.id || slot.name} className={`px-2 py-2 text-center text-xs font-semibold uppercase border-r-2 border-blue-500 bg-blue-600 text-white w-48`}>
                                          <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-[10px] font-bold text-white">{slot.name}</span>
                                            <span className="text-[9px] font-medium text-white">
                                              {displayText}
                                            </span>
                                          </div>
                                        </th>
                                      );
                                    });
                                  })()}
                                </>
                              )}
                              {/* Fallback: Show "Điểm danh" column if no timeSlots or no schedule - Only show if detailed columns are NOT shown */}
                              {(!activity || !activity.timeSlots || !Array.isArray(activity.timeSlots) || activity.timeSlots.length === 0) && 
                                !(activity && activity.type === 'single_day' && activity.timeSlots && Array.isArray(activity.timeSlots) && activity.timeSlots.length > 0) &&
                                !(activity && activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0 && activity.timeSlots && Array.isArray(activity.timeSlots) && activity.timeSlots.length > 0) && (
                                <th rowSpan={2} className={`px-4 py-3 text-left text-xs font-semibold uppercase border-r-2 border-blue-500 bg-blue-600 text-white`}>
                                Điểm danh
                              </th>
                              )}
                              <th rowSpan={2} className={`px-1 py-2 text-center text-xs font-semibold uppercase border-r-2 border-blue-500 bg-blue-600 text-white w-14`}>
                                Thao tác
                              </th>
                            </tr>
                            {/* Second header row for multiple days - Slot names - Only for selected day */}
                            {activity && activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0 && (activity.timeSlots && Array.isArray(activity.timeSlots) && activity.timeSlots.length > 0) && (
                              <tr className="border-b-2 border-blue-500">
                                {/* Empty row for multiple_days - already has rowSpan={2} headers */}
                              </tr>
                            )}
                            {activity && activity.type === 'single_day' && activity.timeSlots && activity.timeSlots.length > 0 && (
                              <tr className="border-b-2 border-blue-500">
                                {/* Empty row for single_day - already has rowSpan={2} headers */}
                              </tr>
                            )}
                            {(!activity || !activity.timeSlots || activity.timeSlots.length === 0 || 
                              (activity.type !== 'single_day' && (!activity.schedule || activity.schedule.length === 0))) && (
                              <tr className="border-b-2 border-blue-500">
                                {/* Empty row for fallback */}
                              </tr>
                            )}
                          </thead>
                          <tbody>
                            {filteredParticipants.map((participant, participantIndex) => {
                              const participantId = typeof participant.userId === 'object' && participant.userId !== null
                                ? participant.userId._id || String(participant.userId)
                                : String(participant.userId);
                              const isLastParticipant = participantIndex === filteredParticipants.length - 1;
                              
                              const config = roleConfig[participant.role] || roleConfig['Người Tham Gia'];
                              const isSelected = selectedParticipants.has(participantId);
                              const isProcessing = processing.has(participantId);
                              const isExpanded = expandedRows.has(participantId);
                              const pendingAttendances = participant.attendances?.filter(a => a.status === 'pending') || [];
                              const hasAttendances = participant.attendances && participant.attendances.length > 0;

                              return (
                                <Fragment key={participantId}>
                                  {/* Row 1: Đầu buổi */}
                                  <tr
                                    className={`transition-colors ${
                                      isSelected
                                        ? isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'
                                        : ''
                                    }`}
                                  >
                                    <td rowSpan={2} className={`px-1 py-2 text-center border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelectParticipant(participantId)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mx-auto"
                                      />
                                    </td>
                                    <td rowSpan={2} className={`px-1 py-2 text-center border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                                        isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                                      }`}>
                                        {filteredParticipants.indexOf(participant) + 1}
                                      </span>
                                    </td>
                                    <td rowSpan={2} className={`px-2 py-2 border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                      <div className="flex items-center gap-2">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold bg-gradient-to-br ${config.gradient} text-white shadow-sm flex-shrink-0`}>
                                          {getInitials(participant.name)}
                                        </div>
                                        <div className="min-w-0">
                                          <div className={`font-semibold text-xs ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                                            {participant.name}
                                          </div>
                                          <div className={`text-[10px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {participant.email}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td rowSpan={2} className={`px-2 py-2 border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${config.bg} ${config.color}`}>
                                        {(() => {
                                          const IconComponent = config.icon;
                                          return <IconComponent size={12} strokeWidth={2.5} />;
                                        })()}
                                        {participant.role}
                                      </span>
                                    </td>
                                    {/* Dynamic columns for time slots - Single Day Activity - Row 1: Đầu buổi */}
                                    {activity && activity.type === 'single_day' && activity.timeSlots && activity.timeSlots.length > 0 && (
                                      <>
                                        {/* Cột phần trăm tổng đã điểm danh - Row 1 */}
                                                  {(() => {
                                          // Only count slots that participant has registered for
                                          const registeredSlots = activity.timeSlots!.filter((s: any) => s.isActive).filter((slot: any) => isSlotRegistered(participant, slot));
                                          const totalCheckIns = registeredSlots.length * 2; // 2 check-ins per slot (start + end)
                                          let approvedCheckIns = 0;
                                          
                                          registeredSlots.forEach((slot: any) => {
                                            const slotCount = getSlotAttendanceCount(participant, slot);
                                            approvedCheckIns += slotCount.count;
                                          });
                                          
                                          const percentage = totalCheckIns > 0 
                                            ? Math.round((approvedCheckIns / totalCheckIns) * 100)
                                            : 0; // If no registered slots, percentage is 0
                                          
                                          return (
                                            <td rowSpan={2} className={`px-2 py-2 text-center border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                              <div className="flex flex-col items-center justify-center gap-0.5">
                                                {/* Circular Progress */}
                                                <div className="relative w-10 h-10">
                                                  <svg className="transform -rotate-90 w-10 h-10">
                                                    {/* Background circle */}
                                                    <circle
                                                      cx="20"
                                                      cy="20"
                                                      r="16"
                                                      fill="none"
                                                      stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                                                      strokeWidth="3"
                                                    />
                                                    {/* Progress circle */}
                                                    <circle
                                                      cx="20"
                                                      cy="20"
                                                      r="16"
                                                      fill="none"
                                                      stroke={
                                                        percentage >= 80
                                                          ? '#10b981' // green-500
                                                          : percentage >= 50
                                                            ? '#eab308' // yellow-500
                                                            : percentage > 0
                                                              ? '#f97316' // orange-500
                                                              : '#6b7280' // gray-500
                                                      }
                                                      strokeWidth="3"
                                                      strokeLinecap="round"
                                                      strokeDasharray={`${2 * Math.PI * 16}`}
                                                      strokeDashoffset={`${2 * Math.PI * 16 * (1 - percentage / 100)}`}
                                                      className="transition-all duration-500"
                                                    />
                                                  </svg>
                                                  {/* Percentage text in center */}
                                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className={`text-[8px] font-bold leading-tight ${
                                                      percentage >= 80
                                                        ? isDarkMode ? 'text-green-400' : 'text-green-600'
                                                        : percentage >= 50
                                                          ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                                                          : percentage > 0
                                                            ? isDarkMode ? 'text-orange-400' : 'text-orange-600'
                                                            : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                                    }`}>
                                                      {percentage}%
                                                    </span>
                                                  </div>
                                                </div>
                                                {/* Fraction below */}
                                                <span className={`text-[8px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                  {approvedCheckIns}/{totalCheckIns}
                                                </span>
                                              </div>
                                            </td>
                                          );
                                        })()}
                                        {/* Cột BUỔI - Hàng 1: Đầu buổi */}
                                        <td className={`px-2 py-2 text-center border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                          <span className={`text-[9px] font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Đầu buổi
                                          </span>
                                        </td>
                                        
                                        {/* Các cột buổi - Hàng 1: Đầu buổi - mỗi slot chỉ 1 cột */}
                                        {activity.timeSlots!.filter((s: any) => s.isActive).map((slot: any) => {
                                          // Check if participant has registered for this slot
                                          const isRegistered = isSlotRegistered(participant, slot);
                                          
                                          // If not registered, show "Không đăng ký" with rowSpan={2} to span both rows
                                          if (!isRegistered) {
                                            return (
                                              <td key={`${slot.id || slot.name}`} rowSpan={2} className={`px-3 py-2.5 text-center border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                                <div className="flex flex-col items-center justify-center gap-1.5 h-full">
                                                  <div className={`flex items-center justify-center gap-1.5 p-2 rounded w-[100px] ${isDarkMode ? 'bg-gray-700/30 border border-gray-600/50' : 'bg-gray-100 border border-gray-300'}`}>
                                                    <XCircle size={16} className="text-gray-400" strokeWidth={2.5} />
                                                    <span className="text-[9px] font-semibold text-gray-400">Không đăng ký</span>
                                                  </div>
                                                </div>
                                              </td>
                                            );
                                          }
                                          
                                          const slotStartStatus = getAttendanceStatusWithTime(participant, slot, 'start', activity.date);
                                          
                                          let statusText = '';
                                          if (slotStartStatus.hasCheckedIn) {
                                            if (slotStartStatus.attendance?.status === 'approved') {
                                              const isManual = isManualCheckInRecord(slotStartStatus.attendance);
                                              const officerName = isManual && slotStartStatus.attendance?.verifiedBy 
                                                ? getVerifierName(slotStartStatus.attendance.verifiedBy) 
                                                : null;
                                              statusText = isManual && officerName && officerName !== 'Hệ thống tự động'
                                                ? `Thủ Công (${officerName})` 
                                                : (isManual ? 'Thủ Công' : (slotStartStatus.timeStatus === 'on_time' ? 'Đúng' : 'Trễ'));
                                            } else if (slotStartStatus.attendance?.status === 'rejected') {
                                              statusText = 'Từ chối';
                                            } else {
                                              statusText = 'Chờ duyệt';
                                            }
                                          } else {
                                            if (slotStartStatus.timeStatus === 'not_started') {
                                              statusText = 'Chưa đến';
                                            } else if (slotStartStatus.timeStatus === 'in_progress') {
                                              statusText = 'Đang mở';
                                            } else {
                                              statusText = 'Vắng';
                                            }
                                          }
                                          
                                          return (
                                            <td key={`${slot.id || slot.name}-start`} className={`px-3 py-2.5 text-center border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                              <div className="flex flex-col items-center gap-1.5">
                                                <div 
                                                  className={`flex items-center justify-center gap-1.5 p-2 rounded transition-opacity w-[100px] ${
                                                    slotStartStatus.hasCheckedIn
                                                      ? slotStartStatus.attendance?.status === 'approved'
                                                        ? slotStartStatus.timeStatus === 'on_time'
                                                          ? isDarkMode ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-100 border border-green-300'
                                                          : isDarkMode ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-orange-100 border border-orange-300'
                                                        : slotStartStatus.attendance?.status === 'rejected'
                                                          ? isDarkMode ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-100 border border-red-300'
                                                          : isDarkMode ? 'bg-amber-500/20 border border-amber-500/30 animate-pulse ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/30' : 'bg-amber-100 border border-amber-300 animate-pulse ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/30'
                                                      : slotStartStatus.timeStatus === 'not_started'
                                                        ? isDarkMode ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-100 border border-blue-300'
                                                        : slotStartStatus.timeStatus === 'in_progress'
                                                          ? isDarkMode ? 'bg-cyan-500/20 border border-cyan-500/30 animate-pulse ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/30' : 'bg-cyan-100 border border-cyan-300 animate-pulse ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/30'
                                                          : isDarkMode ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-100 border border-red-300'
                                                  } ${
                                                    (slotStartStatus.hasCheckedIn && activity.type === 'multiple_days' && activity.schedule
                                                      ? (() => {
                                                          const scheduleDay = activity.schedule!.find((s: any) => s.day === selectedDay);
                                                          return scheduleDay ? areAllSlotsNotStarted(scheduleDay.date, selectedDay || undefined) : false;
                                                        })()
                                                      : (slotStartStatus.hasCheckedIn && activity.type === 'single_day'
                                                        ? areAllSlotsNotStarted(activity.date)
                                                        : false)) || (statusText === 'Vắng' && slotStartStatus.timeStatus === 'not_started')
                                                      ? 'cursor-not-allowed opacity-60'
                                                      : 'cursor-pointer hover:opacity-80'
                                                  }`}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    
                                                    // Check if action is disabled
                                                    const isDisabled = (slotStartStatus.hasCheckedIn && activity.type === 'multiple_days' && activity.schedule
                                                      ? (() => {
                                                          const scheduleDay = activity.schedule!.find((s: any) => s.day === selectedDay);
                                                          return scheduleDay ? areAllSlotsNotStarted(scheduleDay.date, selectedDay || undefined) : false;
                                                        })()
                                                      : (slotStartStatus.hasCheckedIn && activity.type === 'single_day'
                                                        ? areAllSlotsNotStarted(activity.date)
                                                        : false)) || (statusText === 'Vắng' && slotStartStatus.timeStatus === 'not_started');
                                                    
                                                    if (isDisabled) return;
                                                    
                                                    if (slotStartStatus.hasCheckedIn) {
                                                      handleAttendanceClick(participant, slot, 'start', activity.date);
                                                    } else if (statusText === 'Vắng') {
                                                      // Open manual check-in modal for "Vắng"
                                                      if (activity.type === 'multiple_days' && activity.schedule && selectedDay !== null) {
                                                        const scheduleDay = activity.schedule.find((s: any) => s.day === selectedDay);
                                                        if (scheduleDay) {
                                                          setManualCheckInModal({
                                                            open: true,
                                                            participant,
                                                            slot,
                                                            checkInType: 'start',
                                                            slotDate: scheduleDay.date,
                                                            dayNumber: selectedDay
                                                          });
                                                        } else {
                                                          // Fallback: use first day if selectedDay not found
                                                          const firstDay = activity.schedule[0];
                                                          if (firstDay) {
                                                            setManualCheckInModal({
                                                              open: true,
                                                              participant,
                                                              slot,
                                                              checkInType: 'start',
                                                              slotDate: firstDay.date,
                                                              dayNumber: firstDay.day
                                                          });
                                                          }
                                                        }
                                                      } else {
                                                        setManualCheckInModal({
                                                          open: true,
                                                          participant,
                                                          slot,
                                                          checkInType: 'start'
                                                        });
                                                      }
                                                    }
                                                  }}
                                                  title={`${slot.name} - Đầu buổi`}
                                                >
                                                  {slotStartStatus.hasCheckedIn ? (
                                                    <CheckCircle2 
                                                      size={16} 
                                                      className={
                                                        slotStartStatus.attendance?.status === 'approved'
                                                          ? slotStartStatus.timeStatus === 'on_time' ? 'text-green-500' : 'text-orange-500'
                                                          : slotStartStatus.attendance?.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                                                      } 
                                                      strokeWidth={2.5} 
                                                    />
                                                  ) : (
                                                    slotStartStatus.timeStatus === 'not_started' ? (
                                                      <Clock size={16} className="text-blue-500" strokeWidth={2.5} />
                                                    ) : slotStartStatus.timeStatus === 'in_progress' ? (
                                                      <Clock size={16} className="text-cyan-500" strokeWidth={2.5} />
                                                    ) : (
                                                      <XCircle size={16} className="text-red-500" strokeWidth={2.5} />
                                                    )
                                                  )}
                                                  <span className={`text-[10px] font-semibold ${
                                                    slotStartStatus.hasCheckedIn
                                                      ? slotStartStatus.attendance?.status === 'approved'
                                                        ? slotStartStatus.timeStatus === 'on_time' ? 'text-green-500' : 'text-orange-500'
                                                        : slotStartStatus.attendance?.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                                                      : slotStartStatus.timeStatus === 'not_started' ? 'text-blue-500'
                                                        : slotStartStatus.timeStatus === 'in_progress' ? 'text-cyan-500' : 'text-red-500'
                                                  }`}>
                                                    {statusText}
                                                  </span>
                                                </div>
                                      </div>
                                    </td>
                                          );
                                        })}
                                      </>
                                    )}
                                    {/* Dynamic columns for multiple days activity - Row 1: Đầu buổi */}
                                    {activity && activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0 && (activity.timeSlots && Array.isArray(activity.timeSlots) && activity.timeSlots.length > 0) && (
                                      <>
                                        {/* Cột phần trăm tổng đã điểm danh - Row 1 - Only for selected day */}
                                        {(() => {
                                          // Calculate total check-ins only for selected day
                                          const dayToShow = selectedDay !== null ? selectedDay : (activity.schedule && activity.schedule.length > 0 ? activity.schedule[0].day : null);
                                          if (dayToShow === null) return null;
                                          const selectedScheduleDay = activity.schedule!.find((d: any) => d.day === dayToShow);
                                          if (!selectedScheduleDay) return null;
                                          
                                          let totalCheckIns = 0;
                                          let approvedCheckIns = 0;
                                          
                                          activity.timeSlots!.forEach((slot: any) => {
                                            // Only count slots that participant has registered for
                                            if (!isSlotRegistered(participant, slot, selectedScheduleDay.day)) {
                                              return;
                                            }
                                            totalCheckIns += 2; // start + end
                                            const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', selectedScheduleDay.date, selectedScheduleDay.day);
                                            const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', selectedScheduleDay.date, selectedScheduleDay.day);
                                            
                                            if (startStatus.hasCheckedIn && startStatus.attendance?.status === 'approved') {
                                              approvedCheckIns++;
                                            }
                                            if (endStatus.hasCheckedIn && endStatus.attendance?.status === 'approved') {
                                              approvedCheckIns++;
                                            }
                                          });
                                          
                                          const percentage = totalCheckIns > 0 
                                            ? Math.round((approvedCheckIns / totalCheckIns) * 100)
                                            : 0;
                                          
                                              return (
                                            <td rowSpan={2} className={`px-2 py-2 text-center border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                              <div className="flex flex-col items-center justify-center gap-0.5">
                                                {/* Circular Progress */}
                                                <div className="relative w-10 h-10">
                                                  <svg className="transform -rotate-90 w-10 h-10">
                                                    {/* Background circle */}
                                                    <circle
                                                      cx="20"
                                                      cy="20"
                                                      r="16"
                                                      fill="none"
                                                      stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                                                      strokeWidth="3"
                                                    />
                                                    {/* Progress circle */}
                                                    <circle
                                                      cx="20"
                                                      cy="20"
                                                      r="16"
                                                      fill="none"
                                                      stroke={
                                                        percentage >= 80
                                                          ? '#10b981' // green-500
                                                          : percentage >= 50
                                                            ? '#eab308' // yellow-500
                                                            : percentage > 0
                                                              ? '#f97316' // orange-500
                                                              : '#6b7280' // gray-500
                                                      }
                                                      strokeWidth="3"
                                                      strokeLinecap="round"
                                                      strokeDasharray={`${2 * Math.PI * 16}`}
                                                      strokeDashoffset={`${2 * Math.PI * 16 * (1 - percentage / 100)}`}
                                                      className="transition-all duration-500"
                                                    />
                                                  </svg>
                                                  {/* Percentage text in center */}
                                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className={`text-[8px] font-bold leading-tight ${
                                                      percentage >= 80
                                                        ? isDarkMode ? 'text-green-400' : 'text-green-600'
                                                        : percentage >= 50
                                                          ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                                                          : percentage > 0
                                                            ? isDarkMode ? 'text-orange-400' : 'text-orange-600'
                                                            : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                                    }`}>
                                                      {percentage}%
                                                </span>
                                                  </div>
                                                </div>
                                                {/* Fraction below */}
                                                <span className={`text-[8px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                  {approvedCheckIns}/{totalCheckIns}
                                                </span>
                                              </div>
                                            </td>
                                          );
                                          })()}
                                        {/* Cột BUỔI - Hàng 1: Đầu buổi */}
                                        <td className={`px-2 py-2 text-center border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                          <span className={`text-[9px] font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Đầu buổi
                                                </span>
                                        </td>
                                        
                                        {/* Các cột cho ngày được chọn - Hàng 1: Đầu buổi */}
                                        {(() => {
                                          const dayToShow = selectedDay !== null ? selectedDay : (activity.schedule && activity.schedule.length > 0 ? activity.schedule[0].day : null);
                                          if (dayToShow === null) return null;
                                          const selectedScheduleDay = activity.schedule!.find((d: any) => d.day === dayToShow);
                                          if (!selectedScheduleDay) return null;
                                          
                                          return activity.timeSlots!.filter((s: any) => s.isActive).map((slot: any) => {
                                            // Check if participant has registered for this slot
                                            const isRegistered = isSlotRegistered(participant, slot, selectedScheduleDay.day);
                                            
                                            // If not registered, show "Không đăng ký" with rowSpan={2} to span both rows
                                            if (!isRegistered) {
                                              return (
                                                <td key={`day-${selectedScheduleDay.day}-slot-${slot.id || slot.name}`} rowSpan={2} className={`px-3 py-2.5 text-center border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                                  <div className="flex flex-col items-center justify-center gap-1.5 h-full">
                                                    <div className={`flex items-center justify-center gap-1.5 p-2 rounded w-[100px] ${isDarkMode ? 'bg-gray-700/30 border border-gray-600/50' : 'bg-gray-100 border border-gray-300'}`}>
                                                      <XCircle size={16} className="text-gray-400" strokeWidth={2.5} />
                                                      <span className="text-[9px] font-semibold text-gray-400">Không đăng ký</span>
                                                    </div>
                                                  </div>
                                                </td>
                                              );
                                            }
                                            
                                            const slotStartStatus = getAttendanceStatusWithTime(participant, slot, 'start', selectedScheduleDay.date, selectedScheduleDay.day);
                                            
                                            let statusText = '';
                                            if (slotStartStatus.hasCheckedIn) {
                                              if (slotStartStatus.attendance?.status === 'approved') {
                                                const isManual = isManualCheckInRecord(slotStartStatus.attendance);
                                                const officerName = isManual && slotStartStatus.attendance?.verifiedBy 
                                                  ? getVerifierName(slotStartStatus.attendance.verifiedBy) 
                                                  : null;
                                                statusText = isManual && officerName && officerName !== 'Hệ thống tự động'
                                                  ? `Thủ Công (${officerName})` 
                                                  : (isManual ? 'Thủ Công' : (slotStartStatus.timeStatus === 'on_time' ? 'Đúng' : 'Trễ'));
                                              } else if (slotStartStatus.attendance?.status === 'rejected') {
                                                statusText = 'Từ chối';
                                              } else {
                                                statusText = 'Chờ duyệt';
                                              }
                                            } else {
                                              if (slotStartStatus.timeStatus === 'not_started') {
                                                statusText = 'Chưa đến';
                                              } else if (slotStartStatus.timeStatus === 'in_progress') {
                                                statusText = 'Đang mở';
                                              } else {
                                                statusText = 'Vắng';
                                              }
                                            }
                                            
                                              return (
                                              <td key={`day-${selectedScheduleDay.day}-slot-${slot.id || slot.name}-start`} className={`px-3 py-2.5 text-center border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                                <div className="flex flex-col items-center gap-1.5">
                                                  <div 
                                                    className={`flex items-center justify-center gap-1.5 p-2 rounded transition-opacity w-[100px] ${
                                                      slotStartStatus.hasCheckedIn
                                                        ? slotStartStatus.attendance?.status === 'approved'
                                                          ? slotStartStatus.timeStatus === 'on_time'
                                                            ? isDarkMode ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-100 border border-green-300'
                                                            : isDarkMode ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-orange-100 border border-orange-300'
                                                          : slotStartStatus.attendance?.status === 'rejected'
                                                            ? isDarkMode ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-100 border border-red-300'
                                                            : isDarkMode ? 'bg-amber-500/20 border border-amber-500/30 animate-pulse ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/30' : 'bg-amber-100 border border-amber-300 animate-pulse ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/30'
                                                        : slotStartStatus.timeStatus === 'not_started'
                                                          ? isDarkMode ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-100 border border-blue-300'
                                                          : slotStartStatus.timeStatus === 'in_progress'
                                                            ? isDarkMode ? 'bg-cyan-500/20 border border-cyan-500/30 animate-pulse ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/30' : 'bg-cyan-100 border border-cyan-300 animate-pulse ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/30'
                                                            : isDarkMode ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-100 border border-red-300'
                                                    } ${
                                                      (slotStartStatus.hasCheckedIn && areAllSlotsNotStarted(selectedScheduleDay.date, selectedScheduleDay.day)) || (statusText === 'Vắng' && slotStartStatus.timeStatus === 'not_started')
                                                        ? 'cursor-not-allowed opacity-60'
                                                        : 'cursor-pointer hover:opacity-80'
                                                    }`}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      
                                                      // Check if action is disabled
                                                      const isDisabled = (slotStartStatus.hasCheckedIn && areAllSlotsNotStarted(selectedScheduleDay.date, selectedScheduleDay.day)) || (statusText === 'Vắng' && slotStartStatus.timeStatus === 'not_started');
                                                      
                                                      if (isDisabled) return;
                                                      
                                                      if (slotStartStatus.hasCheckedIn) {
                                                        handleAttendanceClick(participant, slot, 'start', selectedScheduleDay.date, selectedScheduleDay.day);
                                                      } else if (statusText === 'Vắng') {
                                                        setManualCheckInModal({
                                                          open: true,
                                                          participant,
                                                          slot,
                                                          checkInType: 'start',
                                                          slotDate: selectedScheduleDay.date,
                                                          dayNumber: selectedScheduleDay.day
                                                        });
                                                      }
                                                    }}
                                                    title={`Ngày ${selectedScheduleDay.day} - ${slot.name} - Đầu buổi: ${statusText}`}
                                                  >
                                                    {slotStartStatus.hasCheckedIn ? (
                                                      <CheckCircle2 
                                                        size={16} 
                                                        className={
                                                          slotStartStatus.attendance?.status === 'approved'
                                                            ? slotStartStatus.timeStatus === 'on_time' ? 'text-green-500' : 'text-orange-500'
                                                            : slotStartStatus.attendance?.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                                                        } 
                                                        strokeWidth={2.5} 
                                                      />
                                                    ) : (
                                                      slotStartStatus.timeStatus === 'not_started' ? (
                                                        <Clock size={16} className="text-blue-500" strokeWidth={2.5} />
                                                      ) : slotStartStatus.timeStatus === 'in_progress' ? (
                                                        <Clock size={16} className="text-cyan-500" strokeWidth={2.5} />
                                                      ) : (
                                                        <XCircle size={16} className="text-red-500" strokeWidth={2.5} />
                                                      )
                                                    )}
                                                    <span className={`text-[10px] font-semibold ${
                                                      slotStartStatus.hasCheckedIn
                                                        ? slotStartStatus.attendance?.status === 'approved'
                                                          ? slotStartStatus.timeStatus === 'on_time' ? 'text-green-500' : 'text-orange-500'
                                                          : slotStartStatus.attendance?.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                                                        : slotStartStatus.timeStatus === 'not_started' ? 'text-blue-500'
                                                          : slotStartStatus.timeStatus === 'in_progress' ? 'text-cyan-500' : 'text-red-500'
                                                    }`}>
                                                      {statusText}
                                                    </span>
                                                    </div>
                                                    </div>
                                              </td>
                                            );
                                          });
                                        })()}
                                      </>
                                    )}
                                    {/* Fallback: Show old "Điểm danh" column if no timeSlots or no schedule - Only show if detailed columns are NOT shown */}
                                    {(!activity || !activity.timeSlots || activity.timeSlots.length === 0) && 
                                      !(activity && activity.type === 'single_day' && activity.timeSlots && activity.timeSlots.length > 0) &&
                                      !(activity && activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0 && activity.timeSlots && Array.isArray(activity.timeSlots) && activity.timeSlots.length > 0) && (
                                      <td rowSpan={2} className={`px-2 py-2 border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                      <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          {(() => {
                                            // For multiple_days, check attendance for selected day only
                                            let hasAttendance = false;
                                            if (activity && activity.type === 'multiple_days' && selectedDay !== null && activity.schedule) {
                                              const selectedScheduleDay = activity.schedule.find((d: any) => d.day === selectedDay);
                                              if (selectedScheduleDay) {
                                                const dayDate = new Date(selectedScheduleDay.date);
                                                hasAttendance = participant.attendances?.some((a: AttendanceRecord) => {
                                                  const aDate = new Date(a.checkInTime);
                                                  return aDate.toLocaleDateString('vi-VN') === dayDate.toLocaleDateString('vi-VN') &&
                                                         (a.status === 'approved' || a.status === 'pending');
                                                }) || false;
                                              }
                                            } else {
                                              // For single_day or when no day selected, use overall checkedIn status
                                              hasAttendance = participant.checkedIn || false;
                                            }
                                            
                                            return hasAttendance ? (
                                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'}`}>
                                                <CheckCircle2 size={14} strokeWidth={2.5} />
                                                Đã điểm danh
                                              </span>
                                            ) : (
                                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${isDarkMode ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                                <XCircle size={14} strokeWidth={2.5} />
                                                Chưa điểm danh
                                              </span>
                                            );
                                        })()}
                                        </div>
                                      </div>
                                    </td>
                                    )}
                                    {/* Thao tác column - Row 1 */}
                                    {((activity && activity.type === 'single_day' && activity.timeSlots && activity.timeSlots.length > 0) ||
                                      (activity && activity.type === 'multiple_days' && activity.schedule && activity.timeSlots && activity.timeSlots.length > 0)) ? (
                                      <td rowSpan={2} className={`px-2 py-2 border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                        <div className="flex items-center justify-center">
                                        {(() => {
                                          // Check if participant has attendance for selected day (for multiple_days) or overall (for single_day)
                                          let hasAttendanceForDay = false;
                                          if (activity && activity.type === 'multiple_days' && selectedDay !== null && activity.schedule) {
                                            const selectedScheduleDay = activity.schedule.find((d: any) => d.day === selectedDay);
                                            if (selectedScheduleDay) {
                                              const dayDate = new Date(selectedScheduleDay.date);
                                              hasAttendanceForDay = participant.attendances?.some((a: AttendanceRecord) => {
                                                const aDate = new Date(a.checkInTime);
                                                return aDate.toLocaleDateString('vi-VN') === dayDate.toLocaleDateString('vi-VN') &&
                                                       (a.status === 'approved' || a.status === 'pending');
                                              }) || false;
                                            }
                                          } else {
                                            hasAttendanceForDay = participant.checkedIn || false;
                                          }
                                          
                                          return (
                                        <button
                                          onClick={() => {
                                                if (hasAttendanceForDay) {
                                              setCancelModal({ 
                                                open: true, 
                                                attendanceId: null, 
                                                    participantId: participantId,
                                                    selectedDay: activity && activity.type === 'multiple_days' ? selectedDay : null
                                              });
                                              setCancelReason('');
                                            } else {
                                                  // Open confirmation modal for check-in all missing sessions
                                                  // For multiple_days, only check-in for selected day
                                                  setConfirmCheckInAllSessionsModal({
                                                    open: true,
                                                    participant,
                                                    selectedDay: activity && activity.type === 'multiple_days' ? selectedDay : null
                                                  });
                                            }
                                          }}
                                          disabled={isProcessing}
                                                className={`w-[60px] px-1 py-1 rounded-lg text-[9px] font-semibold transition-all shadow-sm flex items-center justify-center gap-0.5 ${
                                                hasAttendanceForDay
                                              ? isDarkMode 
                                                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                              : 'bg-green-600 text-white hover:bg-green-700'
                                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                title={hasAttendanceForDay ? "Hủy điểm danh" : "Điểm danh thủ công"}
                                        >
                                          {isProcessing ? (
                                                  <Loader size={12} strokeWidth={2.5} className="animate-spin" />
                                              ) : hasAttendanceForDay ? (
                                            <>
                                                    <X size={12} strokeWidth={2.5} />
                                                    <span>Hủy</span>
                                            </>
                                          ) : (
                                            <>
                                                    <CheckSquare size={12} strokeWidth={2.5} />
                                                    <span>Điểm danh</span>
                                            </>
                                          )}
                                        </button>
                                          );
                                        })()}
                                      </div>
                                    </td>
                                    ) : (
                                      <td className={`px-2 py-2 border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                        <div className="flex items-center justify-center">
                                          <button
                                            onClick={() => {
                                              if (participant.checkedIn) {
                                                setCancelModal({ 
                                                  open: true, 
                                                  attendanceId: null, 
                                                  participantId: participantId 
                                                });
                                                setCancelReason('');
                                              } else {
                                                // Open confirmation modal for check-in all missing sessions
                                                // For multiple_days, only check-in for selected day
                                                if (activity) {
                                                  setConfirmCheckInAllSessionsModal({
                                                    open: true,
                                                    participant,
                                                    selectedDay: activity.type === 'multiple_days' ? selectedDay : null
                                                  });
                                                }
                                              }
                                            }}
                                            disabled={isProcessing}
                                            className={`w-[60px] px-1 py-1 rounded-lg text-[9px] font-semibold transition-all shadow-sm flex items-center justify-center gap-0.5 ${
                                              participant.checkedIn
                                                ? isDarkMode 
                                                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                : 'bg-green-600 text-white hover:bg-green-700'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            title={participant.checkedIn ? "Hủy điểm danh" : "Điểm danh thủ công"}
                                          >
                                            {isProcessing ? (
                                              <Loader size={12} strokeWidth={2.5} className="animate-spin" />
                                            ) : participant.checkedIn ? (
                                              <>
                                                <X size={12} strokeWidth={2.5} />
                                                <span>Hủy</span>
                                              </>
                                            ) : (
                                              <>
                                                <CheckSquare size={12} strokeWidth={2.5} />
                                                <span>Điểm danh</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                  {/* Row 2: Cuối buổi */}
                                  {activity && activity.type === 'single_day' && activity.timeSlots && activity.timeSlots.length > 0 && (
                                      <tr
                                        className={`transition-colors ${isLastParticipant ? `border-b-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}` : ''} ${
                                          isSelected
                                            ? isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'
                                            : ''
                                        }`}
                                      >
                                        {/* Các cột đầu (Checkbox, STT, Người tham gia, Vai trò) đã dùng rowSpan={2} trong hàng 1, không cần hiển thị lại */}
                                        
                                        {/* Cột BUỔI - Hàng 2: Cuối buổi */}
                                        <td className={`px-2 py-2 text-center border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                          <span className={`text-[9px] font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Cuối buổi
                                          </span>
                                        </td>
                                        
                                        {/* Các cột buổi - Hàng 2: Cuối buổi - mỗi slot chỉ 1 cột */}
                                        {activity.timeSlots!.filter((s: any) => s.isActive).map((slot: any) => {
                                          // Check if participant has registered for this slot
                                          const isRegistered = isSlotRegistered(participant, slot);
                                          
                                          // If not registered, don't render anything here (already rendered with rowSpan in row 1)
                                          if (!isRegistered) {
                                            return null;
                                          }
                                          
                                          const slotEndStatus = getAttendanceStatusWithTime(participant, slot, 'end', activity.date);
                                          
                                          let statusText = '';
                                          if (slotEndStatus.hasCheckedIn) {
                                            if (slotEndStatus.attendance?.status === 'approved') {
                                              const isManual = isManualCheckInRecord(slotEndStatus.attendance);
                                              const officerName = isManual && slotEndStatus.attendance?.verifiedBy 
                                                ? getVerifierName(slotEndStatus.attendance.verifiedBy) 
                                                : null;
                                              statusText = isManual && officerName && officerName !== 'Hệ thống tự động'
                                                ? `Thủ Công (${officerName})` 
                                                : (isManual ? 'Thủ Công' : (slotEndStatus.timeStatus === 'on_time' ? 'Đúng' : 'Trễ'));
                                            } else if (slotEndStatus.attendance?.status === 'rejected') {
                                              statusText = 'Từ chối';
                                            } else {
                                              statusText = 'Chờ duyệt';
                                            }
                                          } else {
                                            if (slotEndStatus.timeStatus === 'not_started') {
                                              statusText = 'Chưa đến';
                                            } else if (slotEndStatus.timeStatus === 'in_progress') {
                                              statusText = 'Đang mở';
                                            } else {
                                              statusText = 'Vắng';
                                            }
                                          }
                                          
                                          return (
                                            <td key={`${slot.id || slot.name}-end`} className={`px-3 py-2.5 text-center border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                              <div className="flex flex-col items-center gap-1.5">
                                                <div 
                                                  className={`flex items-center justify-center gap-1.5 p-2 rounded transition-opacity w-[100px] ${
                                                    slotEndStatus.hasCheckedIn
                                                      ? slotEndStatus.attendance?.status === 'approved'
                                                        ? slotEndStatus.timeStatus === 'on_time'
                                                          ? isDarkMode ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-100 border border-green-300'
                                                          : isDarkMode ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-orange-100 border border-orange-300'
                                                        : slotEndStatus.attendance?.status === 'rejected'
                                                          ? isDarkMode ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-100 border border-red-300'
                                                          : isDarkMode ? 'bg-amber-500/20 border border-amber-500/30 animate-pulse ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/30' : 'bg-amber-100 border border-amber-300 animate-pulse ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/30'
                                                      : slotEndStatus.timeStatus === 'not_started'
                                                        ? isDarkMode ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-100 border border-blue-300'
                                                        : slotEndStatus.timeStatus === 'in_progress'
                                                          ? isDarkMode ? 'bg-cyan-500/20 border border-cyan-500/30 animate-pulse ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/30' : 'bg-cyan-100 border border-cyan-300 animate-pulse ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/30'
                                                          : isDarkMode ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-100 border border-red-300'
                                                  } ${
                                                    (slotEndStatus.hasCheckedIn && activity.type === 'multiple_days' && activity.schedule
                                                      ? (() => {
                                                          const scheduleDay = activity.schedule!.find((s: any) => s.day === selectedDay);
                                                          return scheduleDay ? areAllSlotsNotStarted(scheduleDay.date, selectedDay || undefined) : false;
                                                        })()
                                                      : (slotEndStatus.hasCheckedIn && activity.type === 'single_day'
                                                        ? areAllSlotsNotStarted(activity.date)
                                                        : false)) || (statusText === 'Vắng' && slotEndStatus.timeStatus === 'not_started')
                                                      ? 'cursor-not-allowed opacity-60'
                                                      : 'cursor-pointer hover:opacity-80'
                                                  }`}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    
                                                    // Check if action is disabled
                                                    const isDisabled = (slotEndStatus.hasCheckedIn && activity.type === 'multiple_days' && activity.schedule
                                                      ? (() => {
                                                          const scheduleDay = activity.schedule!.find((s: any) => s.day === selectedDay);
                                                          return scheduleDay ? areAllSlotsNotStarted(scheduleDay.date, selectedDay || undefined) : false;
                                                        })()
                                                      : (slotEndStatus.hasCheckedIn && activity.type === 'single_day'
                                                        ? areAllSlotsNotStarted(activity.date)
                                                        : false)) || (statusText === 'Vắng' && slotEndStatus.timeStatus === 'not_started');
                                                    
                                                    if (isDisabled) return;
                                                    
                                                    if (slotEndStatus.hasCheckedIn) {
                                                      handleAttendanceClick(participant, slot, 'end', activity.date);
                                                    } else if (statusText === 'Vắng') {
                                                      // Open manual check-in modal for "Vắng"
                                                      if (activity.type === 'multiple_days' && activity.schedule && selectedDay !== null) {
                                                        const scheduleDay = activity.schedule.find((s: any) => s.day === selectedDay);
                                                        if (scheduleDay) {
                                                          setManualCheckInModal({
                                                            open: true,
                                                            participant,
                                                            slot,
                                                            checkInType: 'end',
                                                            slotDate: scheduleDay.date,
                                                            dayNumber: selectedDay
                                                          });
                                                        } else {
                                                          // Fallback: use first day if selectedDay not found
                                                          const firstDay = activity.schedule[0];
                                                          if (firstDay) {
                                                            setManualCheckInModal({
                                                              open: true,
                                                              participant,
                                                              slot,
                                                              checkInType: 'end',
                                                              slotDate: firstDay.date,
                                                              dayNumber: firstDay.day
                                                          });
                                                          }
                                                        }
                                                      } else {
                                                        setManualCheckInModal({
                                                          open: true,
                                                          participant,
                                                          slot,
                                                          checkInType: 'end'
                                                        });
                                                      }
                                                    }
                                                  }}
                                                  title={`${slot.name} - Cuối buổi`}
                                                >
                                                  {slotEndStatus.hasCheckedIn ? (
                                                    <CheckCircle2 
                                                      size={12} 
                                                      className={
                                                        slotEndStatus.attendance?.status === 'approved'
                                                          ? slotEndStatus.timeStatus === 'on_time' ? 'text-green-500' : 'text-orange-500'
                                                          : slotEndStatus.attendance?.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                                                      } 
                                                      strokeWidth={2.5} 
                                                    />
                                                  ) : (
                                                    slotEndStatus.timeStatus === 'not_started' ? (
                                                      <Clock size={12} className="text-blue-500" strokeWidth={2.5} />
                                                    ) : slotEndStatus.timeStatus === 'in_progress' ? (
                                                      <Clock size={12} className="text-cyan-500" strokeWidth={2.5} />
                                                    ) : (
                                                      <XCircle size={12} className="text-red-500" strokeWidth={2.5} />
                                                    )
                                                  )}
                                                  <span className={`text-xs font-semibold ${
                                                    slotEndStatus.hasCheckedIn
                                                      ? slotEndStatus.attendance?.status === 'approved'
                                                        ? slotEndStatus.timeStatus === 'on_time' ? 'text-green-500' : 'text-orange-500'
                                                        : slotEndStatus.attendance?.status === 'rejected' ? 'text-red-500' : 'text-yellow-500'
                                                      : slotEndStatus.timeStatus === 'not_started' ? 'text-blue-500'
                                                        : slotEndStatus.timeStatus === 'in_progress' ? 'text-cyan-500' : 'text-red-500'
                                                  }`}>
                                                    {statusText}
                                                  </span>
                                                </div>
                                              </div>
                                            </td>
                                          );
                                        })}
                                        
                                        {/* Cột Thao tác đã dùng rowSpan={2} trong hàng 1, không cần hiển thị lại */}
                                      </tr>
                                  )}
                                  {/* Row 2: Cuối buổi - Multiple Days - Only for selected day */}
                                  {activity && activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0 && (activity.timeSlots && Array.isArray(activity.timeSlots) && activity.timeSlots.length > 0) && (
                                      <tr
                                        className={`transition-colors ${isLastParticipant ? `border-b-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}` : ''} ${
                                          isSelected
                                            ? isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'
                                            : ''
                                        }`}
                                      >
                                        {/* Các cột đầu (Checkbox, STT, Người tham gia, Vai trò, %) đã dùng rowSpan={2} trong hàng 1, không cần hiển thị lại */}
                                        
                                        {/* Cột BUỔI - Hàng 2: Cuối buổi */}
                                        <td className={`px-2 py-2 text-center border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                          <span className={`text-[9px] font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Cuối buổi
                                          </span>
                                        </td>
                                        
                                        {/* Các cột cho ngày được chọn - Hàng 2: Cuối buổi */}
                                        {(() => {
                                          const dayToShow = selectedDay !== null ? selectedDay : (activity.schedule && activity.schedule.length > 0 ? activity.schedule[0].day : null);
                                          if (dayToShow === null) return null;
                                          const selectedScheduleDay = activity.schedule!.find((d: any) => d.day === dayToShow);
                                          if (!selectedScheduleDay) return null;
                                          
                                          return activity.timeSlots!.filter((s: any) => s.isActive).map((slot: any) => {
                                            // Check if participant has registered for this slot
                                            const isRegistered = isSlotRegistered(participant, slot, selectedScheduleDay.day);
                                            
                                            // If not registered, don't render anything here (already rendered with rowSpan in row 1)
                                            if (!isRegistered) {
                                              return null;
                                            }
                                            
                                            const slotEndStatus = getAttendanceStatusWithTime(participant, slot, 'end', selectedScheduleDay.date, selectedScheduleDay.day);
                                            
                                            let statusText = '';
                                            if (slotEndStatus.hasCheckedIn) {
                                              if (slotEndStatus.attendance?.status === 'approved') {
                                                const isManual = isManualCheckInRecord(slotEndStatus.attendance);
                                                const officerName = isManual && slotEndStatus.attendance?.verifiedBy 
                                                  ? getVerifierName(slotEndStatus.attendance.verifiedBy) 
                                                  : null;
                                                statusText = isManual && officerName && officerName !== 'Hệ thống tự động'
                                                  ? `Thủ Công (${officerName})` 
                                                  : (isManual ? 'Thủ Công' : (slotEndStatus.timeStatus === 'on_time' ? 'Đúng' : 'Trễ'));
                                              } else if (slotEndStatus.attendance?.status === 'rejected') {
                                                statusText = 'Từ chối';
                                              } else {
                                                statusText = 'Chờ duyệt';
                                              }
                                            } else {
                                              if (slotEndStatus.timeStatus === 'not_started') {
                                                statusText = 'Chưa đến';
                                              } else if (slotEndStatus.timeStatus === 'in_progress') {
                                                statusText = 'Đang mở';
                                              } else {
                                                statusText = 'Vắng';
                                              }
                                            }
                                            
                                            return (
                                              <td key={`day-${selectedScheduleDay.day}-slot-${slot.id || slot.name}-end`} className={`px-3 py-2.5 text-center border-r-2 ${isDarkMode ? 'border-gray-900' : 'border-black'}`}>
                                                <div className="flex flex-col items-center gap-1.5">
                                                  <div 
                                                    className={`flex items-center justify-center gap-1.5 p-2 rounded transition-opacity w-[100px] ${
                                                      slotEndStatus.hasCheckedIn
                                                        ? slotEndStatus.attendance?.status === 'approved'
                                                          ? slotEndStatus.timeStatus === 'on_time'
                                                            ? isDarkMode ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-100 border border-green-300'
                                                            : isDarkMode ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-orange-100 border border-orange-300'
                                                          : slotEndStatus.attendance?.status === 'rejected'
                                                            ? isDarkMode ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-100 border border-red-300'
                                                            : isDarkMode ? 'bg-amber-500/20 border border-amber-500/30 animate-pulse ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/30' : 'bg-amber-100 border border-amber-300 animate-pulse ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/30'
                                                        : slotEndStatus.timeStatus === 'not_started'
                                                          ? isDarkMode ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-100 border border-blue-300'
                                                          : slotEndStatus.timeStatus === 'in_progress'
                                                            ? isDarkMode ? 'bg-cyan-500/20 border border-cyan-500/30 animate-pulse ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/30' : 'bg-cyan-100 border border-cyan-300 animate-pulse ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/30'
                                                            : isDarkMode ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-100 border border-red-300'
                                                    } ${
                                                      (slotEndStatus.hasCheckedIn && areAllSlotsNotStarted(selectedScheduleDay.date, selectedScheduleDay.day)) || (statusText === 'Vắng' && slotEndStatus.timeStatus === 'not_started')
                                                        ? 'cursor-not-allowed opacity-60'
                                                        : 'cursor-pointer hover:opacity-80'
                                                    }`}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      
                                                      // Check if action is disabled
                                                      const isDisabled = (slotEndStatus.hasCheckedIn && areAllSlotsNotStarted(selectedScheduleDay.date, selectedScheduleDay.day)) || (statusText === 'Vắng' && slotEndStatus.timeStatus === 'not_started');
                                                      
                                                      if (isDisabled) return;
                                                      
                                                      if (slotEndStatus.hasCheckedIn) {
                                                        handleAttendanceClick(participant, slot, 'end', selectedScheduleDay.date, selectedScheduleDay.day);
                                                      } else if (statusText === 'Vắng') {
                                                        setManualCheckInModal({
                                                          open: true,
                                                          participant,
                                                          slot,
                                                          checkInType: 'end',
                                                          slotDate: selectedScheduleDay.date,
                                                          dayNumber: selectedScheduleDay.day
                                                        });
                                                      }
                                                    }}
                                                    title={`Ngày ${selectedScheduleDay.day} - ${slot.name} - Cuối buổi: ${statusText}`}
                                                  >
                                                  {slotEndStatus.hasCheckedIn ? (
                                                    <CheckCircle2 
                                                      size={16} 
                                                      className={
                                                        slotEndStatus.attendance?.status === 'approved'
                                                          ? slotEndStatus.timeStatus === 'on_time' ? 'text-green-500' : 'text-orange-500'
                                                          : slotEndStatus.attendance?.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                                                      } 
                                                      strokeWidth={2.5} 
                                                    />
                                                  ) : (
                                                    slotEndStatus.timeStatus === 'not_started' ? (
                                                      <Clock size={16} className="text-blue-500" strokeWidth={2.5} />
                                                    ) : slotEndStatus.timeStatus === 'in_progress' ? (
                                                      <Clock size={16} className="text-cyan-500" strokeWidth={2.5} />
                                                    ) : (
                                                      <XCircle size={16} className="text-red-500" strokeWidth={2.5} />
                                                    )
                                                  )}
                                                    <span className={`text-[10px] font-semibold ${
                                                      slotEndStatus.hasCheckedIn
                                                        ? slotEndStatus.attendance?.status === 'approved'
                                                          ? slotEndStatus.timeStatus === 'on_time' ? 'text-green-500' : 'text-orange-500'
                                                          : slotEndStatus.attendance?.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                                                        : slotEndStatus.timeStatus === 'not_started' ? 'text-blue-500'
                                                          : slotEndStatus.timeStatus === 'in_progress' ? 'text-cyan-500' : 'text-red-500'
                                                    }`}>
                                                      {statusText}
                                                    </span>
                                                  </div>
                                                </div>
                                              </td>
                                            );
                                          });
                                        })()}
                                        
                                        {/* Cột Thao tác đã dùng rowSpan={2} trong hàng 1, không cần hiển thị lại */}
                                      </tr>
                                  )}
                                  {isExpanded && hasAttendances && (
                                    <tr key={`${participantId}-expanded`}>
                                      <td colSpan={(() => {
                                        if (activity && activity.type === 'single_day' && activity.timeSlots && activity.timeSlots.length > 0) {
                                          return 5 + 1 + activity.timeSlots.filter((s: any) => s.isActive).length + 1; // Checkbox + STT + Người tham gia + Vai trò + % + BUỔI + các slot + Thao tác
                                        } else if (activity && activity.type === 'multiple_days' && activity.schedule && activity.timeSlots && activity.timeSlots.length > 0) {
                                          const activeSlotsCount = activity.timeSlots.filter((s: any) => s.isActive).length;
                                          const daysCount = activity.schedule.length;
                                          return 5 + 1 + (activeSlotsCount * daysCount) + 1; // Checkbox + STT + Người tham gia + Vai trò + % + BUỔI + (các slot * số ngày) + Thao tác
                                        }
                                        return 5;
                                      })()} className={`px-4 py-4 ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                                        <div className="space-y-4">
                                          {participant.attendances!.map((attendance: AttendanceRecord) => (
                                            <div 
                                              key={attendance._id} 
                                              className={`p-4 rounded-lg border cursor-pointer hover:opacity-90 transition-opacity ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                                              onClick={() => setDetailModal({ open: true, attendance, participant })}
                                            >
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
                                                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                                                            isDarkMode ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-orange-100 text-orange-700 border border-orange-300'
                                                          }`}>
                                                            <Clock size={14} strokeWidth={2.5} />
                                                            Trễ
                                                          </span>
                                                        )}
                                                        <span className={`px-3 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1 ${
                                                          attendance.status === 'approved'
                                                            ? isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
                                                            : attendance.status === 'rejected'
                                                            ? isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
                                                            : isDarkMode ? 'bg-amber-500/20 text-amber-300 animate-pulse ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/30' : 'bg-amber-100 text-amber-700 animate-pulse ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/30'
                                                        }`}>
                                                          {attendance.status === 'approved' && (
                                                            <>
                                                              <CheckCircle2 size={14} strokeWidth={2.5} />
                                                              Đã điểm danh
                                                            </>
                                                          )}
                                                          {attendance.status === 'rejected' && (
                                                            <>
                                                              <XCircle size={14} strokeWidth={2.5} />
                                                              Đã từ chối
                                                            </>
                                                          )}
                                                          {attendance.status === 'pending' && (
                                                            <>
                                                              <Loader size={14} strokeWidth={2.5} className="animate-spin" />
                                                              Chờ xác nhận
                                                            </>
                                                          )}
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
                                                          <CheckCircle2 size={18} strokeWidth={2.5} className={isDarkMode ? 'text-green-300' : 'text-green-700'} />
                                                        ) : (
                                                          <XCircle size={18} strokeWidth={2.5} className={isDarkMode ? 'text-red-300' : 'text-red-700'} />
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
                                                            <Clock size={18} strokeWidth={2.5} className={isDarkMode ? 'text-orange-300' : 'text-orange-700'} />
                                                          ) : (
                                                            <CheckCircle2 size={18} strokeWidth={2.5} className={isDarkMode ? 'text-green-300' : 'text-green-700'} />
                                                          )
                                                        ) : (
                                                          <XCircle size={18} strokeWidth={2.5} className={isDarkMode ? 'text-red-300' : 'text-red-700'} />
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
                                                      <p className={`text-xs font-medium mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        <MapPin size={14} strokeWidth={2} />
                                                        Vị trí
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
                                                    <p className={`text-xs font-medium mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                      <Clock size={14} strokeWidth={2} />
                                                      Thời gian điểm danh
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
                                                          <p className={`text-xs font-medium mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            <Clock size={14} strokeWidth={2} />
                                                            Thời gian dự kiến
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
                                                        <Clock size={18} strokeWidth={2.5} className={isDarkMode ? 'text-amber-300' : 'text-amber-700'} />
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
                                                          <p className={`text-xs font-semibold mb-2 flex items-center gap-1 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                                                            <AlertTriangle size={14} strokeWidth={2.5} />
                                                            Điểm danh không hợp lệ - Cần xem xét
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
                                                          {verifyingAttendance.has(attendance._id) ? (
                                                            <>
                                                              <Loader size={14} strokeWidth={2.5} className="animate-spin inline mr-1" />
                                                              Đang xử lý...
                                                            </>
                                                          ) : (
                                                            <>
                                                              <CheckCircle2 size={14} strokeWidth={2.5} className="inline mr-1" />
                                                              Duyệt
                                                            </>
                                                          )}
                                                        </button>
                                                        <button
                                                          onClick={() => handleVerifyAttendance(attendance._id, 'rejected')}
                                                          disabled={verifyingAttendance.has(attendance._id)}
                                                          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                                        >
                                                          {verifyingAttendance.has(attendance._id) ? (
                                                            <>
                                                              <Loader size={14} strokeWidth={2.5} className="animate-spin" />
                                                              Đang xử lý...
                                                            </>
                                                          ) : (
                                                            <>
                                                              <XCircle size={14} strokeWidth={2.5} />
                                                              Từ chối
                                                            </>
                                                          )}
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
                                                          <p className={`text-xs mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            <CheckCircle2 size={14} strokeWidth={2} />
                                                            <span className="font-medium">Đã duyệt bởi:</span> {getVerifierName(attendance.verifiedBy)}
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
                                                        <p className={`text-xs font-semibold mb-2 flex items-center gap-1 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                                                          <AlertTriangle size={14} strokeWidth={2.5} />
                                                          Điểm danh đã được duyệt nhưng không hợp lệ - Có thể điều chỉnh lại
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
                                                          {verifyingAttendance.has(attendance._id) ? (
                                                            <>
                                                              <Loader size={14} strokeWidth={2.5} className="animate-spin inline mr-1" />
                                                              Đang xử lý...
                                                            </>
                                                          ) : (
                                                            <>
                                                              <CheckCircle2 size={14} strokeWidth={2.5} className="inline mr-1" />
                                                              Xác nhận hợp lệ
                                                            </>
                                                          )}
                                                        </button>
                                                        <button
                                                          onClick={() => handleVerifyAttendance(attendance._id, 'rejected')}
                                                          disabled={verifyingAttendance.has(attendance._id) || !verificationNote[attendance._id]?.trim()}
                                                          className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                                          title={!verificationNote[attendance._id]?.trim() ? 'Vui lòng nhập lý do từ chối' : 'Từ chối điểm danh - Đánh dấu không hợp lệ'}
                                                        >
                                                          {verifyingAttendance.has(attendance._id) ? (
                                                            <>
                                                              <Loader size={14} strokeWidth={2.5} className="animate-spin" />
                                                              Đang xử lý...
                                                            </>
                                                          ) : (
                                                            <>
                                                              <XCircle size={14} strokeWidth={2.5} />
                                                              Không hợp lệ
                                                            </>
                                                          )}
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
                                                            <CheckCircle2 size={18} strokeWidth={2.5} className={isDarkMode ? 'text-green-300' : 'text-green-700'} />
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

                        // Filter attendances by selectedDay for multiple_days activities
                        const relevantAttendances = activity && activity.type === 'multiple_days' && selectedDay !== null
                          ? participant.attendances?.filter(att => {
                              const attDayNumber = att.dayNumber;
                              const attSlotDate = att.slotDate ? new Date(att.slotDate).toDateString() : null;
                              const selectedScheduleDay = activity.schedule?.find(s => s.day === selectedDay);
                              const selectedDateStr = selectedScheduleDay ? new Date(selectedScheduleDay.date).toDateString() : null;
                              return attDayNumber === selectedDay || (attSlotDate && selectedDateStr && attSlotDate === selectedDateStr);
                            }) || []
                          : participant.attendances || [];

                        // Get latest attendance for display
                        const latestAttendance = relevantAttendances.length > 0 
                          ? relevantAttendances[relevantAttendances.length - 1]
                          : participant.attendances && participant.attendances.length > 0
                            ? participant.attendances[participant.attendances.length - 1]
                            : null;

                        return (
                          <div
                            key={`${participantId}-${idx}`}
                            className={`rounded-xl border-2 shadow-lg transition-all relative overflow-hidden ${
                              isSelected
                                ? isDarkMode ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20' : 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                                : isDarkMode
                                  ? 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:shadow-xl'
                                  : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-xl'
                            } ${participant.checkedIn ? (isDarkMode ? 'ring-1 ring-green-500/30' : 'ring-1 ring-green-500/20') : ''}`}
                          >
                            {/* STT Badge */}
                            <div className="absolute top-2 right-2 z-10">
                              <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shadow-md ${
                                isDarkMode ? 'bg-gray-900/90 text-white border border-gray-700' : 'bg-black/90 text-white border border-gray-800'
                              }`}>
                                {idx + 1}
                              </div>
                            </div>
                            <div className="p-4">
                              {/* Header Section */}
                              <div className={`rounded-lg p-3 mb-3 bg-gradient-to-br ${
                                isDarkMode ? 'from-gray-700/50 to-gray-800/50' : 'from-gray-50 to-white'
                              } border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <div className="flex items-start gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectParticipant(participantId)}
                                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold bg-gradient-to-br ${config.gradient} text-white shadow-sm border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                    {getInitials(participant.name)}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <h3 className={`font-bold text-sm mb-0.5 truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {participant.name}
                                    </h3>
                                    <p className={`text-[11px] truncate mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {participant.email}
                                    </p>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} ${config.bg} ${config.color}`}>
                                      <config.icon size={12} strokeWidth={2.5} /> {participant.role}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Overall Attendance Percentage Section */}
                              <div className={`rounded-lg p-3 mb-3 border ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex flex-col items-center gap-1.5">
                                  <div className={`text-[10px] font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Tỷ lệ tham gia
                                  </div>
                                  {(() => {
                                    // For multiple_days, calculate only for selected day
                                    const selectedDayForCalc = activity && activity.type === 'multiple_days' ? selectedDay : null;
                                    const overallStats = calculateOverallAttendancePercentage(participant, selectedDayForCalc);
                                    const overallPercentage = overallStats.percentage;
                                    const completedSessions = overallStats.completed;
                                    const totalSessions = overallStats.total;
                                    
                                    return (
                                      <div className="flex flex-col items-center gap-1">
                                        {/* Circular Progress */}
                                        <div className="relative w-14 h-14">
                                          <svg className="transform -rotate-90 w-14 h-14">
                                            {/* Background circle */}
                                            <circle
                                              cx="28"
                                              cy="28"
                                              r="24"
                                              fill="none"
                                              stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                                              strokeWidth="4"
                                            />
                                            {/* Progress circle */}
                                            <circle
                                              cx="28"
                                              cy="28"
                                              r="24"
                                              fill="none"
                                              stroke={
                                                overallPercentage >= 80
                                                  ? '#10b981' // green-500
                                                  : overallPercentage >= 50
                                                    ? '#eab308' // yellow-500
                                                    : overallPercentage > 0
                                                      ? '#f97316' // orange-500
                                                      : '#6b7280' // gray-500
                                              }
                                              strokeWidth="4"
                                              strokeLinecap="round"
                                              strokeDasharray={`${2 * Math.PI * 24}`}
                                              strokeDashoffset={`${2 * Math.PI * 24 * (1 - overallPercentage / 100)}`}
                                              className="transition-all duration-500"
                                            />
                                          </svg>
                                          {/* Percentage text in center */}
                                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className={`text-xs font-bold leading-tight ${
                                              overallPercentage >= 80
                                                ? isDarkMode ? 'text-green-400' : 'text-green-600'
                                                : overallPercentage >= 50
                                                  ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                                                  : overallPercentage > 0
                                                    ? isDarkMode ? 'text-orange-400' : 'text-orange-600'
                                                    : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                            }`}>
                                              {overallPercentage}%
                                            </span>
                                          </div>
                                        </div>
                                        {/* Fraction below */}
                                        <div className={`text-[9px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                          {completedSessions}/{totalSessions}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Time/Slot Information Section - All Sessions */}
                              <div className={`rounded-lg p-3 mb-3 border ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className={`text-[10px] font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {activity && activity.type === 'multiple_days' && selectedDay !== null ? `Tất cả các buổi (Ngày ${selectedDay})` : 'Tất cả các buổi'}
                                  </div>
                                  {activity && activity.timeSlots && activity.timeSlots.length > 0 && (
                                    <button
                                      onClick={() => toggleRowExpansion(participantId)}
                                      className={`text-[9px] px-2 py-1 rounded font-medium transition-all ${
                                        isDarkMode 
                                          ? isExpanded ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                                          : isExpanded ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                      }`}
                                    >
                                      {isExpanded ? '▲ Thu gọn' : '▼ Xem chi tiết'}
                                    </button>
                                  )}
                                </div>
                                {activity && activity.timeSlots && activity.timeSlots.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {activity.timeSlots.filter((slot: any) => slot.isActive).map((slot: any) => {
                                      // Check if participant has registered for this slot
                                      const dayNumber = activity.type === 'multiple_days' && selectedDay !== null ? selectedDay : undefined;
                                      const isRegistered = isSlotRegistered(participant, slot, dayNumber);
                                      
                                      // If not registered, show "Không đăng ký"
                                      if (!isRegistered) {
                                        return (
                                          <div 
                                            key={slot.id || slot.name}
                                            className={`p-1.5 rounded border ${isDarkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50'}`}
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <div className={`px-1.5 py-0.5 rounded text-[9px] font-medium flex-shrink-0 ${
                                                isDarkMode ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-200 text-gray-500'
                                              }`}>
                                                {slot.name}
                                              </div>
                                              <div className="flex items-center gap-1.5 flex-1 justify-end">
                                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                                  isDarkMode ? 'bg-gray-700/30 text-gray-400' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                  <XCircle size={10} strokeWidth={2.5} />
                                                  <span>Không đăng ký</span>
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      }
                                      
                                      // Get attendance status for this slot
                                      let slotCount = { count: 0, total: 2 };
                                      let hasPending = false;
                                      
                                      if (activity.type === 'multiple_days' && selectedDay !== null) {
                                        // For multiple_days, get status for selected day
                                        const selectedScheduleDay = activity.schedule?.find((s: any) => s.day === selectedDay);
                                        if (selectedScheduleDay) {
                                          const dayNumber = selectedScheduleDay.day;
                                          const dayDateStr = typeof selectedScheduleDay.date === 'string' 
                                            ? selectedScheduleDay.date 
                                            : new Date(selectedScheduleDay.date).toISOString();
                                          
                                          const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', dayDateStr, dayNumber);
                                          const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', dayDateStr, dayNumber);
                                          
                                          if (startStatus.hasCheckedIn && startStatus.attendance?.status === 'approved') {
                                            slotCount.count++;
                                          } else if (startStatus.hasCheckedIn && startStatus.attendance?.status === 'pending') {
                                            hasPending = true;
                                          }
                                          
                                          if (endStatus.hasCheckedIn && endStatus.attendance?.status === 'approved') {
                                            slotCount.count++;
                                          } else if (endStatus.hasCheckedIn && endStatus.attendance?.status === 'pending') {
                                            hasPending = true;
                                          }
                                        }
                                      } else {
                                        // For single_day
                                        slotCount = getSlotAttendanceCount(participant, slot);
                                        // Check for pending
                                        const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', activity.date);
                                        const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', activity.date);
                                        hasPending = (startStatus.hasCheckedIn && startStatus.attendance?.status === 'pending') ||
                                                    (endStatus.hasCheckedIn && endStatus.attendance?.status === 'pending');
                                      }
                                      
                                      const isComplete = slotCount.count === slotCount.total;
                                      const isPartial = slotCount.count > 0 && slotCount.count < slotCount.total;
                                      
                                      return (
                                        <div 
                                          key={slot.id || slot.name}
                                          className={`p-1.5 rounded border ${isDarkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-300 bg-white'}`}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <div className={`px-1.5 py-0.5 rounded text-[9px] font-medium flex-shrink-0 ${
                                            isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                                          }`}>
                                              {slot.name}
                                          </div>
                                            <div className="flex items-center gap-1.5 flex-1 justify-end">
                                              {isComplete ? (
                                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                                  isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
                                                }`}>
                                                  <CheckCircle2 size={10} strokeWidth={2.5} />
                                                  <span>{slotCount.count}/{slotCount.total}</span>
                                                </span>
                                              ) : isPartial ? (
                                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                                  isDarkMode ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                  <AlertTriangle size={10} strokeWidth={2.5} />
                                                  <span>{slotCount.count}/{slotCount.total}</span>
                                                </span>
                                              ) : (
                                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                                  isDarkMode ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                  <XCircle size={10} strokeWidth={2.5} />
                                                  <span>0/{slotCount.total}</span>
                                                </span>
                                              )}
                                              {hasPending && (
                                                <Loader size={10} strokeWidth={2.5} className="animate-spin text-amber-500" />
                                              )}
                                          </div>
                                        </div>
                                        </div>
                                      );
                                    })}
                                    </div>
                                  ) : (
                                  <div className={`p-2 rounded border ${isDarkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-300 bg-white'}`}>
                                    <span className={`text-[10px] font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                      Chưa có thông tin buổi
                                      </span>
                                    </div>
                                  )}
                                
                                {/* Expanded Details - Show slot buttons like table view */}
                                {isExpanded && activity && activity.timeSlots && activity.timeSlots.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                                    <div className={`text-[9px] font-semibold uppercase tracking-wide mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      Chi tiết từng buổi
                                </div>
                                    {activity.timeSlots.filter((slot: any) => slot.isActive).map((slot: any) => {
                                      // Check if participant has registered for this slot
                                      const dayNumber = activity.type === 'multiple_days' && selectedDay !== null ? selectedDay : undefined;
                                      const isRegistered = isSlotRegistered(participant, slot, dayNumber);
                                      
                                      // Determine activity date and day number
                                      const activityDateStr = activity.type === 'multiple_days' && selectedDay !== null
                                        ? (() => {
                                            const selectedScheduleDay = activity.schedule?.find((s: any) => s.day === selectedDay);
                                            if (selectedScheduleDay) {
                                              return typeof selectedScheduleDay.date === 'string' 
                                                ? selectedScheduleDay.date 
                                                : new Date(selectedScheduleDay.date).toISOString();
                                            }
                                            return activity.date || new Date().toISOString();
                                          })()
                                        : (activity.date || new Date().toISOString());
                                      
                                      // If not registered, show "Không đăng ký" for both start and end
                                      if (!isRegistered) {
                                        return (
                                          <div key={slot.id || slot.name} className={`p-2 rounded border ${isDarkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50'}`}>
                                            <div className={`text-[9px] font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                              {slot.name}
                                            </div>
                                            <div className="space-y-1">
                                              <div className={`flex items-center justify-center gap-1.5 p-1.5 rounded w-full ${isDarkMode ? 'bg-gray-700/30 border border-gray-600/50' : 'bg-gray-100 border border-gray-300'}`}>
                                                <XCircle size={14} className="text-gray-400" strokeWidth={2.5} />
                                                <span className="text-[9px] font-semibold text-gray-400">Đầu: Không đăng ký</span>
                                              </div>
                                              <div className={`flex items-center justify-center gap-1.5 p-1.5 rounded w-full ${isDarkMode ? 'bg-gray-700/30 border border-gray-600/50' : 'bg-gray-100 border border-gray-300'}`}>
                                                <XCircle size={14} className="text-gray-400" strokeWidth={2.5} />
                                                <span className="text-[9px] font-semibold text-gray-400">Cuối: Không đăng ký</span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      }
                                      
                                      // Get status for start and end
                                      const slotStartStatus = getAttendanceStatusWithTime(participant, slot, 'start', activityDateStr, dayNumber);
                                      const slotEndStatus = getAttendanceStatusWithTime(participant, slot, 'end', activityDateStr, dayNumber);
                                      
                                      // Helper to render slot button
                                      const renderSlotButton = (checkInType: 'start' | 'end', status: ReturnType<typeof getAttendanceStatusWithTime>) => {
                                        let statusText = '';
                                        if (status.hasCheckedIn) {
                                          if (status.attendance?.status === 'approved') {
                                            const isManual = isManualCheckInRecord(status.attendance);
                                            const officerName = isManual && status.attendance?.verifiedBy 
                                              ? getVerifierName(status.attendance.verifiedBy) 
                                              : null;
                                            statusText = isManual && officerName && officerName !== 'Hệ thống tự động'
                                              ? `Thủ Công` 
                                              : (isManual ? 'Thủ Công' : (status.timeStatus === 'on_time' ? 'Đúng' : 'Trễ'));
                                          } else if (status.attendance?.status === 'rejected') {
                                            statusText = 'Từ chối';
                                          } else {
                                            statusText = 'Chờ duyệt';
                                          }
                                        } else {
                                          if (status.timeStatus === 'not_started') {
                                            statusText = 'Chưa đến';
                                          } else if (status.timeStatus === 'in_progress') {
                                            statusText = 'Đang mở';
                                          } else {
                                            statusText = 'Vắng';
                                          }
                                        }
                                        
                                        const isDisabled = (status.hasCheckedIn && activity.type === 'multiple_days' && selectedDay !== null
                                          ? areAllSlotsNotStarted(activityDateStr, selectedDay)
                                          : (status.hasCheckedIn && activity.type === 'single_day'
                                            ? areAllSlotsNotStarted(activityDateStr)
                                            : false)) || (statusText === 'Vắng' && status.timeStatus === 'not_started');
                                        
                                      return (
                                          <div 
                                            key={`${slot.id || slot.name}-${checkInType}`}
                                            className={`flex items-center justify-center gap-1.5 p-1.5 rounded transition-opacity w-full ${
                                              status.hasCheckedIn
                                                ? status.attendance?.status === 'approved'
                                                  ? status.timeStatus === 'on_time'
                                                    ? isDarkMode ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-100 border border-green-300'
                                                    : isDarkMode ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-orange-100 border border-orange-300'
                                                  : status.attendance?.status === 'rejected'
                                                    ? isDarkMode ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-100 border border-red-300'
                                                    : isDarkMode ? 'bg-amber-500/20 border border-amber-500/30 animate-pulse ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/30' : 'bg-amber-100 border border-amber-300 animate-pulse ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/30'
                                                : status.timeStatus === 'not_started'
                                                  ? isDarkMode ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-100 border border-blue-300'
                                                  : status.timeStatus === 'in_progress'
                                                    ? isDarkMode ? 'bg-cyan-500/20 border border-cyan-500/30 animate-pulse ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/30' : 'bg-cyan-100 border border-cyan-300 animate-pulse ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/30'
                                                    : isDarkMode ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-100 border border-red-300'
                                            } ${
                                              isDisabled
                                                ? 'cursor-not-allowed opacity-60'
                                                : 'cursor-pointer hover:opacity-80'
                                            }`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (isDisabled) return;
                                              
                                              if (status.hasCheckedIn) {
                                                handleAttendanceClick(participant, slot, checkInType, activityDateStr, dayNumber);
                                              } else if (statusText === 'Vắng') {
                                                // Open manual check-in modal
                                                if (activity.type === 'multiple_days' && selectedDay !== null && activity.schedule) {
                                                  const selectedScheduleDay = activity.schedule.find((s: any) => s.day === selectedDay);
                                                  if (selectedScheduleDay) {
                                                    setManualCheckInModal({
                                                      open: true,
                                                      participant,
                                                      slot,
                                                      checkInType,
                                                      slotDate: selectedScheduleDay.date,
                                                      dayNumber: selectedDay
                                                    });
                                                  }
                                                } else {
                                                  setManualCheckInModal({
                                                    open: true,
                                                    participant,
                                                    slot,
                                                    checkInType
                                                  });
                                                }
                                              }
                                            }}
                                            title={`${slot.name} - ${checkInType === 'start' ? 'Đầu buổi' : 'Cuối buổi'}: ${statusText}`}
                                          >
                                            {status.hasCheckedIn ? (
                                              <CheckCircle2 
                                                size={14} 
                                                className={
                                                  status.attendance?.status === 'approved'
                                                    ? status.timeStatus === 'on_time' ? 'text-green-500' : 'text-orange-500'
                                                    : status.attendance?.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                                                } 
                                                strokeWidth={2.5} 
                                              />
                                            ) : (
                                              status.timeStatus === 'not_started' ? (
                                                <Clock size={14} className="text-blue-500" strokeWidth={2.5} />
                                              ) : status.timeStatus === 'in_progress' ? (
                                                <Clock size={14} className="text-cyan-500" strokeWidth={2.5} />
                                              ) : (
                                                <XCircle size={14} className="text-red-500" strokeWidth={2.5} />
                                              )
                                            )}
                                            <span className={`text-[9px] font-semibold ${
                                              status.hasCheckedIn
                                                ? status.attendance?.status === 'approved'
                                                  ? status.timeStatus === 'on_time' ? 'text-green-500' : 'text-orange-500'
                                                  : status.attendance?.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                                                : status.timeStatus === 'not_started' ? 'text-blue-500'
                                                  : status.timeStatus === 'in_progress' ? 'text-cyan-500' : 'text-red-500'
                                            }`}>
                                              {checkInType === 'start' ? 'Đầu' : 'Cuối'}: {statusText}
                                            </span>
                                        </div>
                                      );
                                      };
                                      
                                      return (
                                        <div key={slot.id || slot.name} className={`p-2 rounded border ${isDarkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50'}`}>
                                          <div className={`text-[9px] font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {slot.name}
                                            </div>
                                          <div className="space-y-1">
                                            {renderSlotButton('start', slotStartStatus)}
                                            {renderSlotButton('end', slotEndStatus)}
                                            </div>
                                        </div>
                                      );
                                    })}
                                        </div>
                                )}
                              </div>

                              {relevantAttendances.length > 0 && (
                                <div className="mb-3">
                                  <button
                                    onClick={() => toggleRowExpansion(participantId)}
                                    className={`w-full text-[10px] px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                                      isDarkMode 
                                        ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' 
                                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                    }`}
                                  >
                                    {isExpanded ? '▲ Thu gọn' : '▼ Xem chi tiết (' + relevantAttendances.length + ')'}
                                  </button>
                                </div>
                              )}
                              
                              {isExpanded && relevantAttendances.length > 0 && (
                                <div className="mb-3 space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
                                  {relevantAttendances.map((attendance: AttendanceRecord) => (
                                    <div 
                                      key={attendance._id} 
                                      className={`p-2.5 rounded-lg border cursor-pointer hover:opacity-90 transition-opacity ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                                      onClick={() => setDetailModal({ open: true, attendance, participant })}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-[10px] font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                            {attendance.timeSlot} - {attendance.checkInType === 'start' ? 'Đầu' : 'Cuối'}
                                          </p>
                                          <p className={`text-[9px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {new Date(attendance.checkInTime).toLocaleString('vi-VN', {
                                              day: '2-digit',
                                              month: '2-digit',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </p>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end ml-2">
                                          {(() => {
                                            const timeValidation = validateTime(attendance);
                                            const isLate = attendance.lateReason || (timeValidation.valid && timeValidation.isLate === true);
                                            
                                            return (
                                              <>
                                                {isLate && (
                                                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                                    isDarkMode ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-orange-100 text-orange-700 border border-orange-300'
                                                  }`}>
                                                    <Clock size={10} strokeWidth={2.5} />
                                                    Trễ
                                                  </span>
                                                )}
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium inline-flex items-center gap-0.5 ${
                                                  attendance.status === 'approved'
                                                    ? isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
                                                    : attendance.status === 'rejected'
                                                    ? isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
                                                    : isDarkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                  {attendance.status === 'approved' && (
                                                    <>
                                                      <CheckCircle2 size={10} strokeWidth={2.5} />
                                                      <span>Đã duyệt</span>
                                                    </>
                                                  )}
                                                  {attendance.status === 'rejected' && (
                                                    <>
                                                      <XCircle size={10} strokeWidth={2.5} />
                                                      <span>Từ chối</span>
                                                    </>
                                                  )}
                                                  {attendance.status === 'pending' && (
                                                    <>
                                                      <Loader size={10} strokeWidth={2.5} className="animate-spin" />
                                                      <span>Chờ</span>
                                                    </>
                                                  )}
                                                </span>
                                              </>
                                            );
                                          })()}
                                        </div>
                                      </div>

                                      {/* Validation Info - Compact */}
                                      {(() => {
                                        const locationValidation = validateLocation(attendance);
                                        const timeValidation = validateTime(attendance);
                                        const isValid = locationValidation.valid && timeValidation.valid;
                                        
                                        return (
                                          <div className="flex items-center gap-1.5 mb-2">
                                            {isValid ? (
                                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                                timeValidation.isLate
                                                  ? isDarkMode ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'
                                                  : isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
                                              }`}>
                                                {timeValidation.isLate ? (
                                                  <Clock size={10} strokeWidth={2.5} />
                                                ) : (
                                                  <CheckCircle2 size={10} strokeWidth={2.5} />
                                                )}
                                                {timeValidation.isLate ? 'Trễ' : 'Hợp lệ'}
                                              </span>
                                            ) : (
                                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                                isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
                                              }`}>
                                                <XCircle size={10} strokeWidth={2.5} />
                                                Không hợp lệ
                                              </span>
                                            )}
                                                  {locationValidation.distance !== undefined && (
                                              <span className={`text-[9px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {locationValidation.distance.toFixed(0)}m
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })()}
                                      
                                      {/* Photo and Location - Compact */}
                                      <div className="flex gap-2 mb-2">
                                      {attendance.photoUrl && (
                                          <div 
                                            className="relative group cursor-pointer rounded overflow-hidden border border-gray-300 dark:border-gray-600 flex-shrink-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setViewingImage(attendance.photoUrl || null);
                                            }}
                                          >
                                            <img
                                              src={attendance.photoUrl}
                                              alt={`Điểm danh ${attendance.timeSlot}`}
                                              className="w-16 h-16 object-cover hover:opacity-90 transition-opacity"
                                            />
                                        </div>
                                      )}
                                      {attendance.location && (
                                          <div className="flex-1 min-w-0">
                                            <p className={`text-[9px] font-medium mb-0.5 flex items-center gap-0.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                              <MapPin size={10} strokeWidth={2} />
                                            Vị trí
                                          </p>
                                            <p className={`text-[9px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                              {attendance.location.address || `${attendance.location.lat.toFixed(4)}, ${attendance.location.lng.toFixed(4)}`}
                                          </p>
                                        </div>
                                      )}
                                            </div>

                                      {/* Late Reason from Student - Compact */}
                                      {attendance.lateReason && (
                                        <div className={`mb-2 p-1.5 rounded border text-[9px] ${
                                          isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                                        }`}>
                                          <div className="flex items-start gap-1">
                                            <Clock size={10} strokeWidth={2.5} className={`mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`} />
                                            <div className="flex-1 min-w-0">
                                              <p className={`font-semibold mb-0.5 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                                                Lý do trễ
                                              </p>
                                              <p className={`leading-relaxed line-clamp-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
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
                                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                              {/* Show validation errors if invalid */}
                                              {isInvalid && (
                                                <div className={`mb-1.5 p-1.5 rounded border text-[9px] ${
                                                  isDarkMode ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200'
                                                }`}>
                                                  <p className={`font-semibold mb-0.5 flex items-center gap-0.5 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                                                    <AlertTriangle size={10} strokeWidth={2.5} />
                                                    Không hợp lệ
                                                  </p>
                                                  {!locationValidation.valid && (
                                                    <p className={`mb-0.5 ${isDarkMode ? 'text-orange-200' : 'text-orange-600'}`}>
                                                      • {locationValidation.message || 'Vị trí không hợp lệ'}
                                                    </p>
                                                  )}
                                                  {!timeValidation.valid && (
                                                    <p className={`${isDarkMode ? 'text-orange-200' : 'text-orange-600'}`}>
                                                      • {timeValidation.message || 'Thời gian không hợp lệ'}
                                                    </p>
                                                  )}
                                                </div>
                                              )}
                                              
                                              <label className={`block text-[9px] font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                {isPending ? 'Xác nhận' : 'Xem xét'}
                                                {isInvalid && <span className="text-red-500"> *</span>}
                                              </label>
                                              <textarea
                                                placeholder={isInvalid ? "Lý do (bắt buộc)..." : "Ghi chú..."}
                                                value={verificationNote[attendance._id] || ''}
                                                onChange={(e) => setVerificationNote(prev => ({
                                                  ...prev,
                                                  [attendance._id]: e.target.value
                                                }))}
                                                onClick={(e) => e.stopPropagation()}
                                                className={`w-full px-1.5 py-1 rounded text-[9px] border resize-none mb-1.5 ${
                                                  isDarkMode 
                                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                                } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                                rows={2}
                                              />
                                              <div className="flex gap-1">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleVerifyAttendance(attendance._id, 'approved');
                                                  }}
                                                  disabled={verifyingAttendance.has(attendance._id) || (isInvalid && !verificationNote[attendance._id]?.trim())}
                                                  className="flex-1 px-1.5 py-1 rounded text-[9px] font-medium bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                                  title={isInvalid && !verificationNote[attendance._id]?.trim() ? 'Vui lòng nhập lý do duyệt' : ''}
                                                >
                                                  <CheckCircle2 size={10} strokeWidth={2.5} />
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleVerifyAttendance(attendance._id, 'rejected');
                                                  }}
                                                  disabled={verifyingAttendance.has(attendance._id)}
                                                  className="flex-1 px-1.5 py-1 rounded text-[9px] font-medium bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                                >
                                                  <XCircle size={10} strokeWidth={2.5} />
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        }
                                        
                                        // If approved but invalid, show minimal adjustment option
                                        if (isApprovedButInvalid) {
                                          return (
                                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                              <div className={`mb-1.5 p-1.5 rounded border text-[9px] ${
                                                isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                                              }`}>
                                                <p className={`font-semibold flex items-center gap-0.5 ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                                                  <CheckCircle2 size={10} strokeWidth={2.5} />
                                                  Đã duyệt {attendance.verifiedBy && ` • ${getVerifierName(attendance.verifiedBy)}`}
                                                </p>
                                              </div>
                                              <div className={`mb-1.5 p-1.5 rounded border text-[9px] ${
                                                isDarkMode ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200'
                                              }`}>
                                                <p className={`mb-1 flex items-center gap-0.5 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                                                  <AlertTriangle size={10} strokeWidth={2.5} />
                                                  Không hợp lệ
                                                </p>
                                                <textarea
                                                  placeholder="Lý do..."
                                                  value={verificationNote[attendance._id] || ''}
                                                  onChange={(e) => setVerificationNote(prev => ({
                                                    ...prev,
                                                    [attendance._id]: e.target.value
                                                  }))}
                                                  onClick={(e) => e.stopPropagation()}
                                                  className={`w-full px-1.5 py-1 rounded border resize-none mb-1.5 ${
                                                    isDarkMode 
                                                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                                  rows={2}
                                                />
                                                <div className="flex gap-1">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleVerifyAttendance(attendance._id, 'approved');
                                                    }}
                                                    disabled={verifyingAttendance.has(attendance._id) || !verificationNote[attendance._id]?.trim()}
                                                    className="flex-1 px-1.5 py-1 rounded text-[9px] font-medium bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                                    title="Xác nhận hợp lệ"
                                                  >
                                                    <CheckCircle2 size={10} strokeWidth={2.5} />
                                                  </button>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleVerifyAttendance(attendance._id, 'rejected');
                                                    }}
                                                    disabled={verifyingAttendance.has(attendance._id) || !verificationNote[attendance._id]?.trim()}
                                                    className="flex-1 px-1.5 py-1 rounded text-[9px] font-medium bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                                    title="Đánh dấu không hợp lệ"
                                                  >
                                                    <XCircle size={10} strokeWidth={2.5} />
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }
                                        
                                        // Show simple readonly info if approved and valid
                                        if (isApproved && !isInvalid) {
                                          return (
                                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                              <div className={`p-1.5 rounded border text-[9px] ${
                                                isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                                              }`}>
                                                <div className="flex items-center justify-between">
                                                  <div>
                                                    <p className={`font-bold flex items-center gap-0.5 ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                                                      <CheckCircle2 size={10} strokeWidth={2.5} />
                                                      Đã duyệt
                                                    </p>
                                                  {attendance.verifiedBy && (
                                                      <p className={`mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                      {getVerifierName(attendance.verifiedBy)}
                                                    </p>
                                                  )}
                                                  </div>
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (participant.checkedIn) {
                                    // Show cancel modal for canceling attendance
                                    const participantId = typeof participant.userId === 'object' && participant.userId !== null
                                      ? participant.userId._id || String(participant.userId)
                                      : String(participant.userId);
                                    setCancelModal({ 
                                      open: true, 
                                      attendanceId: null, 
                                      participantId: participantId,
                                      selectedDay: activity && activity.type === 'multiple_days' ? selectedDay : null
                                    });
                                    setCancelReason('');
                                  } else {
                                    // Open confirmation modal for check-in all missing sessions
                                    // For multiple_days, only check-in for selected day
                                    setConfirmCheckInAllSessionsModal({
                                      open: true,
                                      participant,
                                      selectedDay: activity && activity.type === 'multiple_days' ? selectedDay : null
                                    });
                                  }
                                }}
                                disabled={processing.has(typeof participant.userId === 'object' && participant.userId !== null
                                  ? participant.userId._id || String(participant.userId)
                                  : String(participant.userId))}
                                className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all shadow-sm ${
                                  participant.checkedIn
                                    ? isDarkMode 
                                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5`}
                              >
                                {processing.has(typeof participant.userId === 'object' && participant.userId !== null
                                  ? participant.userId._id || String(participant.userId)
                                  : String(participant.userId)) ? (
                                  <>
                                    <Loader size={12} strokeWidth={2.5} className="animate-spin" />
                                    <span>Đang xử lý...</span>
                                  </>
                                ) : participant.checkedIn ? (
                                  <>
                                    <X size={12} strokeWidth={2.5} />
                                    <span>Hủy điểm danh</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckSquare size={12} strokeWidth={2.5} />
                                    <span>Điểm danh thủ công</span>
                                  </>
                                )}
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
                      <Users size={32} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={1.5} />
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
          </div>
        </main>

        <Footer isDarkMode={isDarkMode} />
        
        {/* Image Modal */}
        <ImageModal 
          imageUrl={viewingImage}
          isOpen={!!viewingImage}
          onClose={() => setViewingImage(null)}
        />

        {/* Confirm Check-in All Sessions Modal */}
        {confirmCheckInAllSessionsModal.open && confirmCheckInAllSessionsModal.participant && (
          <div 
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setConfirmCheckInAllSessionsModal({ open: false, participant: null, selectedDay: null });
                setSelectedSessions(new Set());
              }
            }}
          >
            <div className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                  }`}>
                    <AlertTriangle size={24} strokeWidth={2.5} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {confirmCheckInAllSessionsModal.selectedDay !== null && confirmCheckInAllSessionsModal.selectedDay !== undefined
                        ? `Xác nhận điểm danh tất cả buổi - Ngày ${confirmCheckInAllSessionsModal.selectedDay}`
                        : 'Xác nhận điểm danh tất cả buổi'
                      }
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {confirmCheckInAllSessionsModal.selectedDay !== null && confirmCheckInAllSessionsModal.selectedDay !== undefined
                        ? `Bạn có chắc chắn muốn điểm danh tất cả các buổi chưa điểm danh cho người này trong ngày ${confirmCheckInAllSessionsModal.selectedDay}?`
                        : 'Bạn có chắc chắn muốn điểm danh tất cả các buổi chưa điểm danh cho người này?'
                      }
                    </p>
                  </div>
                </div>

                {(() => {
                  // Calculate missing check-ins for selected day only (if multiple_days)
                  const missingInfo = calculateMissingCheckIns(confirmCheckInAllSessionsModal.participant, confirmCheckInAllSessionsModal.selectedDay);
                  const participantId = typeof confirmCheckInAllSessionsModal.participant.userId === 'object' && confirmCheckInAllSessionsModal.participant.userId !== null
                    ? confirmCheckInAllSessionsModal.participant.userId._id || String(confirmCheckInAllSessionsModal.participant.userId)
                    : String(confirmCheckInAllSessionsModal.participant.userId);
                  const isProcessingParticipant = processing.has(participantId);

                  // Initialize selectedSessions when modal opens - use useEffect-like logic
                  const allSessionKeys = missingInfo.sessions.map(s => s.key);
                  const isAllSelected = allSessionKeys.length > 0 && allSessionKeys.every(key => selectedSessions.has(key));
                  
                  // Helper to get time status for a session
                  const getSessionTimeStatus = (session: typeof missingInfo.sessions[0]): 'not_started' | 'in_progress' | 'past' => {
                    if (!activity || !session.slot) return 'past';
                    
                    let activityDateStr: string;
                    if (activity.type === 'single_day') {
                      activityDateStr = activity.date;
                    } else if (session.slotDate) {
                      activityDateStr = typeof session.slotDate === 'string' ? session.slotDate : new Date(session.slotDate).toISOString().split('T')[0];
                    } else if (session.dayDate) {
                      activityDateStr = session.dayDate instanceof Date ? session.dayDate.toISOString().split('T')[0] : String(session.dayDate);
                    } else {
                      return 'past';
                    }
                    
                    return getTimeStatus(session.slot, activityDateStr, session.checkInType);
                  };

                  const toggleSession = (key: string) => {
                    setSelectedSessions(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(key)) {
                        newSet.delete(key);
                      } else {
                        newSet.add(key);
                      }
                      return newSet;
                    });
                  };

                  const toggleAllSessions = () => {
                    if (isAllSelected) {
                      // Deselect all
                      setSelectedSessions(new Set());
                    } else {
                      // Select all sessions (including "not_started" ones)
                      setSelectedSessions(new Set(missingInfo.sessions.map(s => s.key)));
                    }
                  };

                  const selectedCount = selectedSessions.size;

                  if (missingInfo.count === 0) {
                    return (
                      <>
                        <div className={`mb-4 p-4 rounded-lg ${
                          isDarkMode ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200'
                        }`}>
                          <p className={`text-sm font-semibold flex items-center gap-1 ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                            <CheckCircle2 size={16} strokeWidth={2.5} />
                            Đã điểm danh đầy đủ
                          </p>
                          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {confirmCheckInAllSessionsModal.participant.name} đã điểm danh đầy đủ {confirmCheckInAllSessionsModal.selectedDay !== null && confirmCheckInAllSessionsModal.selectedDay !== undefined
                              ? `tất cả các buổi trong ngày ${confirmCheckInAllSessionsModal.selectedDay}`
                              : 'tất cả các buổi'
                            }.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setConfirmCheckInAllSessionsModal({ open: false, participant: null, selectedDay: null });
                            setSelectedSessions(new Set());
                          }}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
                            isDarkMode 
                              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          >
                            Đóng
                          </button>
                        </div>
                      </>
                    );
                  }

                  return (
                    <>
                      <div className={`mb-4 p-4 rounded-lg ${
                        isDarkMode ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
                      }`}>
                        <p className={`text-sm font-semibold mb-2 flex items-center gap-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                          <AlertTriangle size={16} strokeWidth={2.5} />
                          Thông tin điểm danh
                        </p>
                        <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          <span className="font-semibold">{confirmCheckInAllSessionsModal.participant.name}</span> sẽ được điểm danh thủ công cho <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedCount}/{missingInfo.count} lượt điểm danh</span> đã chọn.
                        </p>
                        {missingInfo.sessions.length > 0 && (
                          <div className={`mt-3 rounded border ${
                            isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-white border-gray-200'
                          }`}>
                            <div className={`p-2 border-b flex items-center justify-between ${
                              isDarkMode ? 'border-gray-600' : 'border-gray-200'
                            }`}>
                              <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Chọn các buổi cần điểm danh:
                              </span>
                              <button
                                onClick={toggleAllSessions}
                                className={`text-xs px-2 py-1 rounded transition-all ${
                                  isDarkMode 
                                    ? 'text-blue-400 hover:bg-blue-500/20' 
                                    : 'text-blue-600 hover:bg-blue-50'
                                }`}
                              >
                                {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                              </button>
                            </div>
                            <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                              {missingInfo.sessions.map((session) => {
                                const timeStatus = getSessionTimeStatus(session);
                                const isNotStarted = timeStatus === 'not_started';
                                const isSelected = selectedSessions.has(session.key);
                                
                                return (
                                  <label
                                    key={session.key}
                                    className={`flex items-start gap-2 px-2 py-1.5 rounded transition-all cursor-pointer ${
                                      isDarkMode 
                                        ? isSelected
                                          ? 'bg-blue-500/20 text-blue-300'
                                          : 'hover:bg-gray-600/30 text-gray-300'
                                        : isSelected
                                          ? 'bg-blue-50 text-blue-700'
                                          : 'hover:bg-gray-50 text-gray-700'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSession(session.key)}
                                      className={`w-4 h-4 rounded border-2 mt-0.5 ${
                                        isDarkMode
                                          ? 'border-gray-500 text-blue-500 focus:ring-blue-400'
                                          : 'border-gray-300 text-blue-600 focus:ring-blue-500'
                                      } focus:ring-2 focus:ring-offset-0 cursor-pointer`}
                                    />
                                    <div className="flex-1 flex flex-col gap-0.5">
                                      <span className="text-xs">{session.label}</span>
                                      {isNotStarted && (
                                        <span className={`text-[10px] flex items-center gap-1 ${
                                          isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                                        }`}>
                                          <Clock size={10} strokeWidth={2} />
                                          Chưa đến thời gian điểm danh
                                        </span>
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={`mb-4 p-3 rounded-lg ${
                        isDarkMode ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'
                      }`}>
                        <p className={`text-xs ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                          <span className="font-semibold">Lưu ý:</span> Tất cả các lượt điểm danh sẽ được đánh dấu là "Điểm danh thủ công bởi officer" và sử dụng địa điểm của hoạt động.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setConfirmCheckInAllSessionsModal({ open: false, participant: null, selectedDay: null });
                            setSelectedSessions(new Set());
                          }}
                          disabled={isProcessingParticipant}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
                            isDarkMode 
                              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          Hủy
                        </button>
                        <button
                          onClick={async () => {
                            if (confirmCheckInAllSessionsModal.participant && selectedCount > 0) {
                              // Get selected sessions data
                              const selectedSessionsData = missingInfo.sessions.filter(s => selectedSessions.has(s.key));
                              setConfirmCheckInAllSessionsModal({ open: false, participant: null, selectedDay: null });
                              setSelectedSessions(new Set());
                              await handleManualCheckInAllSessions(confirmCheckInAllSessionsModal.participant, confirmCheckInAllSessionsModal.selectedDay, selectedSessionsData);
                            }
                          }}
                          disabled={isProcessingParticipant || selectedCount === 0}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                            isDarkMode 
                              ? 'bg-blue-600 text-white hover:bg-blue-700' 
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isProcessingParticipant ? (
                            <>
                              <Loader size={12} strokeWidth={2.5} className="animate-spin" />
                              <span>Đang xử lý...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={12} strokeWidth={2.5} />
                              <span>Xác nhận điểm danh</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Cancel Attendance Modal */}
        {cancelModal.open && (cancelModal.attendanceId || cancelModal.participantId) && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className={`w-full max-w-lg mx-4 rounded-2xl shadow-2xl border-2 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 ${
              isDarkMode ? 'bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 border-red-500/30' : 'bg-gradient-to-br from-white via-white to-gray-50 border-red-200'
            }`}>
              {/* Header with gradient */}
              <div className={`px-6 pt-6 pb-4 border-b ${
                isDarkMode ? 'border-gray-700 bg-gradient-to-r from-red-500/10 to-orange-500/10' : 'border-gray-200 bg-gradient-to-r from-red-50 to-orange-50'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg ${
                    isDarkMode ? 'bg-gradient-to-br from-red-500/30 to-orange-500/30 border-2 border-red-500/50' : 'bg-gradient-to-br from-red-100 to-orange-100 border-2 border-red-200'
                  }`}>
                    <AlertTriangle size={28} strokeWidth={2.5} className={isDarkMode ? 'text-red-400' : 'text-red-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-xl font-bold mb-1.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {cancelModal.selectedDay !== null && cancelModal.selectedDay !== undefined
                        ? `Cảnh báo hủy điểm danh`
                        : 'Cảnh báo hủy điểm danh'
                      }
                      {cancelModal.selectedDay !== null && cancelModal.selectedDay !== undefined && (
                        <span className={`ml-2 text-base font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                          (Ngày {cancelModal.selectedDay})
                        </span>
                      )}
                    </h3>
                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {cancelModal.attendanceId 
                        ? 'Bạn có chắc chắn muốn hủy điểm danh này?'
                        : cancelModal.selectedDay !== null && cancelModal.selectedDay !== undefined
                          ? `Bạn có chắc chắn muốn hủy điểm danh của người tham gia này trong ngày ${cancelModal.selectedDay}?`
                        : 'Bạn có chắc chắn muốn hủy điểm danh của người tham gia này?'
                      }
                    </p>
                  </div>
                  </div>
                </div>

              {/* Content */}
              <div className="p-6">
                <div className={`mb-6 p-4 rounded-xl border-l-4 ${
                  isDarkMode 
                    ? 'bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/10' 
                    : 'bg-red-50 border-red-400 shadow-md'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex-shrink-0 ${
                      isDarkMode ? 'text-red-400' : 'text-red-600'
                    }`}>
                      <AlertTriangle size={20} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold mb-2 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                        ⚠️ Lưu ý quan trọng
                  </p>
                      <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {cancelModal.attendanceId
                          ? 'Khi hủy điểm danh, bản ghi điểm danh này sẽ bị xóa vĩnh viễn và không thể khôi phục. Người tham gia sẽ trở về trạng thái chưa điểm danh.'
                      : cancelModal.selectedDay !== null && cancelModal.selectedDay !== undefined
                            ? `Khi hủy điểm danh, tất cả các bản ghi điểm danh của người tham gia trong ngày ${cancelModal.selectedDay} sẽ bị xóa vĩnh viễn và không thể khôi phục. Người tham gia sẽ trở về trạng thái chưa điểm danh.`
                            : 'Khi hủy điểm danh, tất cả các bản ghi điểm danh của người tham gia sẽ bị xóa vĩnh viễn và không thể khôi phục. Người tham gia sẽ trở về trạng thái chưa điểm danh.'
                    }
                  </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCancelModal({ open: false, attendanceId: null, participantId: null, selectedDay: null });
                      setCancelReason('');
                    }}
                    className={`flex-1 px-5 py-3 rounded-xl font-semibold transition-all duration-200 shadow-sm ${
                      isDarkMode 
                        ? 'bg-gray-700/80 text-gray-200 hover:bg-gray-600 hover:shadow-md' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                    }`}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        if (cancelModal.attendanceId) {
                          // Cancel specific attendance record - find it and delete it
                          const participant = participants.find(p => {
                            return p.attendances?.some((a: AttendanceRecord) => a._id === cancelModal.attendanceId);
                          });
                          
                          if (participant) {
                            const attendance = participant.attendances?.find((a: AttendanceRecord) => a._id === cancelModal.attendanceId);
                            if (attendance) {
                              const participantId = typeof participant.userId === 'object' && participant.userId !== null
                                ? participant.userId._id || String(participant.userId)
                                : String(participant.userId);
                              
                              const token = localStorage.getItem('token');
                              
                              // Extract timeSlot and checkInType from attendance record - use EXACT format from database
                              let timeSlot = attendance.timeSlot;
                              let checkInType = attendance.checkInType;
                              let dayNumber: number | undefined;
                              let slotDate: string | undefined;
                              
                              // For multiple_days, extract dayNumber from timeSlot or use slotDate
                              if (activity && activity.type === 'multiple_days' && attendance.dayNumber) {
                                dayNumber = attendance.dayNumber;
                              } else if (activity && activity.type === 'multiple_days' && attendance.slotDate) {
                                slotDate = attendance.slotDate;
                              }
                              
                              // Use EXACT timeSlot format from database (don't extract)
                              // API uses exact match, so we need to send the exact format stored in DB
                              
                              const response = await fetch(`/api/activities/${activityId}/attendance`, {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                  userId: participantId,
                                  checkedIn: false,
                                  timeSlot: timeSlot, // Use exact format from database
                                  checkInType: checkInType,
                                  dayNumber: dayNumber,
                                  slotDate: slotDate
                                }),
                              });
                              
                              if (!response.ok) {
                                const errorData = await response.json();
                                console.error('Error canceling attendance:', {
                                  attendanceId: attendance._id,
                                  timeSlot: timeSlot,
                                  checkInType: checkInType,
                                  dayNumber: dayNumber,
                                  slotDate: slotDate,
                                  error: errorData.message || errorData.error
                                });
                                throw new Error(errorData.message || 'Không thể hủy điểm danh');
                              }
                            }
                          }
                          
                          // Check if this was from detailModal before closing cancelModal
                          // If so, close detailModal after successful deletion
                          const wasFromDetailModal = detailModal.open && detailModal.attendance?._id === cancelModal.attendanceId;
                          
                          setCancelModal({ open: false, attendanceId: null, participantId: null, selectedDay: null });
                          setCancelReason('');
                          
                          // Refresh attendance data
                          await fetchAttendance();
                          
                          // If was from detailModal, close it after successful deletion
                          if (wasFromDetailModal) {
                            setDetailModal({ open: false, attendance: null, participant: null });
                          }
                          
                          setSuccessMessage('Đã hủy điểm danh thành công');
                          setTimeout(() => setSuccessMessage(null), 3000);
                        } else if (cancelModal.participantId) {
                          // Cancel attendance records for participant
                          // If selectedDay is provided (for multiple_days), only cancel records for that day
                          const participant = participants.find(p => {
                            const pid = typeof p.userId === 'object' && p.userId !== null
                              ? p.userId._id || String(p.userId)
                              : String(p.userId);
                            return pid === cancelModal.participantId;
                          });
                          
                          if (!participant) {
                            setError('Không tìm thấy người tham gia');
                            setCancelModal({ open: false, attendanceId: null, participantId: null, selectedDay: null });
                            return;
                          }
                          
                          if (!participant.attendances || participant.attendances.length === 0) {
                            setError('Người tham gia này chưa có bản ghi điểm danh nào');
                            setCancelModal({ open: false, attendanceId: null, participantId: null, selectedDay: null });
                            return;
                          }
                          
                            const token = localStorage.getItem('token');
                            const participantId = typeof participant.userId === 'object' && participant.userId !== null
                              ? participant.userId._id || String(participant.userId)
                              : String(participant.userId);
                            
                            // Filter attendances based on selectedDay if provided
                            let attendancesToCancel = participant.attendances;
                            if (cancelModal.selectedDay !== null && cancelModal.selectedDay !== undefined && activity && activity.type === 'multiple_days' && activity.schedule) {
                              const selectedScheduleDay = activity.schedule.find((d: any) => d.day === cancelModal.selectedDay);
                              if (selectedScheduleDay) {
                                const dayDate = new Date(selectedScheduleDay.date);
                                attendancesToCancel = participant.attendances.filter((a: AttendanceRecord) => {
                                  const aDate = new Date(a.checkInTime);
                                  return aDate.toLocaleDateString('vi-VN') === dayDate.toLocaleDateString('vi-VN');
                                });
                              }
                            }
                          
                          // Check if there are any attendance records to cancel
                          if (attendancesToCancel.length === 0) {
                            const message = cancelModal.selectedDay !== null && cancelModal.selectedDay !== undefined
                              ? `Người tham gia này không có bản ghi điểm danh nào trong ngày ${cancelModal.selectedDay}`
                              : 'Người tham gia này không có bản ghi điểm danh nào';
                            setError(message);
                            setCancelModal({ open: false, attendanceId: null, participantId: null, selectedDay: null });
                            return;
                            }
                            
                            // Delete filtered attendance records by calling API for each one
                            let successCount = 0;
                            for (const attendance of attendancesToCancel) {
                              try {
                                // Extract timeSlot and checkInType - use original format from attendance record
                                let timeSlot = attendance.timeSlot;
                                let checkInType = attendance.checkInType;
                                let dayNumber: number | undefined;
                                let slotDate: string | undefined;
                                
                                // For multiple_days, use selectedDay if provided, otherwise extract from attendance
                                if (activity && activity.type === 'multiple_days') {
                                  if (cancelModal.selectedDay !== null && cancelModal.selectedDay !== undefined) {
                                    // Use selectedDay from modal
                                    dayNumber = cancelModal.selectedDay;
                                    // Get slotDate from schedule
                                    const selectedScheduleDay = activity.schedule?.find((d: any) => d.day === cancelModal.selectedDay);
                                    if (selectedScheduleDay) {
                                      slotDate = selectedScheduleDay.date;
                                    }
                                  } else if (attendance.dayNumber) {
                                    dayNumber = attendance.dayNumber;
                                  } else if (attendance.slotDate) {
                                    slotDate = attendance.slotDate;
                                  }
                                }
                                
                                // Try with original timeSlot format first
                                let response = await fetch(`/api/activities/${activityId}/attendance`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({
                                    userId: participantId,
                                    checkedIn: false,
                                    timeSlot: timeSlot,
                                    checkInType: checkInType,
                                    dayNumber: dayNumber,
                                    slotDate: slotDate
                                  }),
                                });
                                
                                // If failed and timeSlot contains "Ngày X - ", try with extracted slot name
                                if (!response.ok && timeSlot && timeSlot.includes('Ngày') && timeSlot.includes(' - ')) {
                                  const parts = timeSlot.split(' - ');
                                  if (parts.length > 1) {
                                    const extractedTimeSlot = parts.slice(1).join(' - '); // Get everything after "Ngày X - "
                                    response = await fetch(`/api/activities/${activityId}/attendance`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({
                                    userId: participantId,
                                    checkedIn: false,
                                        timeSlot: extractedTimeSlot,
                                    checkInType: checkInType,
                                    dayNumber: dayNumber,
                                    slotDate: slotDate
                                  }),
                                });
                                  }
                                }
                                
                                if (response.ok) {
                                  successCount++;
                                } else {
                                  // Log error details for debugging
                                  const errorData = await response.json().catch(() => ({}));
                                  console.error(`Error deleting attendance ${attendance._id}:`, {
                                    status: response.status,
                                    statusText: response.statusText,
                                    error: errorData.message || errorData.error || 'Unknown error',
                                    requestData: {
                                      userId: participantId,
                                      timeSlot: timeSlot,
                                      checkInType: checkInType,
                                      dayNumber: dayNumber,
                                      slotDate: slotDate
                                    },
                                    attendanceData: {
                                      _id: attendance._id,
                                      timeSlot: attendance.timeSlot,
                                      checkInType: attendance.checkInType,
                                      dayNumber: attendance.dayNumber,
                                      slotDate: attendance.slotDate
                                    }
                                  });
                                }
                              } catch (err) {
                                console.error(`Error deleting attendance ${attendance._id}:`, err);
                              }
                            }
                            
                            // Check if any records were successfully deleted
                            if (successCount === 0) {
                              setError('Không thể hủy điểm danh. Vui lòng thử lại.');
                              setCancelModal({ open: false, attendanceId: null, participantId: null, selectedDay: null });
                              return;
                          }
                          
                          setCancelModal({ open: false, attendanceId: null, participantId: null, selectedDay: null });
                          setCancelReason('');
                          const message = cancelModal.selectedDay !== null && cancelModal.selectedDay !== undefined
                              ? `Đã hủy ${successCount} bản ghi điểm danh trong ngày ${cancelModal.selectedDay} thành công`
                              : `Đã hủy ${successCount} bản ghi điểm danh thành công`;
                          setSuccessMessage(message);
                          setTimeout(() => setSuccessMessage(null), 3000);
                          await fetchAttendance();
                        }
                      } catch (err) {
                        console.error('Error canceling attendance:', err);
                        setError('Có lỗi xảy ra khi hủy điểm danh');
                      }
                    }}
                    disabled={Boolean((cancelModal.attendanceId ? verifyingAttendance.has(cancelModal.attendanceId) : false) || (cancelModal.participantId ? processing.has(cancelModal.participantId) : false))}
                    className={`flex-1 px-5 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg flex items-center justify-center gap-2 ${
                      isDarkMode 
                        ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]' 
                        : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                  >
                    {((cancelModal.attendanceId && verifyingAttendance.has(cancelModal.attendanceId)) || (cancelModal.participantId && processing.has(cancelModal.participantId))) ? (
                      <>
                        <Loader size={16} strokeWidth={2.5} className="animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={16} strokeWidth={2.5} />
                        <span>Xác nhận hủy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Detail Modal */}
        {detailModal.open && detailModal.attendance && detailModal.participant && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-3 sm:p-4">
            <div className={`rounded-lg border shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              {/* Header */}
              <div className={`px-4 py-3 border-b flex-shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold bg-gradient-to-br from-blue-500 to-blue-600 text-white flex-shrink-0`}>
                      {getInitials(detailModal.participant.name)}
                    </div>
                    <div className="min-w-0">
                      <h3 className={`text-base font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Chi tiết điểm danh
                      </h3>
                      <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {detailModal.participant.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailModal({ open: false, attendance: null, participant: null })}
                    className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    <X size={18} strokeWidth={2.5} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  </button>
                </div>
              </div>

              {/* Content - Scrollable */}
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                {/* Manual Check-in Info Section */}
                {isManualCheckInRecord(detailModal.attendance) && detailModal.attendance.verifiedBy && (
                  <div className={`rounded-lg border p-3 ${isDarkMode ? 'border-blue-500/30 bg-blue-500/10' : 'border-blue-300 bg-blue-50'}`}>
                    <h4 className={`text-sm font-bold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      <CheckCircle2 size={16} strokeWidth={2.5} />
                      Thông tin điểm danh thủ công
                    </h4>
                      {/* Officer đã điểm danh */}
                        <div className={`rounded-lg p-2.5 ${isDarkMode ? 'bg-gray-700/50' : 'bg-white'}`}>
                          <p className={`text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Officer đã điểm danh
                          </p>
                          <div className="flex items-center gap-2">
                        {(() => {
                          const verifierName = getVerifierName(
                            detailModal.attendance.verifiedBy,
                            detailModal.attendance.verifiedByName
                          );
                          const verifierEmail = detailModal.attendance.verifiedByEmail 
                            || (typeof detailModal.attendance.verifiedBy === 'object' 
                              ? detailModal.attendance.verifiedBy.email 
                              : null);
                          
                          return (
                            <>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold bg-gradient-to-br from-green-500 to-green-600 text-white flex-shrink-0`}>
                                {getInitials(verifierName)}
                            </div>
                              <div className="min-w-0 flex-1">
                              <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {verifierName}
                              </p>
                                {verifierEmail && (
                                  <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {verifierEmail}
                                  </p>
                                )}
                              {detailModal.attendance.verifiedAt && (
                                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {new Date(detailModal.attendance.verifiedAt).toLocaleString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              )}
                            </div>
                            </>
                          );
                        })()}
                          </div>
                    </div>
                  </div>
                )}

                {/* Basic Info Table */}
                <div className={`rounded-lg border overflow-hidden ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      <tr>
                        <td className={`px-3 py-2 font-semibold ${isDarkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-50 text-gray-700'} w-1/3`}>
                          Buổi điểm danh
                        </td>
                        <td className={`px-3 py-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                          {detailModal.attendance.timeSlot} - {detailModal.attendance.checkInType === 'start' ? 'Đầu buổi' : 'Cuối buổi'}
                        </td>
                      </tr>
                      <tr>
                        <td className={`px-3 py-2 font-semibold ${isDarkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                          Thời gian điểm danh
                        </td>
                        <td className={`px-3 py-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                          {new Date(detailModal.attendance.checkInTime).toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                      </tr>
                      <tr>
                        <td className={`px-3 py-2 font-semibold ${isDarkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                          Trạng thái
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            detailModal.attendance.status === 'approved'
                              ? isDarkMode ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-300'
                              : detailModal.attendance.status === 'rejected'
                                ? isDarkMode ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-300'
                                : isDarkMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/30' : 'bg-amber-100 text-amber-700 border border-amber-300 animate-pulse ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/30'
                          }`}>
                            {detailModal.attendance.status === 'approved' ? (
                              <>
                                <CheckCircle2 size={14} strokeWidth={2.5} />
                                {(() => {
                                  const isManual = isManualCheckInRecord(detailModal.attendance);
                                  const officerName = isManual && (detailModal.attendance.verifiedBy || detailModal.attendance.verifiedByName)
                                    ? getVerifierName(detailModal.attendance.verifiedBy, detailModal.attendance.verifiedByName) 
                                    : null;
                                  return isManual && officerName 
                                    ? `Thủ Công bởi ${officerName}` 
                                    : (isManual ? 'Thủ Công' : 'Đã duyệt');
                                })()}
                              </>
                            ) : detailModal.attendance.status === 'rejected' ? (
                              <>
                                <XCircle size={14} strokeWidth={2.5} />
                                Đã từ chối
                              </>
                            ) : (
                              <>
                                <Loader size={14} strokeWidth={2.5} className="animate-spin" />
                                Chờ duyệt
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className={`px-3 py-2 font-semibold ${isDarkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                          Địa điểm
                        </td>
                        <td className={`px-3 py-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'} break-words`}>
                          {detailModal.attendance.location?.address || `${detailModal.attendance.location?.lat?.toFixed(6)}, ${detailModal.attendance.location?.lng?.toFixed(6)}`}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Validation Info */}
                {(() => {
                  // Debug: Log attendance info
                  console.log('Validating attendance:', {
                    timeSlot: detailModal.attendance.timeSlot,
                    checkInType: detailModal.attendance.checkInType,
                    checkInTime: detailModal.attendance.checkInTime,
                    dayNumber: detailModal.attendance.dayNumber,
                    slotDate: detailModal.attendance.slotDate,
                    location: detailModal.attendance.location,
                    activityType: activity?.type
                  });
                  
                  const locationValidation = validateLocation(detailModal.attendance);
                  const timeValidation = validateTime(detailModal.attendance);
                  
                  console.log('Validation results:', {
                    locationValidation,
                    timeValidation
                  });
                  
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Location Validation */}
                      <div className={`p-2.5 rounded-lg border ${
                        locationValidation.valid
                          ? isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                          : isDarkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-start gap-2">
                          {locationValidation.valid ? (
                            <CheckCircle2 size={16} strokeWidth={2.5} className={isDarkMode ? 'text-green-300' : 'text-green-700 flex-shrink-0'} />
                          ) : (
                            <XCircle size={16} strokeWidth={2.5} className={isDarkMode ? 'text-red-300' : 'text-red-700 flex-shrink-0'} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold mb-0.5 ${
                              locationValidation.valid
                                ? isDarkMode ? 'text-green-300' : 'text-green-700'
                                : isDarkMode ? 'text-red-300' : 'text-red-700'
                            }`}>
                              {locationValidation.valid ? 'Vị trí hợp lệ' : 'Vị trí không hợp lệ'}
                            </p>
                            {locationValidation.distance !== undefined && (
                              <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Khoảng cách: {locationValidation.distance.toFixed(0)}m
                              </p>
                            )}
                            {locationValidation.message && (
                              <p className={`text-[10px] mt-0.5 break-words ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {locationValidation.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Time Validation */}
                      <div className={`p-2.5 rounded-lg border ${
                        timeValidation.valid
                          ? isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                          : isDarkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-start gap-2">
                          {timeValidation.valid ? (
                            <CheckCircle2 size={16} strokeWidth={2.5} className={isDarkMode ? 'text-green-300' : 'text-green-700 flex-shrink-0'} />
                          ) : (
                            <XCircle size={16} strokeWidth={2.5} className={isDarkMode ? 'text-red-300' : 'text-red-700 flex-shrink-0'} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold mb-0.5 ${
                              timeValidation.valid
                                ? isDarkMode ? 'text-green-300' : 'text-green-700'
                                : isDarkMode ? 'text-red-300' : 'text-red-700'
                            }`}>
                              {timeValidation.valid ? 'Thời gian hợp lệ' : 'Thời gian không hợp lệ'}
                            </p>
                            {timeValidation.isLate && (
                              <p className={`text-[10px] ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                                Điểm danh trễ
                              </p>
                            )}
                            {timeValidation.message && (
                              <p className={`text-[10px] mt-0.5 break-words ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {timeValidation.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Photo */}
                {detailModal.attendance.photoUrl && (
                  <div>
                    <p className={`text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Ảnh điểm danh
                    </p>
                    <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
                      <img
                        src={detailModal.attendance.photoUrl}
                        alt="Ảnh điểm danh"
                        className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingImage(detailModal.attendance!.photoUrl || null);
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Late Reason */}
                {detailModal.attendance.lateReason && (
                  <div className={`p-2.5 rounded-lg border ${isDarkMode ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200'}`}>
                    <p className={`text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                      <Clock size={14} strokeWidth={2.5} />
                      Lý do trễ
                    </p>
                    <p className={`text-xs break-words ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {detailModal.attendance.lateReason}
                    </p>
                  </div>
                )}

                {/* Verification Note */}
                {detailModal.attendance.verificationNote && (
                  <div className={`p-2.5 rounded-lg border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                    <p className={`text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      <ClipboardList size={14} strokeWidth={2.5} />
                      Ghi chú xác nhận
                    </p>
                    <p className={`text-xs break-words ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {detailModal.attendance.verificationNote}
                    </p>
                  </div>
                )}

                {/* Lịch sử xác nhận */}
                {(() => {
                  const hasHistory = detailModal.attendance.status === 'approved' && detailModal.attendance.cancelReason;
                  const hasRejection = detailModal.attendance.status === 'rejected' && detailModal.attendance.cancelReason;
                  
                  if (hasHistory || hasRejection || (detailModal.attendance.verifiedBy && detailModal.attendance.verifiedAt)) {
                    return (
                      <div className={`p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700/30 border-gray-600/50' : 'bg-gray-50 border-gray-200'}`}>
                        <p className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          <Clock size={14} strokeWidth={2.5} />
                          Lịch sử xác nhận
                        </p>
                        <div className="space-y-2">
                          {/* Lần từ chối trước đó (nếu có) */}
                          {hasHistory && detailModal.attendance.cancelReason && (
                            <div className={`p-2 rounded border ${isDarkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
                              <div className="flex items-start gap-2">
                                <XCircle size={12} strokeWidth={2.5} className={`mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[10px] font-semibold mb-0.5 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                                    Đã từ chối trước đó
                                  </p>
                                  <p className={`text-[10px] break-words ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {detailModal.attendance.cancelReason}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Lần từ chối hiện tại */}
                          {hasRejection && detailModal.attendance.cancelReason && (
                            <div className={`p-2 rounded border ${isDarkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
                              <div className="flex items-start gap-2">
                                <XCircle size={12} strokeWidth={2.5} className={`mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[10px] font-semibold mb-0.5 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                                    Đã từ chối
                                    {detailModal.attendance.verifiedBy && detailModal.attendance.verifiedAt && (
                                      <span className={`ml-1 text-[9px] font-normal ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        • {getVerifierName(detailModal.attendance.verifiedBy, detailModal.attendance.verifiedByName)} • {new Date(detailModal.attendance.verifiedAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                  </p>
                                  <p className={`text-[10px] break-words ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {detailModal.attendance.cancelReason}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Lần xác nhận hiện tại */}
                          {detailModal.attendance.status === 'approved' && detailModal.attendance.verifiedBy && detailModal.attendance.verifiedAt && (
                            <div className={`p-2 rounded border ${isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
                              <div className="flex items-start gap-2">
                                <CheckCircle2 size={12} strokeWidth={2.5} className={`mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-green-300' : 'text-green-700'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[10px] font-semibold mb-0.5 ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                                    Đã xác nhận
                                    <span className={`ml-1 text-[9px] font-normal ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      • {getVerifierName(detailModal.attendance.verifiedBy)} • {new Date(detailModal.attendance.verifiedAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </p>
                                  {detailModal.attendance.verificationNote && (
                                    <p className={`text-[10px] break-words mt-0.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                      {detailModal.attendance.verificationNote}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Action Buttons */}
                {(() => {
                  const locationValidation = validateLocation(detailModal.attendance);
                  const timeValidation = validateTime(detailModal.attendance);
                  const isInvalid = !locationValidation.valid || !timeValidation.valid;
                  const isPending = detailModal.attendance.status === 'pending';
                  const isApproved = detailModal.attendance.status === 'approved';
                  const isRejected = detailModal.attendance.status === 'rejected';
                  const isApprovedButInvalid = isApproved && isInvalid;
                  
                  // Pending status - Show approve/reject buttons
                  if (isPending) {
                    return (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <div className="flex flex-col gap-2.5">
                          {isInvalid && (
                            <div className={`p-2.5 rounded-lg border ${
                              isDarkMode ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200'
                            }`}>
                              <p className={`text-xs font-semibold mb-1 flex items-center gap-1.5 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                                <AlertTriangle size={14} strokeWidth={2.5} />
                                Điểm danh không hợp lệ
                              </p>
                              {!locationValidation.valid && (
                                <p className={`text-[10px] mb-0.5 ${isDarkMode ? 'text-orange-200' : 'text-orange-600'}`}>
                                  • Vị trí: {locationValidation.message || 'Không hợp lệ'}
                                </p>
                              )}
                              {!timeValidation.valid && (
                                <p className={`text-[10px] ${isDarkMode ? 'text-orange-200' : 'text-orange-600'}`}>
                                  • Thời gian: {timeValidation.message || 'Không hợp lệ'}
                                </p>
                              )}
                            </div>
                          )}
                          <textarea
                            placeholder={isInvalid ? "Ghi chú xác nhận (bắt buộc cho điểm danh không hợp lệ)..." : "Ghi chú xác nhận (tùy chọn)..."}
                            value={verificationNote[detailModal.attendance._id] || ''}
                            onChange={(e) => setVerificationNote(prev => ({
                              ...prev,
                              [detailModal.attendance!._id]: e.target.value
                            }))}
                            className={`w-full px-3 py-2 rounded-lg text-xs border resize-none ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                            rows={2}
                          />
                          <div className="flex gap-2.5">
                            <button
                              onClick={async () => {
                                await handleVerifyAttendance(detailModal.attendance!._id, 'approved');
                                setDetailModal({ open: false, attendance: null, participant: null });
                              }}
                              disabled={verifyingAttendance.has(detailModal.attendance._id) || (isInvalid && !verificationNote[detailModal.attendance._id]?.trim())}
                              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                              title={isInvalid && !verificationNote[detailModal.attendance._id]?.trim() ? 'Vui lòng nhập lý do duyệt cho điểm danh không hợp lệ' : ''}
                            >
                              {verifyingAttendance.has(detailModal.attendance._id) ? (
                                <>
                                  <Loader size={14} strokeWidth={2.5} className="animate-spin" />
                                  Đang xử lý...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={14} strokeWidth={2.5} />
                                  Duyệt
                                </>
                              )}
                            </button>
                            <button
                              onClick={async () => {
                                await handleVerifyAttendance(detailModal.attendance!._id, 'rejected');
                                setDetailModal({ open: false, attendance: null, participant: null });
                              }}
                              disabled={verifyingAttendance.has(detailModal.attendance._id)}
                              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                            >
                              {verifyingAttendance.has(detailModal.attendance._id) ? (
                                <>
                                  <Loader size={14} strokeWidth={2.5} className="animate-spin" />
                                  Đang xử lý...
                                </>
                              ) : (
                                <>
                                  <XCircle size={14} strokeWidth={2.5} />
                                  Từ chối
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Approved but invalid - Show adjustment options
                  if (isApprovedButInvalid) {
                    return (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <div className={`mb-3 p-2.5 rounded-lg border ${
                          isDarkMode ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200'
                        }`}>
                          <p className={`text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                            <AlertTriangle size={14} strokeWidth={2.5} />
                            Điểm danh đã được duyệt nhưng không hợp lệ - Có thể điều chỉnh lại
                          </p>
                          {!locationValidation.valid && (
                            <p className={`text-[10px] mb-0.5 ${isDarkMode ? 'text-orange-200' : 'text-orange-600'}`}>
                              • Vị trí: {locationValidation.message || 'Không hợp lệ'}
                            </p>
                          )}
                          {!timeValidation.valid && (
                            <p className={`text-[10px] ${isDarkMode ? 'text-orange-200' : 'text-orange-600'}`}>
                              • Thời gian: {timeValidation.message || 'Không hợp lệ'}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2.5">
                          <label className={`block text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Xem xét lại và điều chỉnh trạng thái
                            <span className="text-red-500 ml-1">*</span>
                          </label>
                          <textarea
                            placeholder="Nhập lý do điều chỉnh (bắt buộc). VD: Xác nhận lại sau khi xem xét, điểm danh không hợp lệ vì lý do..., hoặc giữ nguyên trạng thái với lý do..."
                            value={verificationNote[detailModal.attendance._id] || ''}
                            onChange={(e) => setVerificationNote(prev => ({
                              ...prev,
                              [detailModal.attendance!._id]: e.target.value
                            }))}
                            className={`w-full px-3 py-2 rounded-lg text-xs border resize-none ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2.5">
                          <button
                            onClick={async () => {
                              await handleVerifyAttendance(detailModal.attendance!._id, 'approved');
                              setDetailModal({ open: false, attendance: null, participant: null });
                            }}
                            disabled={verifyingAttendance.has(detailModal.attendance._id) || !verificationNote[detailModal.attendance._id]?.trim()}
                            className="px-3 py-2 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                            title={!verificationNote[detailModal.attendance._id]?.trim() ? 'Vui lòng nhập lý do điều chỉnh' : 'Xác nhận lại điểm danh là hợp lệ'}
                          >
                            {verifyingAttendance.has(detailModal.attendance._id) ? (
                              <>
                                <Loader size={14} strokeWidth={2.5} className="animate-spin" />
                                Đang xử lý...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={14} strokeWidth={2.5} />
                                Xác nhận hợp lệ
                              </>
                            )}
                          </button>
                          <button
                            onClick={async () => {
                              await handleVerifyAttendance(detailModal.attendance!._id, 'rejected');
                              setDetailModal({ open: false, attendance: null, participant: null });
                            }}
                            disabled={verifyingAttendance.has(detailModal.attendance._id) || !verificationNote[detailModal.attendance._id]?.trim()}
                            className="px-3 py-2 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                            title={!verificationNote[detailModal.attendance._id]?.trim() ? 'Vui lòng nhập lý do từ chối' : 'Từ chối điểm danh - Đánh dấu không hợp lệ'}
                          >
                            {verifyingAttendance.has(detailModal.attendance._id) ? (
                              <>
                                <Loader size={14} strokeWidth={2.5} className="animate-spin" />
                                Đang xử lý...
                              </>
                            ) : (
                              <>
                                <XCircle size={14} strokeWidth={2.5} />
                                Không hợp lệ
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              if (detailModal.attendance) {
                                setCancelModal({ open: true, attendanceId: detailModal.attendance._id });
                                setCancelReason('');
                              }
                            }}
                            className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-500 text-white hover:bg-gray-600 transition-all shadow-sm flex items-center justify-center gap-1"
                            title="Hủy điểm danh - Yêu cầu nhập lý do"
                          >
                            <X size={14} strokeWidth={2.5} />
                            Hủy
                          </button>
                        </div>
                      </div>
                    );
                  }
                  
                  // Approved and valid - Show cancel option
                  if (isApproved && !isInvalid) {
                    return (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <div className={`p-2.5 rounded-lg ${isDarkMode ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={16} strokeWidth={2.5} className={isDarkMode ? 'text-green-300' : 'text-green-700'} />
                              <div>
                                <p className={`text-xs font-bold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                                  Đã điểm danh
                                </p>
                                <p className={`text-[10px] ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                  Trạng thái: Hợp lệ
                                </p>
                              </div>
                            </div>
                            {detailModal.attendance.verifiedBy && (
                              <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {getVerifierName(detailModal.attendance.verifiedBy)}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (detailModal.attendance) {
                              setCancelModal({ open: true, attendanceId: detailModal.attendance._id });
                              setCancelReason('');
                            }
                          }}
                          className="mt-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium bg-gray-500 text-white hover:bg-gray-600 transition-all shadow-sm flex items-center justify-center gap-1.5"
                          title="Hủy điểm danh - Yêu cầu nhập lý do"
                        >
                          <X size={14} strokeWidth={2.5} />
                          Hủy điểm danh
                        </button>
                      </div>
                    );
                  }
                  
                  // Rejected - Show info with option to approve again
                  if (isRejected) {
                    return (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <div className={`mb-3 p-2.5 rounded-lg ${isDarkMode ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
                          <div className="flex items-center gap-2">
                            <XCircle size={16} strokeWidth={2.5} className={isDarkMode ? 'text-red-300' : 'text-red-700'} />
                            <div>
                              <p className={`text-xs font-bold ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                                Đã từ chối
                              </p>
                              <p className={`text-[10px] ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                Điểm danh này đã bị từ chối
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2.5">
                          <label className={`block text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Xác nhận lại điểm danh
                            <span className="text-red-500 ml-1">*</span>
                          </label>
                          <textarea
                            placeholder="Nhập lý do xác nhận lại (bắt buộc). VD: Xem xét lại, điểm danh hợp lệ vì lý do..."
                            value={verificationNote[detailModal.attendance._id] || ''}
                            onChange={(e) => setVerificationNote(prev => ({
                              ...prev,
                              [detailModal.attendance!._id]: e.target.value
                            }))}
                            className={`w-full px-3 py-2 rounded-lg text-xs border resize-none ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5">
                          <button
                            onClick={async () => {
                              await handleVerifyAttendance(detailModal.attendance!._id, 'approved');
                              setDetailModal({ open: false, attendance: null, participant: null });
                            }}
                            disabled={verifyingAttendance.has(detailModal.attendance._id) || !verificationNote[detailModal.attendance._id]?.trim()}
                            className="px-3 py-2 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                            title={!verificationNote[detailModal.attendance._id]?.trim() ? 'Vui lòng nhập lý do xác nhận lại' : 'Xác nhận lại điểm danh'}
                          >
                            {verifyingAttendance.has(detailModal.attendance._id) ? (
                              <>
                                <Loader size={14} strokeWidth={2.5} className="animate-spin" />
                                Đang xử lý...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={14} strokeWidth={2.5} />
                                Xác nhận lại
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              if (detailModal.attendance) {
                                setCancelModal({ open: true, attendanceId: detailModal.attendance._id });
                                setCancelReason('');
                              }
                            }}
                            className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-500 text-white hover:bg-gray-600 transition-all shadow-sm flex items-center justify-center gap-1"
                            title="Hủy điểm danh - Yêu cầu nhập lý do"
                          >
                            <X size={14} strokeWidth={2.5} />
                            Hủy
                          </button>
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Threshold Settings Modal */}
        {showThresholdModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowThresholdModal(false)}>
            <div 
              className={`rounded-lg border shadow-2xl max-w-xl w-full ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`p-3 border-b ${isDarkMode ? 'bg-blue-600 border-blue-700' : 'bg-blue-600 border-blue-700'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-bold text-white`}>
                    Chỉnh sửa ngưỡng phần trăm
                  </h3>
                  <button
                    onClick={() => setShowThresholdModal(false)}
                    className={`p-1 rounded hover:bg-blue-700 transition-colors text-white`}
                  >
                    <XIcon size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>
              
              {/* Content - Table Layout */}
              <div className="p-3">
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 mb-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <th className={`px-3 py-2 text-left text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Loại
                        </th>
                        <th className={`px-3 py-2 text-center text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Từ (%)
                        </th>
                        <th className={`px-3 py-2 text-center text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Đến (%)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Đầy đủ */}
                      <tr className={`border-t ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <td className={`px-3 py-2.5 text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          Đầy đủ
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={participationThresholds.full.min}
                            onChange={(e) => handleThresholdChange('full', 'min', parseInt(e.target.value) || 0)}
                            className={`w-full px-2 py-1.5 rounded border text-sm font-semibold text-center transition-all ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20' 
                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20'
                            } focus:outline-none`}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={participationThresholds.full.max}
                            onChange={(e) => handleThresholdChange('full', 'max', parseInt(e.target.value) || 0)}
                            className={`w-full px-2 py-1.5 rounded border text-sm font-semibold text-center transition-all ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20' 
                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20'
                            } focus:outline-none`}
                          />
                        </td>
                      </tr>
                      
                      {/* Không đầy đủ */}
                      <tr className={`border-t ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50/50 border-gray-200'}`}>
                        <td className={`px-3 py-2.5 text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          Không đầy đủ
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={participationThresholds.incomplete.min}
                            onChange={(e) => handleThresholdChange('incomplete', 'min', parseInt(e.target.value) || 0)}
                            className={`w-full px-2 py-1.5 rounded border text-sm font-semibold text-center transition-all ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20' 
                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20'
                            } focus:outline-none`}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={participationThresholds.incomplete.max}
                            onChange={(e) => handleThresholdChange('incomplete', 'max', parseInt(e.target.value) || 0)}
                            className={`w-full px-2 py-1.5 rounded border text-sm font-semibold text-center transition-all ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20' 
                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20'
                            } focus:outline-none`}
                          />
                        </td>
                      </tr>
                      
                      {/* Thiếu */}
                      <tr className={`border-t ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <td className={`px-3 py-2.5 text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          Thiếu
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={participationThresholds.insufficient.min}
                            onChange={(e) => handleThresholdChange('insufficient', 'min', parseInt(e.target.value) || 0)}
                            className={`w-full px-2 py-1.5 rounded border text-sm font-semibold text-center transition-all ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20' 
                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20'
                            } focus:outline-none`}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={participationThresholds.insufficient.max}
                            onChange={(e) => handleThresholdChange('insufficient', 'max', parseInt(e.target.value) || 0)}
                            className={`w-full px-2 py-1.5 rounded border text-sm font-semibold text-center transition-all ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20' 
                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20'
                            } focus:outline-none`}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Validation Warning */}
                {(() => {
                  const { full, incomplete, insufficient } = participationThresholds;
                  const hasOverlap = 
                    (insufficient.max >= incomplete.min) ||
                    (incomplete.max >= full.min) ||
                    (full.min > full.max) ||
                    (incomplete.min > incomplete.max) ||
                    (insufficient.min > insufficient.max);
                  
                  const hasGaps = 
                    (insufficient.max < incomplete.min - 1) ||
                    (incomplete.max < full.min - 1);
                  
                  if (hasOverlap) {
                    return (
                      <div className={`mb-3 p-2.5 rounded-lg border ${isDarkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
                        <p className={`text-xs font-semibold flex items-center gap-1.5 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                          <AlertTriangle size={14} strokeWidth={2.5} />
                          Cảnh báo: Các ngưỡng đang chồng chéo hoặc không hợp lệ. Vui lòng điều chỉnh lại.
                        </p>
                      </div>
                    );
                  }
                  
                  if (hasGaps) {
                    return (
                      <div className={`mb-3 p-2.5 rounded-lg border ${isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                        <p className={`text-xs font-medium flex items-center gap-1.5 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                          <AlertCircle size={14} strokeWidth={2.5} />
                          Lưu ý: Có khoảng trống giữa các ngưỡng. Một số phần trăm có thể không được phân loại.
                        </p>
                      </div>
                    );
                  }
                  
                  return null;
                })()}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowThresholdModal(false)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isDarkMode 
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Đóng
                  </button>
                  <button
                    onClick={() => {
                      setParticipationThresholds({ 
                        full: { min: 80, max: 100 }, 
                        incomplete: { min: 50, max: 79 }, 
                        insufficient: { min: 0, max: 49 } 
                      });
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isDarkMode 
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Mặc định
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
                    {checkInAllModal.checkedIn ? (
                      <CheckCircle2 size={24} strokeWidth={2.5} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />
                    ) : (
                      <XCircle size={24} strokeWidth={2.5} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                    )}
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
                    {checkInAllModal.checkedIn ? (
                      <>
                        <CheckSquare size={16} strokeWidth={2.5} className="inline mr-1" />
                        Xác nhận điểm danh
                      </>
                    ) : (
                      <>
                        <X size={16} strokeWidth={2.5} className="inline mr-1" />
                        Xác nhận hủy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manual Check-in Modal */}
        {manualCheckInModal.open && manualCheckInModal.participant && manualCheckInModal.slot && manualCheckInModal.checkInType && activity && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-3 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setManualCheckInModal({ open: false, participant: null, slot: null, checkInType: null });
              }
            }}
          >
            <div className={`rounded-lg border shadow-2xl max-w-sm w-full ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              {/* Header */}
              <div className={`px-3 py-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold bg-gradient-to-br from-blue-500 to-blue-600 text-white flex-shrink-0`}>
                      {getInitials(manualCheckInModal.participant.name)}
                    </div>
                    <div className="min-w-0">
                      <h3 className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Điểm danh thủ công
                      </h3>
                      <p className={`text-[10px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {manualCheckInModal.participant.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setManualCheckInModal({ open: false, participant: null, slot: null, checkInType: null });
                      setManualCheckInPhoto(null);
                      setManualCheckInPhotoPreview(null);
                    }}
                    className={`p-1 rounded-lg transition-colors flex-shrink-0 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    <X size={16} strokeWidth={2.5} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-3 space-y-2">
                {/* Slot Info - Compact */}
                <div className={`rounded-lg border p-2 ${isDarkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Buổi:</span>
                      <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{manualCheckInModal.slot.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loại:</span>
                      <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>
                        {manualCheckInModal.checkInType === 'start' ? 'Đầu buổi' : 'Cuối buổi'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Thời gian:</span>
                      <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>
                        {manualCheckInModal.checkInType === 'start' 
                          ? manualCheckInModal.slot.startTime 
                          : manualCheckInModal.slot.endTime}
                      </span>
                    </div>
                    {(() => {
                      try {
                        const slotLocation = getLocationForSlot(manualCheckInModal.slot, manualCheckInModal.dayNumber);
                        return (
                      <div className="flex items-center justify-between col-span-2">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Địa điểm:</span>
                            <span className={`text-right text-xs truncate max-w-[200px] ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`} title={slotLocation.address || `${slotLocation.lat}, ${slotLocation.lng}`}>
                              {slotLocation.address || `${slotLocation.lat.toFixed(6)}, ${slotLocation.lng.toFixed(6)}`}
                        </span>
                      </div>
                        );
                      } catch (error) {
                        // Fallback to activity location if getLocationForSlot fails
                        return activity.locationData || activity.location ? (
                          <div className="flex items-center justify-between col-span-2">
                            <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Địa điểm:</span>
                            <span className={`text-right text-xs truncate max-w-[200px] ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`} title={activity.locationData?.address || activity.location || 'N/A'}>
                              {activity.locationData?.address || activity.location || 'N/A'}
                            </span>
                          </div>
                        ) : null;
                      }
                    })()}
                  </div>
                </div>

                {/* Photo Upload (Optional) - Compact */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Ảnh điểm danh (tùy chọn)
                  </label>
                  {!manualCheckInPhotoPreview ? (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validate file type
                            if (!file.type.startsWith('image/')) {
                              setError('Vui lòng chọn file hình ảnh');
                              return;
                            }
                            // Validate file size (max 10MB)
                            if (file.size > 10 * 1024 * 1024) {
                              setError('Kích thước file không được vượt quá 10MB');
                              return;
                            }
                            setManualCheckInPhoto(file);
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              setManualCheckInPhotoPreview(e.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                        id="manual-checkin-photo-input"
                      />
                      <label
                        htmlFor="manual-checkin-photo-input"
                        className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
                          isDarkMode 
                            ? 'border-gray-600 hover:border-gray-500 bg-gray-700/50' 
                            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                        }`}
                      >
                        <Eye size={14} strokeWidth={2.5} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Chọn ảnh
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={manualCheckInPhotoPreview}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => {
                          setManualCheckInPhoto(null);
                          setManualCheckInPhotoPreview(null);
                        }}
                        className={`absolute top-1.5 right-1.5 p-1 rounded-full ${isDarkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white transition-colors`}
                      >
                        <X size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Info Message - Compact */}
                <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                  <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    <CheckCircle2 size={12} className="inline mr-1" strokeWidth={2.5} />
                    Thông tin điểm danh sẽ được lấy từ buổi này. Điểm danh sẽ hiển thị là hợp lệ và được đánh dấu là do officer điểm danh.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setManualCheckInModal({ open: false, participant: null, slot: null, checkInType: null });
                      setManualCheckInPhoto(null);
                      setManualCheckInPhotoPreview(null);
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isDarkMode 
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => {
                      if (manualCheckInModal.participant && manualCheckInModal.slot && manualCheckInModal.checkInType) {
                        handleManualCheckIn(
                          manualCheckInModal.participant,
                          manualCheckInModal.slot,
                          manualCheckInModal.checkInType,
                          manualCheckInModal.slotDate,
                          manualCheckInModal.dayNumber
                        );
                      }
                    }}
                    disabled={processing.has(
                      typeof manualCheckInModal.participant?.userId === 'object' && manualCheckInModal.participant?.userId !== null
                        ? manualCheckInModal.participant.userId._id || String(manualCheckInModal.participant.userId)
                        : String(manualCheckInModal.participant?.userId || '')
                    )}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                      isDarkMode 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500'
                    }`}
                  >
                    {processing.has(
                      typeof manualCheckInModal.participant?.userId === 'object' && manualCheckInModal.participant?.userId !== null
                        ? manualCheckInModal.participant.userId._id || String(manualCheckInModal.participant.userId)
                        : String(manualCheckInModal.participant?.userId || '')
                    ) ? (
                      <>
                        <Loader size={12} className="animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} />
                        Xác nhận điểm danh
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Manual Check-in Modal */}
        {bulkManualCheckInModal.open && activity && selectedParticipants.size > 0 && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-3 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setBulkManualCheckInModal({ open: false, slot: null, checkInType: null, checkBoth: false, shouldOverride: false, allSlots: false });
                setManualCheckInPhoto(null);
                setManualCheckInPhotoPreview(null);
              }
            }}
          >
            <div className={`rounded-lg border shadow-2xl max-w-md w-full ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              {/* Header */}
              <div className={`px-3 py-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold bg-gradient-to-br from-green-500 to-green-600 text-white flex-shrink-0`}>
                      <Users size={14} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <h3 className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Điểm danh đồng loạt
                      </h3>
                      <p className={`text-[10px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {selectedParticipants.size} người đã chọn
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setBulkManualCheckInModal({ open: false, slot: null, checkInType: null, checkBoth: false, shouldOverride: false, allSlots: false });
                      setManualCheckInPhoto(null);
                      setManualCheckInPhotoPreview(null);
                    }}
                    className={`p-1 rounded-lg transition-colors flex-shrink-0 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    <X size={16} strokeWidth={2.5} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-3 space-y-2">
                {/* Slot Selection */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Chọn buổi
                  </label>
                  <select
                    value={bulkManualCheckInModal.allSlots ? 'all' : (bulkManualCheckInModal.slot?.name || '')}
                    onChange={(e) => {
                      if (e.target.value === 'all') {
                        setBulkManualCheckInModal(prev => ({ 
                          ...prev, 
                          allSlots: true,
                          slot: null
                        }));
                      } else {
                        const selectedSlot = activity.timeSlots?.find((s: any) => 
                          s.name === e.target.value && s.isActive
                        );
                        if (selectedSlot) {
                          setBulkManualCheckInModal(prev => ({ 
                            ...prev, 
                            slot: selectedSlot,
                            allSlots: false
                          }));
                        }
                      }
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="all">Tất cả các buổi</option>
                    {activity.timeSlots?.filter((s: any) => s.isActive).map((slot: any) => (
                      <option key={slot.name} value={slot.name}>
                        {slot.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Check Both Option */}
                <div className="flex items-center gap-2 p-2 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50'}">
                  <input
                    type="checkbox"
                    id="check-both"
                    checked={bulkManualCheckInModal.checkBoth}
                    onChange={(e) => {
                      setBulkManualCheckInModal(prev => ({ 
                        ...prev, 
                        checkBoth: e.target.checked,
                        checkInType: e.target.checked ? null : 'start'
                      }));
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="check-both" className={`text-xs font-medium cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Điểm danh cả đầu và cuối buổi
                  </label>
                </div>

                {/* Check-in Type Selection - Only show if not checking both */}
                {!bulkManualCheckInModal.checkBoth && (
                  <div className="space-y-1.5">
                    <label className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Loại điểm danh
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBulkManualCheckInModal(prev => ({ ...prev, checkInType: 'start' }))}
                        className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          bulkManualCheckInModal.checkInType === 'start'
                            ? isDarkMode 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-blue-600 text-white'
                            : isDarkMode 
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Đầu buổi
                      </button>
                      <button
                        onClick={() => setBulkManualCheckInModal(prev => ({ ...prev, checkInType: 'end' }))}
                        className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          bulkManualCheckInModal.checkInType === 'end'
                            ? isDarkMode 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-blue-600 text-white'
                            : isDarkMode 
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Cuối buổi
                      </button>
                    </div>
                  </div>
                )}

                {/* Slot Info */}
                {bulkManualCheckInModal.slot && (
                  <div className={`rounded-lg border p-2 ${isDarkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Buổi:</span>
                        <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{bulkManualCheckInModal.slot.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loại:</span>
                        <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>
                          {bulkManualCheckInModal.checkBoth 
                            ? 'Đầu và Cuối buổi' 
                            : (bulkManualCheckInModal.checkInType === 'start' ? 'Đầu buổi' : 'Cuối buổi')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Thời gian:</span>
                        <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>
                          {bulkManualCheckInModal.checkBoth 
                            ? `${bulkManualCheckInModal.slot.startTime} - ${bulkManualCheckInModal.slot.endTime}`
                            : (bulkManualCheckInModal.checkInType === 'start' 
                              ? bulkManualCheckInModal.slot.startTime 
                              : bulkManualCheckInModal.slot.endTime)}
                        </span>
                      </div>
                      {activity.locationData && (
                        <div className="flex items-center justify-between col-span-2">
                          <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Địa điểm:</span>
                          <span className={`text-right text-xs truncate max-w-[200px] ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`} title={activity.locationData.address || activity.location || 'N/A'}>
                            {activity.locationData.address || activity.location || 'N/A'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Photo Upload (Optional) */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Ảnh điểm danh (tùy chọn - dùng chung cho tất cả)
                  </label>
                  {!manualCheckInPhotoPreview ? (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (!file.type.startsWith('image/')) {
                              setError('Vui lòng chọn file hình ảnh');
                              return;
                            }
                            if (file.size > 10 * 1024 * 1024) {
                              setError('Kích thước file không được vượt quá 10MB');
                              return;
                            }
                            setManualCheckInPhoto(file);
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              setManualCheckInPhotoPreview(e.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                        id="bulk-manual-checkin-photo-input"
                      />
                      <label
                        htmlFor="bulk-manual-checkin-photo-input"
                        className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
                          isDarkMode 
                            ? 'border-gray-600 hover:border-gray-500 bg-gray-700/50' 
                            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                        }`}
                      >
                        <Eye size={14} strokeWidth={2.5} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Chọn ảnh
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={manualCheckInPhotoPreview}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => {
                          setManualCheckInPhoto(null);
                          setManualCheckInPhotoPreview(null);
                        }}
                        className={`absolute top-1.5 right-1.5 p-1 rounded-full ${isDarkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white transition-colors`}
                      >
                        <X size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Check existing attendance status */}
                {(() => {
                  if (bulkManualCheckInModal.allSlots && activity) {
                    const activeSlots = activity.timeSlots?.filter((s: any) => s.isActive) || [];
                    const selectedParticipantsList = filteredParticipants.filter(p => {
                      const participantId = typeof p.userId === 'object' && p.userId !== null
                        ? p.userId._id || String(p.userId)
                        : String(p.userId);
                      return selectedParticipants.has(participantId);
                    });

                    const checkInTypes = bulkManualCheckInModal.checkBoth 
                      ? ['start', 'end'] as const
                      : (bulkManualCheckInModal.checkInType ? [bulkManualCheckInModal.checkInType] as const : []);

                    if (checkInTypes.length === 0) {
                      return (
                        <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-gray-500/10 border-gray-500/30' : 'bg-gray-50 border-gray-200'}`}>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Vui lòng chọn loại điểm danh (Đầu buổi/Cuối buổi hoặc cả hai)
                          </p>
                        </div>
                      );
                    }

                    // Check all slots for all participants
                    const alreadyCheckedInMap = new Map<string, Array<{ slot: any; checkInType: 'start' | 'end'; dayNumber?: number; date?: string }>>();
                    const notCheckedInCount = new Map<string, number>();

                    selectedParticipantsList.forEach((participant) => {
                      const participantId = typeof participant.userId === 'object' && participant.userId !== null
                        ? participant.userId._id || String(participant.userId)
                        : String(participant.userId);

                      if (activity.type === 'single_day') {
                        activeSlots.forEach((slot: any) => {
                          checkInTypes.forEach((checkInType) => {
                            const statusInfo = getAttendanceStatusWithTime(
                              participant,
                              slot,
                              checkInType,
                              activity.date
                            );
                            if (statusInfo.hasCheckedIn) {
                              if (!alreadyCheckedInMap.has(participantId)) {
                                alreadyCheckedInMap.set(participantId, []);
                              }
                              alreadyCheckedInMap.get(participantId)!.push({ slot, checkInType });
                            } else {
                              const key = `${participantId}_${slot.name}_${checkInType}`;
                              notCheckedInCount.set(key, (notCheckedInCount.get(key) || 0) + 1);
                            }
                          });
                        });
                      } else if (activity.type === 'multiple_days' && activity.schedule) {
                        activity.schedule.forEach((scheduleDay: any) => {
                          activeSlots.forEach((slot: any) => {
                            checkInTypes.forEach((checkInType) => {
                              const statusInfo = getAttendanceStatusWithTime(
                                participant,
                                slot,
                                checkInType,
                                scheduleDay.date,
                                scheduleDay.day
                              );
                              if (statusInfo.hasCheckedIn) {
                                if (!alreadyCheckedInMap.has(participantId)) {
                                  alreadyCheckedInMap.set(participantId, []);
                                }
                                alreadyCheckedInMap.get(participantId)!.push({ 
                                  slot, 
                                  checkInType, 
                                  dayNumber: scheduleDay.day,
                                  date: scheduleDay.date
                                });
                              } else {
                                const key = `${participantId}_${scheduleDay.day}_${slot.name}_${checkInType}`;
                                notCheckedInCount.set(key, (notCheckedInCount.get(key) || 0) + 1);
                              }
                            });
                          });
                        });
                      }
                    });

                    const alreadyCheckedInParticipants = Array.from(alreadyCheckedInMap.keys());
                    const totalNotCheckedIn = notCheckedInCount.size;
                    const totalAlreadyCheckedIn = alreadyCheckedInMap.size;

                    if (alreadyCheckedInParticipants.length === 0) {
                      return (
                        <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
                          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                            <CheckCircle2 size={12} className="inline mr-1" strokeWidth={2.5} />
                            Tất cả {selectedParticipants.size} người đã chọn sẽ được điểm danh thủ công cho tất cả các buổi còn thiếu.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {totalNotCheckedIn > 0 && (
                          <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
                            <p className={`text-xs font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                              ✓ Có {totalNotCheckedIn} lượt điểm danh chưa có - sẽ được điểm danh mới
                            </p>
                          </div>
                        )}
                        {totalAlreadyCheckedIn > 0 && (
                          <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                            <p className={`text-xs font-medium mb-1.5 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                              ⚠ {totalAlreadyCheckedIn} người đã có điểm danh trước đó cho một số buổi:
                            </p>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {alreadyCheckedInParticipants.slice(0, 5).map((participantId) => {
                                const participant = selectedParticipantsList.find(p => {
                                  const pid = typeof p.userId === 'object' && p.userId !== null
                                    ? p.userId._id || String(p.userId)
                                    : String(p.userId);
                                  return pid === participantId;
                                });
                                const checkedInItems = alreadyCheckedInMap.get(participantId)!;
                                const uniqueSlots = new Set(checkedInItems.map(item => item.slot.name));
                                return (
                                  <p key={participantId} className={`text-[10px] ${isDarkMode ? 'text-amber-200' : 'text-amber-600'}`}>
                                    • {participant?.name || 'N/A'}: {checkedInItems.length} lượt điểm danh đã có ({Array.from(uniqueSlots).join(', ')})
                                  </p>
                                );
                              })}
                              {alreadyCheckedInParticipants.length > 5 && (
                                <p className={`text-[10px] italic ${isDarkMode ? 'text-amber-200' : 'text-amber-600'}`}>
                                  ... và {alreadyCheckedInParticipants.length - 5} người khác
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  if (!bulkManualCheckInModal.slot || !activity) return null;
                  
                  const checkInTypes = bulkManualCheckInModal.checkBoth 
                    ? ['start', 'end'] as const
                    : [bulkManualCheckInModal.checkInType!] as const;
                  
                  let activityDateStr: string;
                  let dayNumber: number | undefined;
                  
                  if (activity.type === 'multiple_days' && bulkManualCheckInModal.slotDate) {
                    activityDateStr = bulkManualCheckInModal.slotDate;
                    dayNumber = bulkManualCheckInModal.dayNumber;
                  } else if (activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0) {
                    const firstDay = activity.schedule[0];
                    activityDateStr = firstDay.date;
                    dayNumber = firstDay.day;
                  } else {
                    activityDateStr = activity.date;
                  }

                  const selectedParticipantsList = filteredParticipants.filter(p => {
                    const participantId = typeof p.userId === 'object' && p.userId !== null
                      ? p.userId._id || String(p.userId)
                      : String(p.userId);
                    return selectedParticipants.has(participantId);
                  });

                  const alreadyCheckedIn: Array<{ participant: Participant; checkInTypes: ('start' | 'end')[] }> = [];
                  const notCheckedIn: Participant[] = [];

                  selectedParticipantsList.forEach((participant) => {
                    const alreadyCheckedInTypes: ('start' | 'end')[] = [];

                    checkInTypes.forEach((checkInType) => {
                      const statusInfo = getAttendanceStatusWithTime(
                        participant,
                        bulkManualCheckInModal.slot!,
                        checkInType,
                        activityDateStr,
                        dayNumber
                      );

                      if (statusInfo.hasCheckedIn) {
                        alreadyCheckedInTypes.push(checkInType);
                      }
                    });

                    if (alreadyCheckedInTypes.length > 0) {
                      alreadyCheckedIn.push({ participant, checkInTypes: alreadyCheckedInTypes });
                    } else {
                      notCheckedIn.push(participant);
                    }
                  });

                  if (alreadyCheckedIn.length === 0) {
                    return (
                      <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                        <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                          <CheckCircle2 size={12} className="inline mr-1" strokeWidth={2.5} />
                          Tất cả {selectedParticipants.size} người đã chọn sẽ được điểm danh thủ công {bulkManualCheckInModal.checkBoth ? 'cả đầu và cuối buổi' : (bulkManualCheckInModal.checkInType === 'start' ? 'đầu buổi' : 'cuối buổi')} với thông tin buổi này.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {notCheckedIn.length > 0 && (
                        <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
                          <p className={`text-xs font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                            ✓ {notCheckedIn.length} người chưa điểm danh - sẽ được điểm danh mới
                          </p>
                        </div>
                      )}
                      {alreadyCheckedIn.length > 0 && (
                        <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                          <p className={`text-xs font-medium mb-1.5 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                            ⚠ {alreadyCheckedIn.length} người đã điểm danh trước đó - sẽ được ghi đè:
                          </p>
                          <div className="max-h-24 overflow-y-auto space-y-1">
                            {alreadyCheckedIn.slice(0, 5).map((item, idx) => {
                              const typesText = item.checkInTypes.length === 2 
                                ? 'cả đầu và cuối' 
                                : (item.checkInTypes[0] === 'start' ? 'đầu' : 'cuối');
                              return (
                                <p key={idx} className={`text-[10px] ${isDarkMode ? 'text-amber-200' : 'text-amber-600'}`}>
                                  • {item.participant.name} (đã điểm danh {typesText} buổi)
                                </p>
                              );
                            })}
                            {alreadyCheckedIn.length > 5 && (
                              <p className={`text-[10px] italic ${isDarkMode ? 'text-amber-200' : 'text-amber-600'}`}>
                                ... và {alreadyCheckedIn.length - 5} người khác
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Override Option - Show if there are already checked in participants */}
                {(() => {
                  if (!activity) return null;
                  
                  let hasAlreadyCheckedInFlag = false;
                  
                  if (bulkManualCheckInModal.allSlots) {
                    const activeSlots = activity.timeSlots?.filter((s: any) => s.isActive) || [];
                    const selectedParticipantsList = filteredParticipants.filter(p => {
                      const participantId = typeof p.userId === 'object' && p.userId !== null
                        ? p.userId._id || String(p.userId)
                        : String(p.userId);
                      return selectedParticipants.has(participantId);
                    });

                    const checkInTypes = bulkManualCheckInModal.checkBoth 
                      ? ['start', 'end'] as const
                      : (bulkManualCheckInModal.checkInType ? [bulkManualCheckInModal.checkInType] as const : []);

                    if (checkInTypes.length === 0) return null;

                    selectedParticipantsList.forEach((participant) => {
                      if (activity.type === 'single_day') {
                        activeSlots.forEach((slot: any) => {
                          checkInTypes.forEach((checkInType) => {
                            const statusInfo = getAttendanceStatusWithTime(participant, slot, checkInType, activity.date);
                            if (statusInfo.hasCheckedIn) {
                              hasAlreadyCheckedInFlag = true;
                            }
                          });
                        });
                      } else if (activity.type === 'multiple_days' && activity.schedule) {
                        activity.schedule.forEach((scheduleDay: any) => {
                          activeSlots.forEach((slot: any) => {
                            checkInTypes.forEach((checkInType) => {
                              const statusInfo = getAttendanceStatusWithTime(participant, slot, checkInType, scheduleDay.date, scheduleDay.day);
                              if (statusInfo.hasCheckedIn) {
                                hasAlreadyCheckedInFlag = true;
                              }
                            });
                          });
                        });
                      }
                    });
                  } else {
                    if (!bulkManualCheckInModal.slot) return null;
                    
                    const checkInTypes = bulkManualCheckInModal.checkBoth 
                      ? ['start', 'end'] as const
                      : [bulkManualCheckInModal.checkInType!] as const;
                    
                    let activityDateStr: string;
                    let dayNumber: number | undefined;
                    
                    if (activity.type === 'multiple_days' && bulkManualCheckInModal.slotDate) {
                      activityDateStr = bulkManualCheckInModal.slotDate;
                      dayNumber = bulkManualCheckInModal.dayNumber;
                    } else if (activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0) {
                      const firstDay = activity.schedule[0];
                      activityDateStr = firstDay.date;
                      dayNumber = firstDay.day;
                    } else {
                      activityDateStr = activity.date;
                    }

                    const selectedParticipantsList = filteredParticipants.filter(p => {
                      const participantId = typeof p.userId === 'object' && p.userId !== null
                        ? p.userId._id || String(p.userId)
                        : String(p.userId);
                      return selectedParticipants.has(participantId);
                    });

                    selectedParticipantsList.forEach((participant) => {
                      checkInTypes.forEach((checkInType) => {
                        const statusInfo = getAttendanceStatusWithTime(
                          participant,
                          bulkManualCheckInModal.slot!,
                          checkInType,
                          activityDateStr,
                          dayNumber
                        );
                        if (statusInfo.hasCheckedIn) {
                          hasAlreadyCheckedInFlag = true;
                        }
                      });
                    });
                  }

                  if (!hasAlreadyCheckedInFlag) return null;

                  return (  
                    <div className={`p-2.5 rounded-lg border ${isDarkMode ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'}`}>
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id="should-override"
                          checked={bulkManualCheckInModal.shouldOverride}
                          onChange={(e) => {
                            setBulkManualCheckInModal(prev => ({ 
                              ...prev, 
                              shouldOverride: e.target.checked
                            }));
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                        />
                        <div className="flex-1">
                          <label htmlFor="should-override" className={`text-xs font-medium cursor-pointer block ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                            Ghi đè lên buổi điểm danh đã có
                          </label>
                          <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-yellow-200' : 'text-yellow-600'}`}>
                            Nếu bỏ chọn, hệ thống sẽ bỏ qua những người đã điểm danh và chỉ điểm danh cho những người chưa điểm danh.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setBulkManualCheckInModal({ open: false, slot: null, checkInType: null, checkBoth: false, shouldOverride: false, allSlots: false });
                      setManualCheckInPhoto(null);
                      setManualCheckInPhotoPreview(null);
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isDarkMode 
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleBulkManualCheckIn}
                    disabled={!bulkManualCheckInModal.allSlots && !bulkManualCheckInModal.checkBoth && !bulkManualCheckInModal.checkInType}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                      isDarkMode 
                        ? 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500' 
                        : 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500'
                    }`}
                  >
                    <CheckCircle2 size={12} />
                    Xác nhận điểm danh ({selectedParticipants.size} người{bulkManualCheckInModal.allSlots ? ' - Tất cả buổi' : (bulkManualCheckInModal.checkBoth ? ' - Cả đầu và cuối' : '')})
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


