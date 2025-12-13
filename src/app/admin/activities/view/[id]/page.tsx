'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  CalendarDays, 
  MapPin, 
  Users, 
  UserCircle, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Edit,
  Trash2,
  Eye,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  FileSpreadsheet,
  UserCheck
} from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';
import OfficerNav from '@/components/officer/OfficerNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import Image from 'next/image';

interface Activity {
  _id: string;
  name: string;
  description: string;
  date: string;
  startDate?: string;
  endDate?: string;
  location: string;
  maxParticipants: number;
  visibility: 'public' | 'private';
  responsiblePerson?: {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  status: 'draft' | 'published' | 'cancelled' | 'completed' | 'ongoing' | 'postponed';
  type: 'single_day' | 'multiple_days';
  imageUrl?: string;
  overview?: string;
  timeSlots?: Array<{
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
    activities: string;
  }>;
  schedule?: Array<{
    day: number;
    date: string;
    activities: string;
  }>;
  participants: Array<{
    userId: string;
    name: string;
    email: string;
    role: string;
    joinedAt: string;
    avatarUrl?: string;
  }>;
  createdAt: string;
}

interface AttendanceRecord {
  _id?: string;
  timeSlot: string;
  checkInType: 'start' | 'end';
  checkInTime: string;
  status: 'pending' | 'approved' | 'rejected';
  photoUrl?: string;
  lateReason?: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  verificationNote?: string;
  cancelReason?: string;
  verifiedBy?: {
    _id: string;
    name: string;
    email: string;
  } | string;
  verifiedByName?: string | null;
  verifiedByEmail?: string | null;
  verifiedAt?: string;
  dayNumber?: number; // For multiple_days activities
  slotDate?: string; // For multiple_days activities
  createdAt?: string;
  updatedAt?: string;
}

interface ParticipantWithAttendance {
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  avatarUrl?: string;
  attendances?: AttendanceRecord[];
  registeredDaySlots?: Array<{
    day: number;
    slot: 'morning' | 'afternoon' | 'evening';
  }>;
}

export default function ActivityViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, token, isAuthenticated } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null); // For multiple_days: selected day number
  const [selectedAttendance, setSelectedAttendance] = useState<{
    participant: ParticipantWithAttendance;
    attendance: AttendanceRecord;
    slot: any;
    checkInType: 'start' | 'end';
    dayDate?: string;
  } | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());

  // Check if user is admin or officer
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'CLUB_LEADER';
  const isOfficer = user?.role === 'CLUB_DEPUTY' || user?.role === 'CLUB_MEMBER';
  const canAccess = isAdmin || isOfficer; // Both admin and officer can access
  const canEdit = isAdmin; // Only admin can edit

  // Fetch activity and participants data
  useEffect(() => {
    const fetchData = async () => {
      if (!token || !id || !isAuthenticated) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch activity details
        const activityResponse = await fetch(`/api/activities/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!activityResponse.ok) {
          throw new Error('Không thể tải thông tin hoạt động');
        }

        const activityData = await activityResponse.json();
        if (!activityData.success || !activityData.data.activity) {
          throw new Error('Hoạt động không tồn tại');
        }

        setActivity(activityData.data.activity);
        setCurrentWeekIndex(0); // Reset to first week when activity changes

        // Fetch attendance data
        const attendanceResponse = await fetch(`/api/activities/${id}/attendance`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        let attendanceMap: { [userId: string]: AttendanceRecord[] } = {};

        if (attendanceResponse.ok) {
          const attendanceData = await attendanceResponse.json();
          
          // API returns data.participants (not data.attendances)
          if (attendanceData.success && attendanceData.data?.participants) {
            attendanceData.data.participants.forEach((participant: any) => {
              // Handle userId - can be ObjectId, object with _id, or string
              let userId: string;
              if (participant.userId && typeof participant.userId === 'object') {
                // If it's an object, get _id or toString()
                userId = participant.userId._id?.toString() || participant.userId.toString();
              } else {
                userId = String(participant.userId || '');
              }
              
              if (participant.attendances && Array.isArray(participant.attendances) && participant.attendances.length > 0) {
                // Store attendances with userId as string key
                attendanceMap[userId] = participant.attendances.map((a: any) => ({
                  _id: a._id,
                  timeSlot: a.timeSlot || '',
                  checkInType: a.checkInType || 'start',
                  checkInTime: a.checkInTime || '',
                  status: a.status || 'pending',
                  photoUrl: a.photoUrl,
                  lateReason: a.lateReason,
                  location: a.location,
                  verificationNote: a.verificationNote,
                  cancelReason: a.cancelReason,
                }));
              }
            });
          }
        }

        // Process participants with attendance
        const activityObj = activityData.data.activity;
        const processedParticipants = (activityObj.participants || []).map((p: any) => {
          // Handle userId - can be ObjectId, object with _id, or string
          let userId: string;
          if (p.userId && typeof p.userId === 'object') {
            // If it's an object, get _id or toString()
            userId = p.userId._id?.toString() || p.userId.toString();
          } else {
            userId = String(p.userId || '');
          }
          
          // Get attendances for this userId
          const attendances = attendanceMap[userId] || [];
          
          return {
            userId: userId,
            name: typeof p.userId === 'object' ? p.userId.name : p.name || 'N/A',
            email: typeof p.userId === 'object' ? p.userId.email : p.email || '',
            role: p.role || 'Thành viên',
            joinedAt: p.joinedAt || activityObj.createdAt,
            avatarUrl: typeof p.userId === 'object' ? p.userId.avatarUrl : p.avatarUrl,
            attendances: attendances,
            registeredDaySlots: p.registeredDaySlots || undefined,
          };
        });

        setParticipants(processedParticipants);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, id, isAuthenticated]);

  // Check if desktop
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Load sidebar state
  useEffect(() => {
    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState !== null) {
      setIsSidebarOpen(savedSidebarState === 'true');
    }

    const handleSidebarChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen: boolean }>;
      if (customEvent.detail) {
        setIsSidebarOpen(customEvent.detail.isOpen);
      }
    };

    window.addEventListener('sidebarStateChange', handleSidebarChange);
    
    const checkSidebarState = () => {
      const currentSidebarState = localStorage.getItem('sidebarOpen');
      if (currentSidebarState !== null) {
        setIsSidebarOpen(currentSidebarState === 'true');
      }
    };
    
    checkSidebarState();
    const intervalId = setInterval(checkSidebarState, 100);

    return () => {
      window.removeEventListener('sidebarStateChange', handleSidebarChange);
      clearInterval(intervalId);
    };
  }, []);

  const handleEdit = () => {
    if (!activity) return;
    if (activity.type === 'multiple_days') {
      router.push(`/admin/activities/create-multiple/${activity._id}`);
    } else {
      router.push(`/admin/activities/create-single/${activity._id}`);
    }
  };

  const handleDelete = async () => {
    if (!activity) return;
    if (confirm('Bạn có chắc chắn muốn xóa hoạt động này?')) {
      try {
        const response = await fetch(`/api/activities/${activity._id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          alert('✅ Đã xóa hoạt động thành công!');
          router.push('/admin/dashboard');
        } else {
          alert('❌ Có lỗi xảy ra khi xóa hoạt động');
        }
      } catch (error) {
        console.error('Error deleting activity:', error);
        alert('❌ Có lỗi xảy ra khi xóa hoạt động');
      }
    }
  };

  // Get time status for a slot
  const getTimeStatus = (slot: any, activityDate: string) => {
    if (!slot || !slot.startTime || !slot.endTime) return 'unknown';
    
    const now = new Date();
    const slotDate = new Date(activityDate);
    const [startHour, startMinute] = slot.startTime.split(':').map(Number);
    const [endHour, endMinute] = slot.endTime.split(':').map(Number);
    
    const startTime = new Date(slotDate);
    startTime.setHours(startHour, startMinute, 0, 0);
    
    const endTime = new Date(slotDate);
    endTime.setHours(endHour, endMinute, 0, 0);
    
    if (now < startTime) {
      return 'not_started'; // Chưa đến thời điểm điểm danh
    } else if (now >= startTime && now <= endTime) {
      return 'in_progress'; // Đang trong thời gian điểm danh
    } else {
      return 'passed'; // Đã qua thời điểm điểm danh
    }
  };

  // Handle attendance cell click
  const handleAttendanceClick = (
    participant: ParticipantWithAttendance,
    slot: any,
    checkInType: 'start' | 'end',
    activityDate: string,
    dayDate?: string
  ) => {
    const statusInfo = getAttendanceStatusWithTime(participant, slot, checkInType, activityDate);
    if (statusInfo.attendance) {
      setSelectedAttendance({
        participant,
        attendance: statusInfo.attendance,
        slot,
        checkInType,
        dayDate: dayDate || activityDate,
      });
    }
  };

  // Get attendance status with time context
  const getAttendanceStatusWithTime = (
    participant: ParticipantWithAttendance, 
    slot: any, 
    checkInType: 'start' | 'end',
    activityDate: string,
    dayNumber?: number
  ) => {
    // Find attendance record that matches:
    // 1. timeSlot matches slot.name exactly (for single day: "Buổi Sáng" === "Buổi Sáng")
    // 2. checkInType matches exactly ('start' or 'end')
    const attendance = participant.attendances?.find(
      (a) => {
        if (!a.timeSlot || !a.checkInType) {
          return false;
        }
        
        // Must match checkInType exactly
        if (a.checkInType !== checkInType) {
          return false;
        }
        
        // Normalize strings for comparison
        const slotName = (slot.name || '').trim();
        const timeSlot = (a.timeSlot || '').trim();
        
        // For single day activities: exact match (case-insensitive)
        // timeSlot from DB: "Buổi Sáng", slot.name: "Buổi Sáng" → match
        if (timeSlot.toLowerCase() === slotName.toLowerCase()) {
          return true;
        }
        
        // For multiple days: timeSlot is "Ngày X - Buổi Y"
        // If dayNumber is provided, check for exact day match
        if (dayNumber !== undefined) {
          const dayMatch = timeSlot.match(/Ngày\s*(\d+)/i);
          const attendanceDay = dayMatch ? parseInt(dayMatch[1]) : null;
          
          // Must match the day number exactly
          if (attendanceDay !== dayNumber) {
            return false;
          }
          
          // Extract slot type from timeSlot (e.g., "Ngày 2 - Buổi Sáng" → "sáng")
          // Extract slot type from slot.name (e.g., "Buổi Sáng" → "sáng")
          const slotPattern = /buổi\s+(sáng|chiều|tối)/i;
          const slotNameMatch = slotName.toLowerCase().match(slotPattern);
          const timeSlotMatch = timeSlot.toLowerCase().match(slotPattern);
          
          // Match slot types (sáng, chiều, tối) - this is the primary matching method
          if (slotNameMatch && timeSlotMatch) {
            if (slotNameMatch[1] === timeSlotMatch[1]) {
              return true;
            }
          }
          
          // Fallback: Check if timeSlot ends with " - Buổi X" format
          if (timeSlot.toLowerCase().endsWith(` - ${slotName.toLowerCase()}`)) {
            return true;
          }
          
          // Fallback: Remove "Ngày X - " prefix and compare
          const timeSlotWithoutDay = timeSlot.replace(/Ngày\s*\d+\s*-\s*/i, '').trim();
          if (timeSlotWithoutDay.toLowerCase() === slotName.toLowerCase()) {
            return true;
          }
        } else {
          // For single day or when dayNumber is not provided
          // Check if timeSlot ends with " - Buổi X" format (for backward compatibility)
          if (timeSlot.toLowerCase().endsWith(` - ${slotName.toLowerCase()}`)) {
            return true;
          }
          
          // Extract slot type for comparison
          const slotPattern = /buổi\s+(sáng|chiều|tối)/i;
          const slotNameMatch = slotName.toLowerCase().match(slotPattern);
          const timeSlotMatch = timeSlot.toLowerCase().match(slotPattern);
          
          if (slotNameMatch && timeSlotMatch && slotNameMatch[1] === timeSlotMatch[1]) {
            return true;
          }
        }
        
        // Additional matching: Check if slot name contains the timeSlot (for flexibility)
        // e.g., slot.name = "Buổi Chiều", timeSlot = "Buổi Chiều"
        // or slot.name might have extra text like "Buổi Chiều (13:00-17:00)"
        const slotNameNormalized = slotName.toLowerCase().replace(/\s*\([^)]*\)\s*/g, '').trim();
        const timeSlotNormalized = timeSlot.toLowerCase().trim();
        
        if (slotNameNormalized === timeSlotNormalized) {
          return true;
        }
        
        // Extract slot type from both strings for comparison
        // Match patterns like "Buổi Sáng", "Buổi Chiều", "Buổi Tối"
        const slotPattern = /buổi\s+(sáng|chiều|tối)/i;
        const slotNameMatch = slotNameNormalized.match(slotPattern);
        const timeSlotMatch = timeSlotNormalized.match(slotPattern);
        
        // If both have valid slot patterns, compare the slot types
        if (slotNameMatch && timeSlotMatch) {
          const slotNameType = slotNameMatch[1].toLowerCase();
          const timeSlotType = timeSlotMatch[1].toLowerCase();
          if (slotNameType === timeSlotType) {
            return true;
          }
        }
        
        // Fallback: Check if timeSlot is contained in slotName (for cases where slot.name has extra info)
        if (slotNameNormalized.includes(timeSlotNormalized) || timeSlotNormalized.includes(slotNameNormalized)) {
          return true;
        }
        
        return false;
      }
    );
    
    const timeStatus = getTimeStatus(slot, activityDate);
    
    if (attendance) {
      // Check if check-in was on time
      // Parse checkInTime - ensure it's a valid Date object
      const checkInTime = new Date(attendance.checkInTime);
      
      // Validate checkInTime
      if (isNaN(checkInTime.getTime())) {
        return {
          attendance,
          status: attendance.status,
          timeStatus: 'unknown',
          hasCheckedIn: true
        };
      }
      
      // Parse activityDate - handle different formats
      let slotDate: Date;
      if (typeof activityDate === 'string') {
        // Try parsing as ISO string first
        if (activityDate.includes('T') || activityDate.includes('Z')) {
          slotDate = new Date(activityDate);
        } else {
          // Try parsing as DD/MM/YYYY or YYYY-MM-DD
          const dateParts = activityDate.split(/[\/\-]/);
          if (dateParts.length === 3) {
            // Try YYYY-MM-DD format first
            if (dateParts[0].length === 4) {
              slotDate = new Date(
                parseInt(dateParts[0]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[2])
              );
            } else {
              // Assume DD/MM/YYYY format
              slotDate = new Date(
                parseInt(dateParts[2]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[0])
              );
            }
          } else {
            slotDate = new Date(activityDate);
          }
        }
      } else {
        slotDate = new Date(activityDate);
      }
      
      // Validate slotDate
      if (isNaN(slotDate.getTime())) {
        return {
          attendance,
          status: attendance.status,
          timeStatus: 'unknown',
          hasCheckedIn: true
        };
      }
      
      // IMPORTANT: Use the date from checkInTime, not slotDate
      // This ensures we're comparing times on the same day
      // Extract date components from checkInTime
      const checkInDate = new Date(checkInTime);
      checkInDate.setHours(0, 0, 0, 0);
      
      // For multiple days, try to parse actual times from schedule.activities if available
      // This ensures we use the correct end check-in time (e.g., 23:40 instead of 21:00)
      let actualSlot = { ...slot };
      if (activity && activity.type === 'multiple_days' && dayNumber !== undefined && activity.schedule) {
        const daySchedule = activity.schedule.find((s: any) => s.day === dayNumber);
        if (daySchedule && daySchedule.activities && typeof daySchedule.activities === 'string') {
          const activitiesText = daySchedule.activities;
          const lines = activitiesText.split('\n').filter((line: string) => line.trim());
          
          for (const line of lines) {
            // Match format: "Buổi Sáng/Chiều/Tối (HH:MM-HH:MM)"
            const slotMatch = line.match(/^Buổi (Sáng|Chiều|Tối)\s*\((\d{2}:\d{2})-(\d{2}:\d{2})\)/);
            if (slotMatch) {
              const slotName = slotMatch[1];
              const slotNameFull = `Buổi ${slotName}`;
              const parsedStartTime = slotMatch[2];
              const parsedEndTime = slotMatch[3];
              
              // Check if this matches the current slot
              const slotNameMatch = slot.name?.includes(slotName) || 
                                   (slotName === 'Sáng' && (slot.name?.includes('Sáng') || slot.id === 'morning')) ||
                                   (slotName === 'Chiều' && (slot.name?.includes('Chiều') || slot.id === 'afternoon')) ||
                                   (slotName === 'Tối' && (slot.name?.includes('Tối') || slot.id === 'evening'));
              
              if (slotNameMatch) {
                // Update slot with parsed times from activities text
                actualSlot = {
                  ...actualSlot,
                  startTime: parsedStartTime,
                  endTime: parsedEndTime
                };
                break;
              }
            }
          }
        }
      }
      
      // Get target time based on checkInType
      const targetTimeStr = checkInType === 'start' ? actualSlot.startTime : actualSlot.endTime;
      if (!targetTimeStr) {
        return {
          attendance,
          status: attendance.status,
          timeStatus: 'unknown',
          hasCheckedIn: true
        };
      }
      
      const [targetHour, targetMinute] = targetTimeStr.split(':').map(Number);
      
      // Create targetTime using the date from checkInTime (same day)
      // This ensures both dates are on the same day for accurate comparison
      const targetTime = new Date(checkInDate);
      targetTime.setHours(targetHour, targetMinute, 0, 0);
      targetTime.setSeconds(0, 0);
      
      // On-time window: 15 minutes before to 15 minutes after target time
      // This matches the server-side validation logic
      const onTimeStart = new Date(targetTime);
      onTimeStart.setMinutes(onTimeStart.getMinutes() - 15);
      const onTimeEnd = new Date(targetTime);
      onTimeEnd.setMinutes(onTimeEnd.getMinutes() + 15);
      
      // Check if check-in is within on-time window
      // Use getTime() for precise comparison to avoid timezone issues
      const checkInTimeMs = checkInTime.getTime();
      const onTimeStartMs = onTimeStart.getTime();
      const onTimeEndMs = onTimeEnd.getTime();
      const targetTimeMs = targetTime.getTime();
      
      const isOnTime = checkInTimeMs >= onTimeStartMs && checkInTimeMs <= onTimeEndMs;
      
      return {
        attendance,
        status: attendance.status,
        timeStatus: isOnTime ? 'on_time' : 'late',
        hasCheckedIn: true
      };
    } else {
      // No check-in yet
      return {
        attendance: null,
        status: null,
        timeStatus: timeStatus,
        hasCheckedIn: false
      };
    }
  };

  // Calculate attendance percentage based on approved check-ins (not completed sessions)
  // This matches the display logic in the table
  const calculateAttendancePercentageByCheckIns = useCallback((participant: ParticipantWithAttendance): { percentage: number; approved: number; total: number } => {
    if (!activity) return { percentage: 0, approved: 0, total: 0 };
    
    let totalCheckIns = 0;
    let approvedCheckIns = 0;
    
    if (activity.type === 'single_day' && activity.timeSlots) {
      const activeSlots = activity.timeSlots.filter((s: any) => s.isActive);
      totalCheckIns = activeSlots.length * 2; // Each slot has start and end
      
      activeSlots.forEach((slot: any) => {
        const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', activity.date);
        const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', activity.date);
        
        if (startStatus.attendance?.status === 'approved') {
          approvedCheckIns++;
        }
        if (endStatus.attendance?.status === 'approved') {
          approvedCheckIns++;
        }
      });
    } else if (activity.type === 'multiple_days' && activity.schedule) {
      const dayTimeSlots = activity.timeSlots?.filter((s: any) => s.isActive) || [];
      const slotsToUse = dayTimeSlots.length > 0 ? dayTimeSlots : [
        { name: 'Buổi Sáng', id: 'morning', startTime: '08:00', endTime: '11:30', isActive: true },
        { name: 'Buổi Chiều', id: 'afternoon', startTime: '13:00', endTime: '17:00', isActive: true },
        { name: 'Buổi Tối', id: 'evening', startTime: '18:00', endTime: '21:00', isActive: true }
      ];
      
      activity.schedule.forEach((scheduleDay: any) => {
        const dayDateString = scheduleDay.date;
        const dayNumber = scheduleDay.day;
        
        slotsToUse.forEach((slot: any) => {
          totalCheckIns += 2; // Each slot has start and end
          
          const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', dayDateString, dayNumber);
          const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', dayDateString, dayNumber);
          
          if (startStatus.attendance?.status === 'approved') {
            approvedCheckIns++;
          }
          if (endStatus.attendance?.status === 'approved') {
            approvedCheckIns++;
          }
        });
      });
    }
    
    const percentage = totalCheckIns > 0 
      ? Math.round((approvedCheckIns / totalCheckIns) * 100)
      : 0;
    
    return { percentage, approved: approvedCheckIns, total: totalCheckIns };
  }, [activity, getAttendanceStatusWithTime]);

  // Check if participant has registered for a specific day and slot (sync with officer logic)
  const isParticipantRegisteredForSlot = useCallback((
    participant: ParticipantWithAttendance, 
    day: number | undefined, 
    slotName: string
  ): boolean => {
    // For single_day activities
    if (!activity || activity.type === 'single_day') {
      if (!participant.registeredDaySlots || participant.registeredDaySlots.length === 0) {
        return true; // Backward compatibility: assume registered for all slots
      }
      // For single_day, check if participant has registered for this specific slot
      // Map slot name to slot key
      const slotKeyMap: { [key: string]: 'morning' | 'afternoon' | 'evening' } = {
        'Buổi Sáng': 'morning',
        'Buổi Chiều': 'afternoon',
        'Buổi Tối': 'evening'
      };
      
      const normalizedSlotName = slotName.trim();
      let slotKey = slotKeyMap[normalizedSlotName];
      
      // Fallback pattern matching
      if (!slotKey) {
        const lowerSlotName = normalizedSlotName.toLowerCase();
        if (lowerSlotName.includes('sáng') || lowerSlotName.includes('morning')) {
          slotKey = 'morning';
        } else if (lowerSlotName.includes('chiều') || lowerSlotName.includes('afternoon')) {
          slotKey = 'afternoon';
        } else if (lowerSlotName.includes('tối') || lowerSlotName.includes('evening')) {
          slotKey = 'evening';
        }
      }
      
      if (!slotKey) return false;
      
      // Check if participant has registered for this slot (any day, since it's single_day)
      return participant.registeredDaySlots.some(
        (ds) => ds.slot === slotKey
      );
    }
    
    // For multiple_days activities, check if participant has registered for this specific day and slot
    if (!participant.registeredDaySlots || participant.registeredDaySlots.length === 0) {
      return false; // No registration means not registered
    }
    
    // Map slot name to slot key (exact match only, as per schema: 'Buổi Sáng', 'Buổi Chiều', 'Buổi Tối')
    const timeSlotMap: { [key: string]: 'morning' | 'afternoon' | 'evening' } = {
      'Buổi Sáng': 'morning',
      'Buổi Chiều': 'afternoon',
      'Buổi Tối': 'evening'
    };
    
    // Normalize slot name (trim whitespace)
    const normalizedSlotName = slotName.trim();
    const slotKey = timeSlotMap[normalizedSlotName];
    
    if (!slotKey) {
      // If exact match fails, try case-insensitive and pattern matching as fallback
      const lowerSlotName = normalizedSlotName.toLowerCase();
      let fallbackSlotKey: 'morning' | 'afternoon' | 'evening' | null = null;
      
      if (lowerSlotName.includes('sáng') || lowerSlotName === 'buổi sáng' || lowerSlotName.includes('morning')) {
        fallbackSlotKey = 'morning';
      } else if (lowerSlotName.includes('chiều') || lowerSlotName === 'buổi chiều' || lowerSlotName.includes('afternoon')) {
        fallbackSlotKey = 'afternoon';
      } else if (lowerSlotName.includes('tối') || lowerSlotName === 'buổi tối' || lowerSlotName.includes('evening')) {
        fallbackSlotKey = 'evening';
      }
      
      if (!fallbackSlotKey) {
        return false;
      }
      
      // Check if participant has registered for this day and slot using fallback key
      return participant.registeredDaySlots.some(
        (ds) => ds.day === day && ds.slot === fallbackSlotKey
      );
    }
    
    // Check if participant has registered for this day and slot
    return participant.registeredDaySlots.some(
      (ds) => ds.day === day && ds.slot === slotKey
    );
  }, [activity]);

  // Calculate overall attendance percentage for a participant (based on sessions, not check-ins)
  // A session is considered completed only if both start and end check-ins are approved
  const calculateOverallAttendancePercentage = useCallback((participant: ParticipantWithAttendance): { percentage: number; completed: number; total: number } => {
    if (!activity) return { percentage: 0, completed: 0, total: 0 };
    
    let totalSessions = 0;
    let completedSessions = 0;
    
    if (activity.type === 'single_day' && activity.timeSlots) {
      const activeSlots = activity.timeSlots.filter((s: any) => s.isActive);
      totalSessions = activeSlots.length; // Total number of sessions
      
      activeSlots.forEach((slot: any) => {
        const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', activity.date);
        const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', activity.date);
        
        // A slot is considered attended if at least one check-in (start or end) is approved
        if (startStatus.attendance?.status === 'approved' || endStatus.attendance?.status === 'approved') {
          completedSessions++;
        }
      });
    } else if (activity.type === 'multiple_days' && activity.schedule) {
      // Get active slots, with fallback to default 3 slots if none exist
      const dayTimeSlots = activity.timeSlots?.filter((s: any) => s.isActive) || [];
      const slotsToUse = dayTimeSlots.length > 0 ? dayTimeSlots : [
        { name: 'Buổi Sáng', id: 'morning', startTime: '08:00', endTime: '11:30', isActive: true },
        { name: 'Buổi Chiều', id: 'afternoon', startTime: '13:00', endTime: '17:00', isActive: true },
        { name: 'Buổi Tối', id: 'evening', startTime: '18:00', endTime: '21:00', isActive: true }
      ];
      
      // Calculate for all days in schedule
      activity.schedule.forEach((scheduleDay: any) => {
        const dayDateString = scheduleDay.date;
        const dayNumber = scheduleDay.day;
        
        // Each slot in each day is one session - Only count registered slots
        slotsToUse.forEach((slot: any) => {
          // Check if participant has registered for this slot
          const isRegisteredForSlot = isParticipantRegisteredForSlot(participant, dayNumber, slot.name);
          
          // Only count registered slots
          if (isRegisteredForSlot) {
            totalSessions++; // Each registered slot is one session
            
            // Use getAttendanceStatusWithTime to properly match attendance
            const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', dayDateString, dayNumber);
            const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', dayDateString, dayNumber);
            
            // A slot is considered attended if at least one check-in (start or end) is approved
            const hasStartApproved = startStatus.attendance?.status === 'approved';
            const hasEndApproved = endStatus.attendance?.status === 'approved';
            
            if (hasStartApproved || hasEndApproved) {
              completedSessions++;
            }
          }
        });
      });
    }
    
    // Calculate percentage
    const percentage = totalSessions > 0 
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;
    
    // Ensure completedSessions never exceeds totalSessions (for display purposes)
    const finalCompleted = Math.min(completedSessions, totalSessions);
    
    return { percentage, completed: finalCompleted, total: totalSessions };
  }, [activity, getAttendanceStatusWithTime, isParticipantRegisteredForSlot]);

  // Export selected participants to Excel
  const handleExportExcel = useCallback(() => {
    if (selectedParticipants.size === 0) {
      alert('Vui lòng chọn ít nhất một thành viên để xuất Excel');
      return;
    }

    try {
      // Get selected participants
      const selectedData = participants.filter(p => selectedParticipants.has(p.userId));
      
      // Calculate attendance stats for each participant
      const excelData = selectedData.map((participant, index) => {
        const overallStats = calculateOverallAttendancePercentage(participant);
        const overallPercentage = overallStats.percentage;
        const completedSessions = overallStats.completed;
        const totalSessions = overallStats.total;

        // Build base row data
        const row: any = {
          'STT': index + 1,
          'Họ và tên': participant.name,
          'Email': participant.email,
          'Vai trò': participant.role,
          'Tổng phần trăm tham gia': `${overallPercentage}%`,
          'Số buổi đã hoàn thành': completedSessions,
          'Tổng số buổi': totalSessions,
        };

        // Add attendance details based on activity type
        if (activity?.type === 'single_day' && activity.timeSlots) {
          const activeSlots = activity.timeSlots.filter((s: any) => s.isActive);
          activeSlots.forEach((slot: any) => {
            const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', activity.date);
            const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', activity.date);
            
            row[`${slot.name} - Đầu buổi`] = startStatus.attendance?.status === 'approved' 
              ? (startStatus.timeStatus === 'on_time' ? '✓ Đúng giờ' : '✓ Trễ')
              : startStatus.attendance?.status === 'rejected' 
                ? '✗ Từ chối'
                : startStatus.attendance?.status === 'pending'
                  ? '⏳ Chờ duyệt'
                  : 'Vắng';
            
            row[`${slot.name} - Cuối buổi`] = endStatus.attendance?.status === 'approved' 
              ? (endStatus.timeStatus === 'on_time' ? '✓ Đúng giờ' : '✓ Trễ')
              : endStatus.attendance?.status === 'rejected' 
                ? '✗ Từ chối'
                : endStatus.attendance?.status === 'pending'
                  ? '⏳ Chờ duyệt'
                  : 'Vắng';
          });
        } else if (activity?.type === 'multiple_days' && activity.schedule) {
          // For multi-day, add summary for each day
          activity.schedule.forEach((scheduleDay: any) => {
            const dayNumber = scheduleDay.day;
            const dayDateString = scheduleDay.date;
            
            // Count completed sessions for this day
            const dayTimeSlots = activity.timeSlots?.filter((s: any) => s.isActive) || [];
            const slotsToUse = dayTimeSlots.length > 0 ? dayTimeSlots : [
              { name: 'Buổi Sáng', id: 'morning', startTime: '08:00', endTime: '11:30', isActive: true },
              { name: 'Buổi Chiều', id: 'afternoon', startTime: '13:00', endTime: '17:00', isActive: true },
              { name: 'Buổi Tối', id: 'evening', startTime: '18:00', endTime: '21:00', isActive: true }
            ];
            
            let dayCompleted = 0;
            let dayTotal = slotsToUse.length;
            
            slotsToUse.forEach((slot: any) => {
              const dayAttendances = participant.attendances?.filter(a => {
                const timeSlot = a.timeSlot || '';
                const dayMatch = timeSlot.match(/Ngày\s*(\d+)/);
                return dayMatch && parseInt(dayMatch[1]) === dayNumber;
              }) || [];
              
              const startAttendance = dayAttendances.find((att: any) => {
                const timeSlot = att.timeSlot || '';
                const slotMatch = timeSlot.match(/Buổi\s*(Sáng|Chiều|Tối)/i);
                if (!slotMatch) return false;
                const slotNameInRecord = slotMatch[1];
                const slotName = slot.name;
                if (slotNameInRecord === 'Sáng') {
                  return slotName.includes('Sáng') || slotName.toLowerCase().includes('morning');
                } else if (slotNameInRecord === 'Chiều') {
                  return slotName.includes('Chiều') || slotName.toLowerCase().includes('afternoon');
                } else if (slotNameInRecord === 'Tối') {
                  return slotName.includes('Tối') || slotName.toLowerCase().includes('evening');
                }
                return false;
              });
              
              const endAttendance = dayAttendances.find((att: any) => {
                const timeSlot = att.timeSlot || '';
                const slotMatch = timeSlot.match(/Buổi\s*(Sáng|Chiều|Tối)/i);
                if (!slotMatch) return false;
                const slotNameInRecord = slotMatch[1];
                const slotName = slot.name;
                if (slotNameInRecord === 'Sáng') {
                  return slotName.includes('Sáng') || slotName.toLowerCase().includes('morning');
                } else if (slotNameInRecord === 'Chiều') {
                  return slotName.includes('Chiều') || slotName.toLowerCase().includes('afternoon');
                } else if (slotNameInRecord === 'Tối') {
                  return slotName.includes('Tối') || slotName.toLowerCase().includes('evening');
                }
                return false;
              });
              
              if (startAttendance && startAttendance.checkInType === 'start' && startAttendance.status === 'approved' &&
                  endAttendance && endAttendance.checkInType === 'end' && endAttendance.status === 'approved') {
                dayCompleted++;
              }
            });
            
            const dayPercentage = dayTotal > 0 ? Math.round((dayCompleted / dayTotal) * 100) : 0;
            row[`Ngày ${dayNumber} (${new Date(dayDateString).toLocaleDateString('vi-VN')})`] = `${dayCompleted}/${dayTotal} buổi (${dayPercentage}%)`;
          });
        }

        return row;
      });

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const columnWidths = [
        { wch: 5 },  // STT
        { wch: 25 }, // Họ và tên
        { wch: 30 }, // Email
        { wch: 15 }, // Vai trò
        { wch: 20 }, // Tổng phần trăm tham gia
        { wch: 20 }, // Số buổi đã hoàn thành
        { wch: 15 }, // Tổng số buổi
      ];
      
      // Add widths for attendance columns
      if (activity?.type === 'single_day' && activity.timeSlots) {
        const activeSlots = activity.timeSlots.filter((s: any) => s.isActive);
        activeSlots.forEach(() => {
          columnWidths.push({ wch: 18 }); // Đầu buổi
          columnWidths.push({ wch: 18 }); // Cuối buổi
        });
      } else if (activity?.type === 'multiple_days' && activity.schedule) {
        activity.schedule.forEach(() => {
          columnWidths.push({ wch: 25 }); // Mỗi ngày
        });
      }
      
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Điểm danh');

      // Generate filename
      const activityName = activity?.name || 'Hoạt động';
      const sanitizedActivityName = activityName.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `DiemDanh_${sanitizedActivityName}_${dateStr}.xlsx`;

      // Write file
      XLSX.writeFile(workbook, filename);

      alert(`✅ Đã xuất Excel thành công! (${selectedData.length} thành viên)`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('❌ Có lỗi xảy ra khi xuất Excel');
    }
  }, [selectedParticipants, participants, activity, calculateOverallAttendancePercentage, getAttendanceStatusWithTime]);

  const getAttendanceStatus = (participant: ParticipantWithAttendance, timeSlot: string, checkInType: 'start' | 'end') => {
    return participant.attendances?.find(
      (a) => a.timeSlot === timeSlot && a.checkInType === checkInType
    );
  };

  // Get day name in Vietnamese
  const getDayName = (dayOfWeek: number) => {
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    return dayNames[dayOfWeek] || '';
  };

  // Helper function to check if attendance is manual check-in
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
      // Note: In admin view, we might not have validateLocation, so we'll rely on verificationNote
      if (!attendance.photoUrl && attendance.verificationNote) {
        return true;
      }
    }
    return false;
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
      
      if (verifiedBy.email && typeof verifiedBy.email === 'string' && verifiedBy.email.trim().length > 0) {
        return verifiedBy.email.trim();
      }
    }
    
    return 'Hệ thống tự động';
  };

  // Group schedule days by week (Monday to Sunday) - Always 7 days per week
  const groupDaysByWeek = useMemo(() => {
    if (!activity || activity.type !== 'multiple_days' || !activity.schedule || activity.schedule.length === 0) return [];
    
    const weeks: Array<Array<any>> = [];
    
    // Sort schedule by date to ensure correct order
    const sortedSchedule = [...activity.schedule].sort((a: any, b: any) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });
    
    if (sortedSchedule.length === 0) return [];
    
    // Find the first Monday (or the first day if it's Monday)
    const firstDay = new Date(sortedSchedule[0].date);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const mondayBasedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    // Calculate the Monday of the first week
    const firstMonday = new Date(firstDay);
    firstMonday.setDate(firstDay.getDate() - mondayBasedFirstDay);
    firstMonday.setHours(0, 0, 0, 0);
    
    // Find the last day
    const lastDay = new Date(sortedSchedule[sortedSchedule.length - 1].date);
    const lastDayOfWeek = lastDay.getDay();
    const mondayBasedLastDay = lastDayOfWeek === 0 ? 6 : lastDayOfWeek - 1;
    
    // Calculate the Sunday of the last week
    const lastSunday = new Date(lastDay);
    lastSunday.setDate(lastDay.getDate() + (6 - mondayBasedLastDay));
    lastSunday.setHours(23, 59, 59, 999);
    
    // Create a map of schedule days by date string (YYYY-MM-DD)
    const scheduleMap = new Map<string, any>();
    sortedSchedule.forEach((day: any) => {
      const dayDate = new Date(day.date);
      const dateKey = dayDate.toISOString().split('T')[0];
      scheduleMap.set(dateKey, {
        ...day,
        dateObj: dayDate
      });
    });
    
    // Generate weeks (Monday to Sunday, always 7 days)
    let currentMonday = new Date(firstMonday);
    
    while (currentMonday <= lastSunday) {
      const week: Array<any> = [];
      
      // Generate 7 days for this week (Monday to Sunday)
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(currentMonday);
        dayDate.setDate(currentMonday.getDate() + i);
        dayDate.setHours(0, 0, 0, 0);
        
        const dateKey = dayDate.toISOString().split('T')[0];
        const scheduleDay = scheduleMap.get(dateKey);
        
        if (scheduleDay) {
          // Day has schedule
          const dayOfWeek = dayDate.getDay();
          const mondayBasedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          
          week.push({
            ...scheduleDay,
            dayOfWeek: mondayBasedDay,
            dateObj: dayDate,
            hasSchedule: true
          });
        } else {
          // Day doesn't have schedule, but still include it for display
          const dayOfWeek = dayDate.getDay();
          const mondayBasedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          
          week.push({
            day: null,
            date: dateKey,
            dateObj: dayDate,
            dayOfWeek: mondayBasedDay,
            hasSchedule: false
          });
        }
      }
      
      // Only add week if it has at least one day with schedule
      if (week.some((d: any) => d.hasSchedule)) {
        weeks.push(week);
      }
      
      // Move to next Monday
      currentMonday.setDate(currentMonday.getDate() + 7);
    }
    
    return weeks;
  }, [activity]);

  // Get current week's days - Always 7 days (Monday to Sunday), include all days for display
  const currentWeekDays = useMemo(() => {
    if (groupDaysByWeek.length === 0) return [];
    if (currentWeekIndex >= groupDaysByWeek.length) return [];
    const week = groupDaysByWeek[currentWeekIndex] || [];
    // Return all 7 days (including days without schedule)
    return week;
  }, [groupDaysByWeek, currentWeekIndex]);

  // Get filtered week days (only days with schedule) for table display
  const currentWeekDaysWithSchedule = useMemo(() => {
    if (selectedDay !== null) {
      // If a day is selected, filter to show only that day
      return currentWeekDays.filter((day: any) => day.hasSchedule && day.day === selectedDay);
    }
    // Otherwise, show all days with schedule
    return currentWeekDays.filter((day: any) => day.hasSchedule);
  }, [currentWeekDays, selectedDay]);

  // Get week date range - Use all 7 days for range display
  const weekDateRange = useMemo(() => {
    if (currentWeekDays.length === 0) return '';
    const firstDay = currentWeekDays[0]?.dateObj;
    const lastDay = currentWeekDays[currentWeekDays.length - 1]?.dateObj;
    if (!firstDay || !lastDay) return '';
    return `${firstDay.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${lastDay.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  }, [currentWeekDays]);

  // Reset selectedDay when week changes
  useEffect(() => {
    setSelectedDay(null);
  }, [currentWeekIndex]);

  // Check access permission
  if (!canAccess) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Bạn không có quyền truy cập trang này</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Quay lại
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Đang tải dữ liệu...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !activity) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{error || 'Không tìm thấy hoạt động'}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Quay lại
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div 
        className={`min-h-screen flex flex-col transition-colors duration-300 overflow-x-hidden ${
          isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20'
        }`}
        style={{
          '--sidebar-width': isSidebarOpen ? '288px' : '80px'
        } as React.CSSProperties}
      >
        {isAdmin ? <AdminNav /> : <OfficerNav />}
        
        <main 
          className="flex-1 transition-all duration-300 px-2 sm:px-3 lg:px-4 py-2 sm:py-3 overflow-x-hidden min-w-0"
          style={{
            marginLeft: isDesktop ? (isSidebarOpen ? '288px' : '80px') : '0',
            width: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%',
            maxWidth: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%'
          }}
        >
          {/* Header */}
          <div className="mb-3">
            <div className={`rounded-lg ${isDarkMode ? 'bg-gradient-to-r from-gray-800/80 to-gray-800/60' : 'bg-white/90'} backdrop-blur-md shadow-md border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'} p-3`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => router.back()}
                    className={`p-1.5 rounded-lg transition-all duration-200 ${
                      isDarkMode 
                        ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <ArrowLeft size={18} strokeWidth={2.5} />
                  </button>
                  <div>
                    <h1 className={`text-lg sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Chi tiết hoạt động
                    </h1>
                    <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {activity.name}
                    </p>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleEdit}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm hover:shadow-md text-sm ${
                        isDarkMode
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white'
                      }`}
                    >
                      <Edit size={16} strokeWidth={2.5} />
                      <span className="font-medium">Chỉnh sửa</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm hover:shadow-md text-sm ${
                        isDarkMode
                          ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white'
                          : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white'
                      }`}
                    >
                      <Trash2 size={16} strokeWidth={2.5} />
                      <span className="font-medium">Xóa</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity Info Section */}
          <div className={`mb-3 p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-gradient-to-br from-gray-800/50 to-gray-800/30 border-gray-700/50' : 'bg-gradient-to-br from-white to-gray-50/50 border-gray-200/50'} shadow-md backdrop-blur-sm`}>
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
              {/* Activity Image */}
              <div className="flex-shrink-0 w-full sm:w-auto">
                {activity.imageUrl ? (
                  <div className="relative group">
                    <Image
                      src={activity.imageUrl}
                      alt={activity.name}
                      width={100}
                      height={100}
                      className="rounded-lg object-cover border border-gray-300 dark:border-gray-600 shadow-md transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                ) : (
                  <div className={`w-[100px] h-[100px] rounded-lg flex items-center justify-center border shadow-md transition-all duration-300 ${
                    activity.type === 'single_day'
                      ? isDarkMode 
                        ? 'bg-gradient-to-br from-blue-900/40 to-blue-800/30 border-blue-600/50' 
                        : 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-300'
                      : isDarkMode 
                        ? 'bg-gradient-to-br from-purple-900/40 to-purple-800/30 border-purple-600/50' 
                        : 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-300'
                  }`}>
                    {activity.type === 'single_day' ? (
                      <Calendar size={40} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={2} />
                    ) : (
                      <CalendarDays size={40} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} strokeWidth={2} />
                    )}
                  </div>
                )}
              </div>
              
              {/* Activity Details */}
              <div className="flex-1 min-w-0">
                <h2 className={`text-lg sm:text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {activity.name}
                </h2>
                <div className="space-y-2">
                  {/* Date */}
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
                      <Calendar size={14} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} strokeWidth={2.5} />
                    </div>
                    <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      {activity.type === 'single_day' 
                        ? new Date(activity.date).toLocaleDateString('vi-VN', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : activity.startDate && activity.endDate
                          ? `${new Date(activity.startDate).toLocaleDateString('vi-VN')} - ${new Date(activity.endDate).toLocaleDateString('vi-VN')}`
                          : new Date(activity.date).toLocaleDateString('vi-VN')
                      }
                    </p>
                  </div>
                  
                  {/* Location */}
                  {activity.location && (
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
                        <MapPin size={14} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} strokeWidth={2.5} />
                      </div>
                      <p className={`text-xs sm:text-sm font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        {activity.location}
                      </p>
                    </div>
                  )}
                  
                  {/* Max Participants */}
                  {activity.maxParticipants && (
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
                        <Users size={14} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} strokeWidth={2.5} />
                      </div>
                      <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Tối đa {activity.maxParticipants} người tham gia
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Responsible Person */}
          {activity.responsiblePerson && activity.responsiblePerson.name && (
            <div className={`mb-3 p-3 sm:p-4 rounded-lg border shadow-md backdrop-blur-sm ${
              isDarkMode 
                ? 'bg-gradient-to-br from-blue-900/40 via-indigo-900/30 to-blue-900/40 border-blue-500/30' 
                : 'bg-gradient-to-br from-blue-50 via-indigo-50/50 to-blue-50 border-blue-200/50'
            }`}>
              <h3 className={`text-sm font-bold mb-2 flex items-center gap-2 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-800'
              }`}>
                <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
                  <UserCircle size={14} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} strokeWidth={2.5} />
                </div>
                <span>Người phụ trách</span>
              </h3>
              <div className="flex items-center gap-3">
                {activity.responsiblePerson.avatarUrl ? (
                  <div className="relative group">
                    <Image
                      src={activity.responsiblePerson.avatarUrl}
                      alt={activity.responsiblePerson.name}
                      width={56}
                      height={56}
                      className="rounded-lg object-cover border border-blue-400 shadow-md transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-md"></div>
                  </div>
                ) : (
                  <div className={`relative w-14 h-14 rounded-lg flex items-center justify-center border shadow-md transition-transform duration-300 hover:scale-105 ${
                    isDarkMode 
                      ? 'bg-gradient-to-br from-blue-600/40 to-indigo-600/30 border-blue-500/50 text-blue-300' 
                      : 'bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-300 text-blue-700'
                  }`}>
                    {(() => {
                      const name = activity.responsiblePerson?.name || '';
                      const nameParts = name.trim().split(' ').filter(p => p.length > 0);
                      const initials = nameParts.length > 0 
                        ? nameParts[nameParts.length - 1][0].toUpperCase()
                        : name[0]?.toUpperCase() || '?';
                      return (
                        <span className="text-lg font-bold">{initials}</span>
                      );
                    })()}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-md"></div>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <p className={`text-sm sm:text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {activity.responsiblePerson.name}
                    </p>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      isDarkMode 
                        ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50' 
                        : 'bg-blue-100 text-blue-700 border border-blue-300'
                    }`}>
                      Phụ trách
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={2.5} />
                    <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {activity.responsiblePerson.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Participants Table */}
          <div className={`rounded-lg border overflow-hidden shadow-md backdrop-blur-sm ${
            isDarkMode ? 'border-gray-700/50 bg-gray-800/30' : 'border-gray-200/50 bg-white/80'
          }`}>
            <div className={`px-3 sm:px-4 py-2.5 sm:py-3 border-b ${isDarkMode ? 'bg-gradient-to-r from-gray-800/80 to-gray-800/60 border-gray-700/50' : 'bg-gradient-to-r from-gray-50 to-white border-gray-200/50'}`}>
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                  <h3 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
                      <Users size={16} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} strokeWidth={2.5} />
                    </div>
                    <span>Thành viên tham gia</span>
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-lg ${
                      isDarkMode ? 'bg-purple-600/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {participants.length}
                    </span>
                    {selectedParticipants.size > 0 && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                        isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        Đã chọn: {selectedParticipants.size}
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        if (selectedParticipants.size === participants.length) {
                          setSelectedParticipants(new Set());
                        } else {
                          setSelectedParticipants(new Set(participants.map(p => p.userId)));
                        }
                      }}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm hover:shadow-md text-xs sm:text-sm ${
                        isDarkMode
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white'
                      }`}
                      title={selectedParticipants.size === participants.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    >
                      {selectedParticipants.size === participants.length ? (
                        <>
                          <Square size={14} strokeWidth={2.5} />
                          <span className="font-medium">Bỏ chọn tất cả</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare size={14} strokeWidth={2.5} />
                          <span className="font-medium">Chọn tất cả</span>
                        </>
                      )}
                    </button>
                    {selectedParticipants.size > 0 && (
                      <button
                        onClick={handleExportExcel}
                        className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm hover:shadow-md text-xs sm:text-sm ${
                          isDarkMode
                            ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white'
                            : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white'
                        }`}
                        title="Xuất Excel các hàng đã chọn"
                      >
                        <FileSpreadsheet size={14} strokeWidth={2.5} />
                        <span className="font-medium">Xuất Excel ({selectedParticipants.size})</span>
                      </button>
                    )}
                  </div>
                </div>
                {/* Week Navigation with Day Selector - Show all 7 days */}
                {activity.type === 'multiple_days' && currentWeekDays.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {/* Week Navigation Header */}
                    {groupDaysByWeek.length > 1 && (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setCurrentWeekIndex(Math.max(0, currentWeekIndex - 1));
                            setSelectedDay(null); // Reset selected day when changing week
                          }}
                          disabled={currentWeekIndex === 0}
                          className={`p-1 rounded-lg transition-all ${
                            currentWeekIndex === 0
                              ? 'opacity-40 cursor-not-allowed'
                              : isDarkMode
                                ? 'hover:bg-gray-600 text-gray-300'
                                : 'hover:bg-gray-200 text-gray-600'
                          }`}
                        >
                          <ChevronLeft size={16} strokeWidth={2.5} />
                        </button>
                        
                        <div className={`flex items-center gap-1.5 px-3 rounded-lg ${
                          isDarkMode 
                            ? 'bg-gray-800/50 border border-gray-700' 
                            : 'bg-gray-100 border border-gray-300'
                        }`}>
                          <Calendar size={16} strokeWidth={2} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                          <span className={`text-xs font-bold ${
                            isDarkMode ? 'text-gray-100' : 'text-gray-900'
                          }`}>
                            Tuần {currentWeekIndex + 1} / {groupDaysByWeek.length}
                          </span>
                          {weekDateRange && (
                            <span className={`text-[9px] ml-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              ({weekDateRange.split(' - ')[0]} - {weekDateRange.split(' - ')[1]})
                            </span>
                          )}
                        </div>
                        
                        <button
                          onClick={() => {
                            setCurrentWeekIndex(Math.min(groupDaysByWeek.length - 1, currentWeekIndex + 1));
                            setSelectedDay(null); // Reset selected day when changing week
                          }}
                          disabled={currentWeekIndex >= groupDaysByWeek.length - 1}
                          className={`p-1 rounded-lg transition-all ${
                            currentWeekIndex >= groupDaysByWeek.length - 1
                              ? 'opacity-40 cursor-not-allowed'
                              : isDarkMode
                                ? 'hover:bg-gray-600 text-gray-300'
                                : 'hover:bg-gray-200 text-gray-600'
                          }`}
                        >
                          <ChevronRight size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                    
                    {/* Week Days Row - Show all 7 days */}
                    <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-2">
                      {currentWeekDays.map((dayInfo: any, index: number) => {
                        const dayDate = dayInfo.dateObj || new Date(dayInfo.date);
                        const dayDateStr = dayDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                        const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
                        const shortDayName = dayNames[index] || getDayName(dayInfo.dayOfWeek || 0);
                        
                        const isSelected = selectedDay === dayInfo.day;
                        const hasActivity = dayInfo.hasSchedule === true;
                        
                        // Calculate attendance stats for this day (only count registered slots)
                        let totalCheckIns = 0;
                        let totalPossibleCheckIns = 0; // Only count registered slots
                        let attendancePercentage = 0;
                        
                        if (hasActivity && dayInfo.day !== null && activity.timeSlots) {
                          const activeSlots = activity.timeSlots.filter((s: any) => s.isActive);
                          
                          // Count total check-ins (approved only) for all participants for this day
                          // Only count slots that participants have registered for
                          participants.forEach((p) => {
                            activeSlots.forEach((slot: any) => {
                              // Only count if participant has registered for this slot
                              if (isParticipantRegisteredForSlot(p, dayInfo.day, slot.name)) {
                                // This slot counts as 2 check-ins (start + end)
                                totalPossibleCheckIns += 2;
                                
                                // Count actual check-ins for this slot
                                const startStatus = getAttendanceStatusWithTime(p, slot, 'start', dayInfo.date, dayInfo.day);
                                const endStatus = getAttendanceStatusWithTime(p, slot, 'end', dayInfo.date, dayInfo.day);
                                
                                if (startStatus.hasCheckedIn && startStatus.attendance?.status === 'approved') {
                                  totalCheckIns++;
                                }
                                if (endStatus.hasCheckedIn && endStatus.attendance?.status === 'approved') {
                                  totalCheckIns++;
                                }
                              }
                            });
                          });
                          
                          // Calculate percentage
                          if (totalPossibleCheckIns > 0) {
                            attendancePercentage = Math.round((totalCheckIns / totalPossibleCheckIns) * 100);
                          }
                        }
                        
                        return (
                          <button
                            key={index}
                            onClick={() => {
                              if (hasActivity && dayInfo.day !== null) {
                                // Toggle: if already selected, deselect; otherwise select
                                setSelectedDay(selectedDay === dayInfo.day ? null : dayInfo.day);
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
                            
                            {hasActivity && dayInfo.day !== null ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <span className={`px-1 py-0.5 rounded-full text-[8px] font-bold ${
                                    isSelected
                                      ? 'bg-white/20 text-white'
                                      : isDarkMode
                                        ? 'bg-blue-500/30 text-blue-300'
                                        : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {totalCheckIns}/{totalPossibleCheckIns}
                                  </span>
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
                                </div>
                                <span className={`text-[9px] font-medium ${
                                  isSelected ? 'text-white/90' : 'opacity-70'
                                }`}>
                                  {dayDateStr}
                                </span>
                                {dayInfo.day && (
                                  <span className={`text-[8px] font-medium ${
                                    isSelected ? 'text-white/80' : 'opacity-60'
                                  }`}>
                                    Ngày {dayInfo.day}
                                  </span>
                                )}
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
                    {/* Show "Show All" button when a day is selected */}
                    {selectedDay !== null && (
                      <div className="flex justify-center mt-2">
                        <button
                          onClick={() => setSelectedDay(null)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isDarkMode
                              ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                          }`}
                        >
                          Hiển thị tất cả các ngày
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {participants.length === 0 ? (
              <div className={`text-center py-12 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <Users className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={40} strokeWidth={1.5} />
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Chưa có thành viên tham gia
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
                {/* Overall Attendance Statistics - Above Table Header */}
                {(() => {
                  // Calculate overall attendance percentage for all participants
                  let totalCompletedSessions = 0;
                  let totalSessions = 0;
                  let participantsWithAttendance = 0; // Số người đã có ít nhất 1 buổi điểm danh
                  let participantsCompleted = 0; // Số người đã hoàn thành 100% (tất cả slots đã đăng ký)
                  let totalParticipantsPercentage = 0; // Tổng phần trăm của tất cả người tham gia
                  
                  participants.forEach(participant => {
                    const stats = calculateOverallAttendancePercentage(participant);
                    totalCompletedSessions += stats.completed;
                    totalSessions += stats.total;
                    
                    // Đếm số người đã có ít nhất 1 buổi điểm danh
                    if (stats.completed > 0) {
                      participantsWithAttendance++;
                    }
                    
                    // Đếm số người đã hoàn thành 100% (tất cả slots đã đăng ký đều đã điểm danh)
                    if (stats.percentage === 100 && stats.total > 0) {
                      participantsCompleted++;
                    }
                    
                    // Tổng phần trăm của tất cả người tham gia (để tính trung bình)
                    totalParticipantsPercentage += stats.percentage;
                  });
                  
                  // Phần trăm trung bình của tất cả người tham gia
                  const averagePercentage = participants.length > 0 
                    ? Math.round(totalParticipantsPercentage / participants.length)
                    : 0;
                  
                  // Phần trăm tổng số buổi đã hoàn thành / tổng số buổi
                  const overallPercentage = totalSessions > 0 
                    ? Math.round((totalCompletedSessions / totalSessions) * 100)
                    : 0;
                  
                  // Phần trăm số người đã hoàn thành 100% / tổng số người tham gia
                  const participantsAttendanceRate = participants.length > 0
                    ? Math.round((participantsCompleted / participants.length) * 100)
                    : 0;
                  
                  // Tính tổng số lần điểm danh trễ và vắng
                  let totalLateCheckIns = 0;
                  let totalAbsentCheckIns = 0;
                  let totalPossibleCheckIns = 0;
                  
                  if (activity.type === 'single_day' && activity.timeSlots) {
                    const activeSlots = activity.timeSlots.filter((s: any) => s.isActive);
                    totalPossibleCheckIns = activeSlots.length * 2 * participants.length; // Mỗi slot có start và end, nhân với số người
                    
                    participants.forEach(participant => {
                      activeSlots.forEach((slot: any) => {
                        const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', activity.date);
                        const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', activity.date);
                        
                        // Kiểm tra trễ
                        if (startStatus.attendance?.status === 'approved' && startStatus.timeStatus === 'late') {
                          totalLateCheckIns++;
                        }
                        if (endStatus.attendance?.status === 'approved' && endStatus.timeStatus === 'late') {
                          totalLateCheckIns++;
                        }
                        
                        // Kiểm tra vắng - chỉ đếm khi slot đã kết thúc
                        // Start check-in: vắng nếu slot đã bắt đầu (in_progress hoặc passed) và không có điểm danh hoặc bị từ chối
                        const startTimeStatus = getTimeStatus(slot, activity.date);
                        if ((startTimeStatus === 'in_progress' || startTimeStatus === 'passed') && 
                            (!startStatus.hasCheckedIn || startStatus.attendance?.status === 'rejected')) {
                          totalAbsentCheckIns++;
                        }
                        
                        // End check-in: vắng nếu slot đã kết thúc (passed) và không có điểm danh hoặc bị từ chối
                        if (startTimeStatus === 'passed' && 
                            (!endStatus.hasCheckedIn || endStatus.attendance?.status === 'rejected')) {
                          totalAbsentCheckIns++;
                        }
                      });
                    });
                  } else if (activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0) {
                    const schedule = activity.schedule; // Store in local variable for TypeScript
                    const dayTimeSlots = activity.timeSlots?.filter((s: any) => s.isActive) || [];
                    const slotsToUse = dayTimeSlots.length > 0 ? dayTimeSlots : [
                      { name: 'Buổi Sáng', id: 'morning', startTime: '08:00', endTime: '11:30', isActive: true },
                      { name: 'Buổi Chiều', id: 'afternoon', startTime: '13:00', endTime: '17:00', isActive: true },
                      { name: 'Buổi Tối', id: 'evening', startTime: '18:00', endTime: '21:00', isActive: true }
                    ];
                    
                    // Tính totalPossibleCheckIns chỉ cho các slot đã đăng ký
                    let registeredCheckInsCount = 0;
                    participants.forEach(participant => {
                      schedule.forEach((scheduleDay: any) => {
                        const dayNumber = scheduleDay.day;
                        slotsToUse.forEach((slot: any) => {
                          if (isParticipantRegisteredForSlot(participant, dayNumber, slot.name)) {
                            registeredCheckInsCount += 2; // start + end
                          }
                        });
                      });
                    });
                    totalPossibleCheckIns = registeredCheckInsCount;
                    
                    participants.forEach(participant => {
                      schedule.forEach((scheduleDay: any) => {
                        const dayDateString = scheduleDay.date;
                        const dayNumber = scheduleDay.day;
                        
                        slotsToUse.forEach((slot: any) => {
                          // Chỉ tính cho các slot đã đăng ký
                          if (!isParticipantRegisteredForSlot(participant, dayNumber, slot.name)) {
                            return;
                          }
                          
                          const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', dayDateString, dayNumber);
                          const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', dayDateString, dayNumber);
                          
                          // Kiểm tra trễ
                          if (startStatus.attendance?.status === 'approved' && startStatus.timeStatus === 'late') {
                            totalLateCheckIns++;
                          }
                          if (endStatus.attendance?.status === 'approved' && endStatus.timeStatus === 'late') {
                            totalLateCheckIns++;
                          }
                          
                          // Kiểm tra vắng - chỉ đếm khi slot đã kết thúc
                          // Start check-in: vắng nếu slot đã bắt đầu (in_progress hoặc passed) và không có điểm danh hoặc bị từ chối
                          const startTimeStatus = getTimeStatus(slot, dayDateString);
                          if ((startTimeStatus === 'in_progress' || startTimeStatus === 'passed') && 
                              (!startStatus.hasCheckedIn || startStatus.attendance?.status === 'rejected')) {
                            totalAbsentCheckIns++;
                          }
                          
                          // End check-in: vắng nếu slot đã kết thúc (passed) và không có điểm danh hoặc bị từ chối
                          if (startTimeStatus === 'passed' && 
                              (!endStatus.hasCheckedIn || endStatus.attendance?.status === 'rejected')) {
                            totalAbsentCheckIns++;
                          }
                        });
                      });
                    });
                  }
                  
                  const latePercentage = totalPossibleCheckIns > 0
                    ? Math.round((totalLateCheckIns / totalPossibleCheckIns) * 100)
                    : 0;
                  
                  const absentPercentage = totalPossibleCheckIns > 0
                    ? Math.round((totalAbsentCheckIns / totalPossibleCheckIns) * 100)
                    : 0;
                  
                  return (
                    <div className={`px-3 py-2 border-b ${
                      isDarkMode ? 'bg-gradient-to-r from-blue-900/50 via-indigo-900/40 to-blue-900/50 border-blue-700/30' : 'bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-blue-50/80 border-blue-200/50'
                    }`}>
                      <div className="flex flex-wrap items-center justify-center gap-2.5">
                        {/* Total Participants Card */}
                        <div className={`px-2.5 py-1.5 rounded-lg border shadow-sm backdrop-blur-sm ${
                          isDarkMode 
                            ? 'bg-gradient-to-br from-blue-800/60 to-blue-900/40 border-blue-500/40' 
                            : 'bg-gradient-to-br from-white to-blue-50/50 border-blue-300/50'
                        }`}>
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${
                              isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'
                            }`}>
                              <Users size={14} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} strokeWidth={2} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-[10px] font-semibold mb-0.5 ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                Tổng số người
                              </p>
                              <p className={`text-base font-bold leading-tight ${
                                isDarkMode ? 'text-blue-300' : 'text-blue-600'
                              }`}>
                                {participants.length}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Participants Attendance Rate Card - Số người đã điểm danh / Tổng số người */}
                        <div className={`px-2.5 py-1.5 rounded-lg border shadow-sm backdrop-blur-sm ${
                          participantsAttendanceRate >= 80
                            ? isDarkMode 
                              ? 'bg-gradient-to-br from-green-800/60 to-emerald-800/40 border-green-500/40' 
                              : 'bg-gradient-to-br from-green-50 to-emerald-50/80 border-green-300/50'
                            : participantsAttendanceRate >= 50
                              ? isDarkMode 
                                ? 'bg-gradient-to-br from-yellow-800/60 to-orange-800/40 border-yellow-500/40' 
                                : 'bg-gradient-to-br from-yellow-50 to-orange-50/80 border-yellow-300/50'
                              : participantsAttendanceRate > 0
                                ? isDarkMode 
                                  ? 'bg-gradient-to-br from-orange-800/60 to-red-800/40 border-orange-500/40' 
                                  : 'bg-gradient-to-br from-orange-50 to-red-50/80 border-orange-300/50'
                                : isDarkMode 
                                  ? 'bg-gray-800/50 border-gray-600/40' 
                                  : 'bg-gray-100 border-gray-300/50'
                        }`}>
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${
                              isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'
                            }`}>
                              <UserCheck size={14} className={
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              } strokeWidth={2} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-[10px] font-semibold mb-0.5 ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                Đã hoàn thành
                              </p>
                              <div className="flex items-baseline gap-1">
                                <p className={`text-base font-bold leading-tight ${
                                  participantsAttendanceRate >= 80
                                    ? isDarkMode ? 'text-green-300' : 'text-green-700'
                                    : participantsAttendanceRate >= 50
                                      ? isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
                                      : participantsAttendanceRate > 0
                                        ? isDarkMode ? 'text-orange-300' : 'text-orange-700'
                                        : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  {participantsAttendanceRate}%
                                </p>
                                <span className={`text-[9px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  ({participantsCompleted}/{participants.length})
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Average Attendance Percentage Card - Phần trăm trung bình của tất cả người tham gia */}
                        <div className={`px-2.5 py-1.5 rounded-lg border shadow-sm backdrop-blur-sm ${
                          averagePercentage >= 80
                            ? isDarkMode 
                              ? 'bg-gradient-to-br from-green-800/60 to-emerald-800/40 border-green-500/40' 
                              : 'bg-gradient-to-br from-green-50 to-emerald-50/80 border-green-300/50'
                            : averagePercentage >= 50
                              ? isDarkMode 
                                ? 'bg-gradient-to-br from-yellow-800/60 to-orange-800/40 border-yellow-500/40' 
                                : 'bg-gradient-to-br from-yellow-50 to-orange-50/80 border-yellow-300/50'
                              : averagePercentage > 0
                                ? isDarkMode 
                                  ? 'bg-gradient-to-br from-orange-800/60 to-red-800/40 border-orange-500/40' 
                                  : 'bg-gradient-to-br from-orange-50 to-red-50/80 border-orange-300/50'
                                : isDarkMode 
                                  ? 'bg-gray-800/50 border-gray-600/40' 
                                  : 'bg-gray-100 border-gray-300/50'
                        }`}>
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${
                              isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'
                            }`}>
                              <CheckCircle2 size={14} className={
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              } strokeWidth={2} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-[10px] font-semibold mb-0.5 ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                Trung bình
                              </p>
                              <div className="flex items-baseline gap-1">
                                <p className={`text-base font-bold leading-tight ${
                                  averagePercentage >= 80
                                    ? isDarkMode ? 'text-green-300' : 'text-green-700'
                                    : averagePercentage >= 50
                                      ? isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
                                      : averagePercentage > 0
                                        ? isDarkMode ? 'text-orange-300' : 'text-orange-700'
                                        : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  {averagePercentage}%
                                </p>
                                <span className={`text-[9px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  ({totalCompletedSessions}/{totalSessions})
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Late Check-ins Percentage Card */}
                        <div className={`px-2.5 py-1.5 rounded-lg border shadow-sm backdrop-blur-sm ${
                          latePercentage >= 30
                            ? isDarkMode 
                              ? 'bg-gradient-to-br from-orange-800/60 to-red-800/40 border-orange-500/40' 
                              : 'bg-gradient-to-br from-orange-50 to-red-50/80 border-orange-300/50'
                            : latePercentage >= 10
                              ? isDarkMode 
                                ? 'bg-gradient-to-br from-yellow-800/60 to-orange-800/40 border-yellow-500/40' 
                                : 'bg-gradient-to-br from-yellow-50 to-orange-50/80 border-yellow-300/50'
                              : latePercentage > 0
                                ? isDarkMode 
                                  ? 'bg-gradient-to-br from-amber-800/60 to-yellow-800/40 border-amber-500/40' 
                                  : 'bg-gradient-to-br from-amber-50 to-yellow-50/80 border-amber-300/50'
                                : isDarkMode 
                                  ? 'bg-gray-800/50 border-gray-600/40' 
                                  : 'bg-gray-100 border-gray-300/50'
                        }`}>
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${
                              isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'
                            }`}>
                              <Clock size={14} className={
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              } strokeWidth={2} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-[10px] font-semibold mb-0.5 ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                Điểm danh trễ
                              </p>
                              <div className="flex items-baseline gap-1">
                                <p className={`text-base font-bold leading-tight ${
                                  latePercentage >= 30
                                    ? isDarkMode ? 'text-orange-300' : 'text-orange-700'
                                    : latePercentage >= 10
                                      ? isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
                                      : latePercentage > 0
                                        ? isDarkMode ? 'text-amber-300' : 'text-amber-700'
                                        : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  {latePercentage}%
                                </p>
                                <span className={`text-[9px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  ({totalLateCheckIns}/{totalPossibleCheckIns})
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Absent Check-ins Percentage Card */}
                        <div className={`px-2.5 py-1.5 rounded-lg border shadow-sm backdrop-blur-sm ${
                          absentPercentage >= 30
                            ? isDarkMode 
                              ? 'bg-gradient-to-br from-red-800/60 to-rose-800/40 border-red-500/40' 
                              : 'bg-gradient-to-br from-red-50 to-rose-50/80 border-red-300/50'
                            : absentPercentage >= 10
                              ? isDarkMode 
                                ? 'bg-gradient-to-br from-orange-800/60 to-red-800/40 border-orange-500/40' 
                                : 'bg-gradient-to-br from-orange-50 to-red-50/80 border-orange-300/50'
                              : absentPercentage > 0
                                ? isDarkMode 
                                  ? 'bg-gradient-to-br from-amber-800/60 to-orange-800/40 border-amber-500/40' 
                                  : 'bg-gradient-to-br from-amber-50 to-orange-50/80 border-amber-300/50'
                                : isDarkMode 
                                  ? 'bg-gray-800/50 border-gray-600/40' 
                                  : 'bg-gray-100 border-gray-300/50'
                        }`}>
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${
                              isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'
                            }`}>
                              <XCircle size={14} className={
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              } strokeWidth={2} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-[10px] font-semibold mb-0.5 ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                Vắng điểm danh
                              </p>
                              <div className="flex items-baseline gap-1">
                                <p className={`text-base font-bold leading-tight ${
                                  absentPercentage >= 30
                                    ? isDarkMode ? 'text-red-300' : 'text-red-700'
                                    : absentPercentage >= 10
                                      ? isDarkMode ? 'text-orange-300' : 'text-orange-700'
                                      : absentPercentage > 0
                                        ? isDarkMode ? 'text-amber-300' : 'text-amber-700'
                                        : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  {absentPercentage}%
                                </p>
                                <span className={`text-[9px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  ({totalAbsentCheckIns}/{totalPossibleCheckIns})
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <table className={`w-full min-w-[800px] border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
                  <thead className={`sticky top-0 z-10 border-b ${isDarkMode ? 'bg-gradient-to-r from-blue-700 to-blue-800 border-blue-600' : 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-500'}`}>
                    <tr>
                      {/* STT Column */}
                      <th className={`px-2 py-2 text-center text-xs font-bold sticky left-0 z-20 border-r ${isDarkMode ? 'text-white bg-gradient-to-br from-blue-700 to-blue-800 border-blue-600' : 'text-white bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500'} min-w-[50px]`}>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold">STT</span>
                          <button
                            onClick={() => {
                              if (selectedParticipants.size === participants.length) {
                                setSelectedParticipants(new Set());
                              } else {
                                setSelectedParticipants(new Set(participants.map(p => p.userId)));
                              }
                            }}
                            className="p-1 rounded hover:bg-blue-700 transition-colors"
                            title={selectedParticipants.size === participants.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                          >
                            {selectedParticipants.size === participants.length ? (
                              <CheckSquare size={16} className="text-white" strokeWidth={2} />
                            ) : (
                              <Square size={16} className="text-white" strokeWidth={2} />
                            )}
                          </button>
                        </div>
                      </th>
                      <th className={`px-3 py-2 text-center text-xs font-bold sticky left-[50px] z-20 border-r ${isDarkMode ? 'text-white bg-gradient-to-br from-blue-700 to-blue-800 border-blue-600' : 'text-white bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500'} min-w-[180px]`}>
                        Thành viên
                      </th>
                      <th className={`px-3 py-2 text-center text-xs font-bold sticky left-[230px] z-20 border-r ${isDarkMode ? 'text-white bg-gradient-to-br from-blue-700 to-blue-800 border-blue-600' : 'text-white bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500'} min-w-[100px]`}>
                        Vai trò
                      </th>
                      {/* Overall Attendance Percentage Column */}
                      <th className={`px-2 py-2 text-center text-xs font-bold sticky left-[330px] z-20 border-r ${isDarkMode ? 'text-white bg-gradient-to-br from-blue-700 to-blue-800 border-blue-600' : 'text-white bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500'} min-w-[120px]`}>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] font-bold text-white">Tổng phần trăm</span>
                          <span className="text-[9px] font-medium text-blue-100">Tham gia</span>
                        </div>
                      </th>
                      {activity.type === 'single_day' && (
                        <>
                          {/* Summary Header for Single Day */}
                          <th className={`px-2 py-2 text-center text-xs font-bold border-l border-b bg-blue-600 border-blue-500 ${
                            isDarkMode ? 'text-white' : 'text-white'
                          } min-w-[90px]`}>
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] font-bold text-white">Tổng hợp</span>
                              <span className="text-[9px] font-medium text-blue-100">
                                {new Date(activity.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                              </span>
                            </div>
                          </th>
                          {/* Individual Slot Headers */}
                          {activity.timeSlots?.filter((s: any) => s.isActive).map((slot: any) => (
                            <th key={slot.id || slot.name} className={`px-1.5 py-2 text-center text-xs font-bold border-l border-b bg-blue-600 border-blue-500 ${
                              isDarkMode ? 'text-white' : 'text-white'
                            } min-w-[110px]`} colSpan={2}>
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[11px] font-bold truncate max-w-[90px] text-white">{slot.name}</span>
                                <div className="flex gap-1.5 text-[10px] font-semibold">
                                  <span className="text-white">Đầu</span>
                                  <span className="text-white">Cuối</span>
                                </div>
                              </div>
                            </th>
                          ))}
                        </>
                      )}
                      {activity.type === 'multiple_days' && currentWeekDaysWithSchedule.length > 0 && (
                        <>
                          {/* Day Headers - Enhanced with colors */}
                          {currentWeekDaysWithSchedule.map((scheduleDay: any, dayIdx: number) => {
                            const dayDate = scheduleDay.dateObj || new Date(scheduleDay.date);
                            const dayName = getDayName(scheduleDay.dayOfWeek);
                            
                            // All day headers use blue-600 color
                            return (
                              <th key={scheduleDay.day} className={`px-2 py-2 text-center text-xs font-bold border-l border-b bg-blue-600 border-blue-500 ${
                                isDarkMode ? 'text-white' : 'text-white'
                              } min-w-[150px]`}>
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-[10px] font-bold text-white">
                                    {dayName}
                                  </span>
                                  <span className="text-[11px] font-extrabold text-white">
                                    Ngày {scheduleDay.day}
                                  </span>
                                  <span className={`text-[9px] font-medium ${isDarkMode ? 'text-blue-100' : 'text-blue-100'}`}>
                                    {dayDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                  </span>
                                </div>
                              </th>
                            );
                          })}
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className={`divide-y-2 ${
                    isDarkMode ? 'divide-gray-700' : 'divide-gray-300'
                  }`}>
                    {participants.map((participant, index) => {
                      const isSelected = selectedParticipants.has(participant.userId);
                      return (
                      <tr 
                        key={participant.userId || index}
                        className={`transition-colors border-b-2 ${
                          isSelected
                            ? isDarkMode 
                              ? 'bg-blue-900/30 border-blue-700' 
                              : 'bg-blue-50 border-blue-300'
                            : isDarkMode 
                              ? 'hover:bg-gray-700/50 border-gray-700' 
                              : 'hover:bg-gray-50 border-gray-300'
                        }`}
                      >
                        {/* STT and Checkbox - Sticky */}
                        <td className={`px-2 py-2 text-center sticky left-0 z-10 border-r-2 ${
                          isSelected
                            ? isDarkMode ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-50 border-blue-300'
                            : isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                        }`}>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-xs font-semibold ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {index + 1}
                            </span>
                            <button
                              onClick={() => {
                                const newSelected = new Set(selectedParticipants);
                                if (isSelected) {
                                  newSelected.delete(participant.userId);
                                } else {
                                  newSelected.add(participant.userId);
                                }
                                setSelectedParticipants(newSelected);
                              }}
                              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                              title={isSelected ? 'Bỏ chọn' : 'Chọn'}
                            >
                              {isSelected ? (
                                <CheckSquare size={14} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={2} />
                              ) : (
                                <Square size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} strokeWidth={2} />
                              )}
                            </button>
                          </div>
                        </td>
                        {/* Member Info - Sticky */}
                        <td className={`px-3 py-2 sticky left-[50px] z-10 border-r-2 ${
                          isSelected
                            ? isDarkMode ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-50 border-blue-300'
                            : isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                        }`}>
                          <div className="flex items-center gap-2">
                            {participant.avatarUrl ? (
                              <Image
                                src={participant.avatarUrl}
                                alt={participant.name}
                                width={32}
                                height={32}
                                className="rounded-full object-cover border border-gray-300 dark:border-gray-600 flex-shrink-0"
                                unoptimized
                              />
                            ) : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0 ${
                                isDarkMode 
                                  ? 'bg-blue-600 border-blue-500 text-white' 
                                  : 'bg-blue-100 border-blue-300 text-blue-700'
                              }`}>
                                {(() => {
                                  const name = participant.name || '';
                                  const nameParts = name.trim().split(' ').filter(p => p.length > 0);
                                  const initials = nameParts.length > 0 
                                    ? nameParts[nameParts.length - 1][0].toUpperCase()
                                    : name[0]?.toUpperCase() || '?';
                                  return (
                                    <span className="text-xs font-bold">{initials}</span>
                                  );
                                })()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className={`font-semibold text-xs truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {participant.name}
                              </p>
                              <p className={`text-[10px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {participant.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        
                        {/* Role - Sticky */}
                        <td className={`px-2 py-2 text-center sticky left-[230px] z-10 border-r-2 ${
                          isSelected
                            ? isDarkMode ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-50 border-blue-300'
                            : isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                        }`}>
                          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                            participant.role === 'Trưởng Nhóm'
                              ? isDarkMode 
                                ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50' 
                                : 'bg-blue-100 text-blue-700 border border-blue-300'
                              : isDarkMode 
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-400/30' 
                                : 'bg-purple-100 text-purple-600 border border-purple-300'
                          }`}>
                            {participant.role}
                          </span>
                        </td>

                        {/* Overall Attendance Percentage - Sticky */}
                        <td className={`px-2 py-2 text-center sticky left-[330px] z-10 border-r-2 ${
                          isSelected
                            ? isDarkMode ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-50 border-blue-300'
                            : isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                        }`}>
                          {(() => {
                            const overallStats = calculateOverallAttendancePercentage(participant);
                            const overallPercentage = overallStats.percentage;
                            const completedSessions = overallStats.completed;
                            const totalSessions = overallStats.total;
                            
                            return (
                              <div className="flex flex-col items-center gap-0.5">
                                <div className={`px-1.5 py-1 rounded text-xs font-bold ${
                                  overallPercentage >= 80
                                    ? isDarkMode 
                                      ? 'bg-green-500 text-white' 
                                      : 'bg-green-500 text-white'
                                    : overallPercentage >= 50
                                      ? isDarkMode 
                                        ? 'bg-yellow-500 text-white' 
                                        : 'bg-yellow-500 text-white'
                                      : overallPercentage > 0
                                        ? isDarkMode 
                                          ? 'bg-orange-500 text-white' 
                                          : 'bg-orange-500 text-white'
                                        : isDarkMode 
                                          ? 'bg-gray-600 text-white' 
                                          : 'bg-gray-500 text-white'
                                }`}>
                                  {totalSessions > 0 ? `${overallPercentage}%` : '0%'}
                                </div>
                                <div className={`text-[9px] font-medium ${
                                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  {completedSessions}/{totalSessions}
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Attendance for Single Day */}
                        {activity.type === 'single_day' && (() => {
                          // Calculate summary for single day
                          const activeSlots = activity.timeSlots?.filter((s: any) => s.isActive) || [];
                          const totalSlots = activeSlots.length * 2; // Each slot has start and end
                          let checkedInCount = 0;
                          let completedSessions = 0;
                          let onTimeCount = 0;
                          let lateCount = 0;
                          
                          let approvedCheckInCount = 0;
                          
                          activeSlots.forEach((slot: any) => {
                            const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', activity.date);
                            const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', activity.date);
                            
                            if (startStatus.hasCheckedIn) checkedInCount++;
                            if (endStatus.hasCheckedIn) checkedInCount++;
                            
                            const hasStartApproved = startStatus.attendance?.status === 'approved';
                            const hasEndApproved = endStatus.attendance?.status === 'approved';
                            
                            // Count approved check-ins
                            if (hasStartApproved) approvedCheckInCount++;
                            if (hasEndApproved) approvedCheckInCount++;
                            
                            // Completed session: both start and end are approved
                            if (hasStartApproved && hasEndApproved) {
                              completedSessions++;
                            }
                            
                            if (hasStartApproved && startStatus.timeStatus === 'on_time') onTimeCount++;
                            if (hasStartApproved && startStatus.timeStatus === 'late') lateCount++;
                            if (hasEndApproved && endStatus.timeStatus === 'on_time') onTimeCount++;
                            if (hasEndApproved && endStatus.timeStatus === 'late') lateCount++;
                          });
                          
                          const totalSessions = activeSlots.length;
                          const absentCount = totalSlots - checkedInCount;
                          
                          // Calculate percentage: (approved check-ins / total check-ins) * 100
                          // This shows the percentage of check-ins that are approved
                          const attendancePercentage = totalSlots > 0 
                            ? Math.round((approvedCheckInCount / totalSlots) * 100) 
                            : 0;
                          
                          return (
                            <>
                              {/* Summary Column for Single Day */}
                              <td className={`px-2 py-2 text-center border-l-2 min-w-[90px] ${
                                isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'
                              }`}>
                                <div className="flex flex-col items-center gap-1">
                                  <div className={`px-1.5 py-1 rounded text-xs font-bold ${
                                    checkedInCount === totalSlots && onTimeCount === totalSlots
                                      ? isDarkMode 
                                        ? 'bg-green-600/30 text-green-300 border border-green-500/50' 
                                        : 'bg-green-100 text-green-800 border border-green-400'
                                      : checkedInCount === totalSlots && lateCount > 0
                                        ? isDarkMode 
                                          ? 'bg-orange-600/30 text-orange-300 border border-orange-500/50' 
                                          : 'bg-orange-100 text-orange-800 border border-orange-400'
                                        : checkedInCount > 0
                                          ? isDarkMode 
                                            ? 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/50' 
                                            : 'bg-yellow-100 text-yellow-800 border border-yellow-400'
                                          : isDarkMode 
                                            ? 'bg-gray-700/30 text-gray-400 border border-gray-600/50' 
                                            : 'bg-gray-100 text-gray-700 border border-gray-400'
                                  }`}>
                                    <div className="text-xs font-extrabold">{checkedInCount}/{totalSlots}</div>
                                    <div className={`text-[10px] font-bold mt-0.5 px-1 py-0.5 rounded ${
                                      attendancePercentage >= 80
                                        ? isDarkMode 
                                          ? 'bg-green-500 text-white' 
                                          : 'bg-green-500 text-white'
                                        : attendancePercentage >= 50
                                          ? isDarkMode 
                                            ? 'bg-yellow-500 text-white' 
                                            : 'bg-yellow-500 text-white'
                                          : attendancePercentage > 0
                                            ? isDarkMode 
                                              ? 'bg-orange-500 text-white' 
                                              : 'bg-orange-500 text-white'
                                            : isDarkMode 
                                              ? 'bg-gray-600 text-white' 
                                              : 'bg-gray-500 text-white'
                                    }`}>
                                      {attendancePercentage}%
                                    </div>
                                  </div>
                                </div>
                              </td>
                              
                              {/* Individual Slots */}
                              {activeSlots.map((slot: any) => (
                                <React.Fragment key={slot.id || slot.name}>
                                  {/* Start Check-in */}
                                  <td className={`px-1.5 py-2 text-center border-l-2 min-w-[70px] ${
                                    isDarkMode ? 'border-gray-600' : 'border-gray-300'
                                  }`}>
                              {(() => {
                                const statusInfo = getAttendanceStatusWithTime(participant, slot, 'start', activity.date);
                                
                                // Check if participant has registered for this slot (for single_day)
                                const isRegisteredForSlot = isParticipantRegisteredForSlot(participant, undefined, slot.name);
                                
                                if (!isRegisteredForSlot) {
                                  // Not registered - show "Không đăng ký"
                                  return (
                                    <div className={`flex flex-col items-center gap-0.5 p-1 rounded ${
                                      isDarkMode ? 'bg-gray-700/30 border border-gray-600/50' : 'bg-gray-100 border border-gray-300'
                                    }`} title="Chưa đăng ký buổi này">
                                      <XCircle size={14} className="text-gray-400" strokeWidth={2} />
                                      <span className="text-[9px] font-semibold text-gray-400">
                                        Không đăng ký
                                      </span>
                                    </div>
                                  );
                                }
                                
                                if (statusInfo.hasCheckedIn) {
                                  // Has checked in
                                  const bgColor = statusInfo.attendance?.status === 'approved'
                                    ? statusInfo.timeStatus === 'on_time'
                                      ? isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                                      : isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'
                                    : statusInfo.attendance?.status === 'rejected'
                                      ? isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
                                      : isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-100';
                                  
                                  const iconColor = statusInfo.attendance?.status === 'approved'
                                    ? statusInfo.timeStatus === 'on_time'
                                      ? 'text-green-500'
                                      : 'text-orange-500'
                                    : statusInfo.attendance?.status === 'rejected'
                                      ? 'text-red-500'
                                      : 'text-yellow-500';
                                  
                                  // Check if it's manual check-in (sync with officer)
                                  let displayText = '';
                                  if (statusInfo.attendance?.status === 'approved') {
                                    const isManual = isManualCheckInRecord(statusInfo.attendance);
                                    const officerName = isManual && statusInfo.attendance?.verifiedBy 
                                      ? getVerifierName(statusInfo.attendance.verifiedBy, statusInfo.attendance.verifiedByName) 
                                      : null;
                                    
                                    if (isManual && officerName && officerName !== 'Hệ thống tự động') {
                                      displayText = `Thủ Công (${officerName})`;
                                    } else if (isManual) {
                                      displayText = 'Thủ Công';
                                    } else {
                                      displayText = statusInfo.timeStatus === 'on_time' ? 'Đúng' : 'Trễ';
                                    }
                                  } else if (statusInfo.attendance?.status === 'rejected') {
                                    displayText = 'Từ chối';
                                  } else {
                                    displayText = 'Chờ duyệt';
                                  }
                                  
                                  return (
                                    <div 
                                      className={`flex flex-col items-center gap-0.5 p-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${bgColor}`} 
                                      title={statusInfo.attendance?.status === 'approved' 
                                        ? (statusInfo.timeStatus === 'on_time' ? 'Đã điểm danh đúng giờ' : 'Đã điểm danh trễ')
                                        : statusInfo.attendance?.status === 'rejected' 
                                          ? 'Đã từ chối'
                                          : 'Chờ duyệt'}
                                      onClick={() => handleAttendanceClick(participant, slot, 'start', activity.date)}
                                    >
                                      <CheckCircle2 
                                        size={14} 
                                        className={iconColor}
                                        strokeWidth={2}
                                      />
                                      <span className={`text-[9px] font-semibold ${iconColor}`}>
                                        {displayText}
                                      </span>
                                    </div>
                                  );
                                } else {
                                  // Not checked in yet (sync with officer)
                                  let bgColor, iconColor, text, title, IconComponent;
                                  
                                  if (statusInfo.timeStatus === 'not_started') {
                                    bgColor = isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100';
                                    iconColor = 'text-blue-500';
                                    text = 'Chưa đến';
                                    title = 'Chưa đến thời điểm điểm danh';
                                    IconComponent = Clock;
                                  } else if (statusInfo.timeStatus === 'in_progress') {
                                    bgColor = isDarkMode ? 'bg-cyan-500/20' : 'bg-cyan-100';
                                    iconColor = 'text-cyan-500';
                                    text = 'Đang mở';
                                    title = 'Đang trong thời gian điểm danh';
                                    IconComponent = Clock;
                                  } else {
                                    bgColor = isDarkMode ? 'bg-red-500/20' : 'bg-red-100';
                                    iconColor = 'text-red-500';
                                    text = 'Vắng';
                                    title = 'Đã qua thời điểm điểm danh - Vắng';
                                    IconComponent = XCircle;
                                  }
                                  
                                  return (
                                    <div className={`flex flex-col items-center gap-0.5 p-1 rounded ${bgColor}`} title={title}>
                                      <IconComponent size={14} className={iconColor} strokeWidth={2} />
                                      <span className={`text-[9px] font-semibold ${iconColor}`}>
                                        {text}
                                      </span>
                                    </div>
                                  );
                                }
                              })()}
                                  </td>
                                  
                                  {/* End Check-in */}
                                  <td className={`px-1.5 py-2 text-center border-l-2 min-w-[70px] ${
                                    isDarkMode ? 'border-gray-600' : 'border-gray-300'
                                  }`}>
                                    {(() => {
                                      const statusInfo = getAttendanceStatusWithTime(participant, slot, 'end', activity.date);
                                      
                                      // Check if participant has registered for this slot (for single_day)
                                      const isRegisteredForSlot = isParticipantRegisteredForSlot(participant, undefined, slot.name);
                                      
                                      if (!isRegisteredForSlot) {
                                        // Not registered - show "Không đăng ký"
                                        return (
                                          <div className={`flex flex-col items-center gap-0.5 p-1 rounded ${
                                            isDarkMode ? 'bg-gray-700/30 border border-gray-600/50' : 'bg-gray-100 border border-gray-300'
                                          }`} title="Chưa đăng ký buổi này">
                                            <XCircle size={14} className="text-gray-400" strokeWidth={2} />
                                            <span className="text-[9px] font-semibold text-gray-400">
                                              Không đăng ký
                                            </span>
                                          </div>
                                        );
                                      }
                                      
                                      if (statusInfo.hasCheckedIn) {
                                        // Has checked in
                                        const bgColor = statusInfo.attendance?.status === 'approved'
                                          ? statusInfo.timeStatus === 'on_time'
                                            ? isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                                            : isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'
                                          : statusInfo.attendance?.status === 'rejected'
                                            ? isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
                                            : isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-100';
                                        
                                        const iconColor = statusInfo.attendance?.status === 'approved'
                                          ? statusInfo.timeStatus === 'on_time'
                                            ? 'text-green-500'
                                            : 'text-orange-500'
                                          : statusInfo.attendance?.status === 'rejected'
                                            ? 'text-red-500'
                                            : 'text-yellow-500';
                                        
                                        // Check if it's manual check-in (sync with officer)
                                        let displayText = '';
                                        if (statusInfo.attendance?.status === 'approved') {
                                          const isManual = isManualCheckInRecord(statusInfo.attendance);
                                          const officerName = isManual && statusInfo.attendance?.verifiedBy 
                                            ? getVerifierName(statusInfo.attendance.verifiedBy, statusInfo.attendance.verifiedByName) 
                                            : null;
                                          
                                          if (isManual && officerName && officerName !== 'Hệ thống tự động') {
                                            displayText = `Thủ Công (${officerName})`;
                                          } else if (isManual) {
                                            displayText = 'Thủ Công';
                                          } else {
                                            displayText = statusInfo.timeStatus === 'on_time' ? 'Đúng' : 'Trễ';
                                          }
                                        } else if (statusInfo.attendance?.status === 'rejected') {
                                          displayText = 'Từ chối';
                                        } else {
                                          displayText = 'Chờ duyệt';
                                        }
                                        
                                        return (
                                          <div 
                                            className={`flex flex-col items-center gap-0.5 p-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${bgColor}`} 
                                            title={statusInfo.attendance?.status === 'approved' 
                                              ? (statusInfo.timeStatus === 'on_time' ? 'Đã điểm danh đúng giờ' : 'Đã điểm danh trễ')
                                              : statusInfo.attendance?.status === 'rejected' 
                                                ? 'Đã từ chối'
                                                : 'Chờ duyệt'}
                                            onClick={() => handleAttendanceClick(participant, slot, 'end', activity.date)}
                                          >
                                            <CheckCircle2 
                                              size={14} 
                                              className={iconColor}
                                              strokeWidth={2}
                                            />
                                            <span className={`text-[9px] font-semibold ${iconColor}`}>
                                              {displayText}
                                            </span>
                                          </div>
                                        );
                                      } else {
                                        // Not checked in yet (sync with officer)
                                        let bgColor, iconColor, text, title, IconComponent;
                                        
                                        if (statusInfo.timeStatus === 'not_started') {
                                          bgColor = isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100';
                                          iconColor = 'text-blue-500';
                                          text = 'Chưa đến';
                                          title = 'Chưa đến thời điểm điểm danh';
                                          IconComponent = Clock;
                                        } else if (statusInfo.timeStatus === 'in_progress') {
                                          bgColor = isDarkMode ? 'bg-cyan-500/20' : 'bg-cyan-100';
                                          iconColor = 'text-cyan-500';
                                          text = 'Đang mở';
                                          title = 'Đang trong thời gian điểm danh';
                                          IconComponent = Clock;
                                        } else {
                                          bgColor = isDarkMode ? 'bg-red-500/20' : 'bg-red-100';
                                          iconColor = 'text-red-500';
                                          text = 'Vắng';
                                          title = 'Đã qua thời điểm điểm danh - Vắng';
                                          IconComponent = XCircle;
                                        }
                                        
                                        return (
                                          <div className={`flex flex-col items-center gap-0.5 p-1 rounded ${bgColor}`} title={title}>
                                            <IconComponent size={14} className={iconColor} strokeWidth={2} />
                                            <span className={`text-[9px] font-semibold ${iconColor}`}>
                                              {text}
                                            </span>
                                          </div>
                                        );
                                      }
                                    })()}
                                  </td>
                                </React.Fragment>
                              ))}
                            </>
                          );
                        })()}

                        {/* Attendance for Multiple Days */}
                        {activity.type === 'multiple_days' && currentWeekDaysWithSchedule.map((scheduleDay: any) => {
                          const dayTimeSlots = activity.timeSlots?.filter((s: any) => s.isActive) || [];
                          let slotsToShow = dayTimeSlots.length > 0 ? dayTimeSlots : [
                            { name: 'Buổi Sáng', id: 'morning', startTime: '08:00', endTime: '11:30' },
                            { name: 'Buổi Chiều', id: 'afternoon', startTime: '13:00', endTime: '17:00' },
                            { name: 'Buổi Tối', id: 'evening', startTime: '18:00', endTime: '21:00' }
                          ];
                          
                          // Try to parse actual times from schedule.activities if available
                          // This ensures we use the correct end check-in time (e.g., 23:40 instead of 21:00)
                          if (scheduleDay.activities && typeof scheduleDay.activities === 'string') {
                            const activitiesText = scheduleDay.activities;
                            const lines = activitiesText.split('\n').filter((line: string) => line.trim());
                            
                            lines.forEach((line: string) => {
                              // Match format: "Buổi Sáng/Chiều/Tối (HH:MM-HH:MM)"
                              const slotMatch = line.match(/^Buổi (Sáng|Chiều|Tối)\s*\((\d{2}:\d{2})-(\d{2}:\d{2})\)/);
                              if (slotMatch) {
                                const slotName = slotMatch[1];
                                const slotNameFull = `Buổi ${slotName}`;
                                const parsedStartTime = slotMatch[2];
                                const parsedEndTime = slotMatch[3];
                                
                                // Find matching slot and update times
                                const slotIndex = slotsToShow.findIndex((s: any) => 
                                  s.name === slotNameFull || 
                                  (slotName === 'Sáng' && (s.name.includes('Sáng') || s.id === 'morning')) ||
                                  (slotName === 'Chiều' && (s.name.includes('Chiều') || s.id === 'afternoon')) ||
                                  (slotName === 'Tối' && (s.name.includes('Tối') || s.id === 'evening'))
                                );
                                
                                if (slotIndex >= 0) {
                                  // Update slot with parsed times from activities text
                                  slotsToShow[slotIndex] = {
                                    ...slotsToShow[slotIndex],
                                    startTime: parsedStartTime,
                                    endTime: parsedEndTime
                                  };
                                }
                              }
                            });
                          }
                          
                          const dayNumber = scheduleDay.day;
                          const dayDateString = scheduleDay.date;
                          const dayDateObj = scheduleDay.dateObj || new Date(scheduleDay.date);
                          const dayName = getDayName(scheduleDay.dayOfWeek);
                          
                          const getDayAttendances = () => {
                            // Filter attendances for this specific day
                            // Format: "Ngày X - Buổi Y" (e.g., "Ngày 1 - Buổi Sáng")
                            const dayAttendances = participant.attendances?.filter(a => {
                              const timeSlot = a.timeSlot || '';
                              // Match format "Ngày X - Buổi Y" or just "Ngày X"
                              const dayMatch = timeSlot.match(/Ngày\s*(\d+)/);
                              return dayMatch && parseInt(dayMatch[1]) === dayNumber;
                            }) || [];
                            
                            const slotAttendances: { [key: string]: { start?: any; end?: any; startTimeStatus?: string; endTimeStatus?: string } } = {};
                            
                            // Initialize all slots
                            slotsToShow.forEach((slot: any) => {
                              if (!slotAttendances[slot.name]) {
                                slotAttendances[slot.name] = {};
                              }
                            });
                            
                            // Process each attendance record
                            dayAttendances.forEach(att => {
                              const timeSlot = att.timeSlot || '';
                              
                              // Match format: "Ngày X - Buổi Y"
                              // Extract slot name (Sáng, Chiều, Tối)
                              const slotMatch = timeSlot.match(/Buổi\s*(Sáng|Chiều|Tối)/i);
                              if (!slotMatch) return;
                              
                              const slotNameInRecord = slotMatch[1];
                              
                              // Find matching slot in slotsToShow
                              const matchedSlot = slotsToShow.find((slot: any) => {
                                const slotName = slot.name;
                                if (slotNameInRecord === 'Sáng') {
                                  return slotName.includes('Sáng') || slotName.toLowerCase().includes('morning');
                                } else if (slotNameInRecord === 'Chiều') {
                                  return slotName.includes('Chiều') || slotName.toLowerCase().includes('afternoon');
                                } else if (slotNameInRecord === 'Tối') {
                                  return slotName.includes('Tối') || slotName.toLowerCase().includes('evening');
                                }
                                return false;
                              });
                              
                              if (matchedSlot) {
                                // Store full attendance record with all fields
                                const fullAttendanceRecord = {
                                  _id: att._id,
                                  timeSlot: att.timeSlot,
                                  checkInType: att.checkInType,
                                  checkInTime: att.checkInTime,
                                  status: att.status,
                                  photoUrl: att.photoUrl,
                                  lateReason: att.lateReason,
                                  location: att.location,
                                  verificationNote: att.verificationNote,
                                  cancelReason: att.cancelReason,
                                };
                                
                                if (att.checkInType === 'start') {
                                  slotAttendances[matchedSlot.name].start = fullAttendanceRecord;
                                  // Check if on time
                                  if (matchedSlot.startTime && att.checkInTime) {
                                    const checkInTime = new Date(att.checkInTime);
                                    
                                    // Validate checkInTime
                                    if (isNaN(checkInTime.getTime())) {
                                      slotAttendances[matchedSlot.name].startTimeStatus = 'late';
                                    } else {
                                      // Use the date from checkInTime to ensure same day comparison
                                      const checkInDate = new Date(checkInTime);
                                      checkInDate.setHours(0, 0, 0, 0);
                                      
                                      const [targetHour, targetMinute] = matchedSlot.startTime.split(':').map(Number);
                                      const targetTime = new Date(checkInDate);
                                      targetTime.setHours(targetHour, targetMinute, 0, 0);
                                      targetTime.setSeconds(0, 0);
                                      
                                      // On-time window: 15 minutes before to 15 minutes after target time
                                      const onTimeStart = new Date(targetTime);
                                      onTimeStart.setMinutes(onTimeStart.getMinutes() - 15);
                                      const onTimeEnd = new Date(targetTime);
                                      onTimeEnd.setMinutes(onTimeEnd.getMinutes() + 15);
                                      
                                      // Use getTime() for precise comparison
                                      const checkInTimeMs = checkInTime.getTime();
                                      const onTimeStartMs = onTimeStart.getTime();
                                      const onTimeEndMs = onTimeEnd.getTime();
                                      
                                      slotAttendances[matchedSlot.name].startTimeStatus = 
                                        (checkInTimeMs >= onTimeStartMs && checkInTimeMs <= onTimeEndMs) ? 'on_time' : 'late';
                                    }
                                  }
                                } else if (att.checkInType === 'end') {
                                  slotAttendances[matchedSlot.name].end = fullAttendanceRecord;
                                  // Check if on time
                                  if (matchedSlot.endTime && att.checkInTime) {
                                    const checkInTime = new Date(att.checkInTime);
                                    
                                    // Validate checkInTime
                                    if (isNaN(checkInTime.getTime())) {
                                      slotAttendances[matchedSlot.name].endTimeStatus = 'late';
                                    } else {
                                      // Use the date from checkInTime to ensure same day comparison
                                      const checkInDate = new Date(checkInTime);
                                      checkInDate.setHours(0, 0, 0, 0);
                                      
                                      const [targetHour, targetMinute] = matchedSlot.endTime.split(':').map(Number);
                                      const targetTime = new Date(checkInDate);
                                      targetTime.setHours(targetHour, targetMinute, 0, 0);
                                      targetTime.setSeconds(0, 0);
                                      
                                      // On-time window: 15 minutes before to 15 minutes after target time
                                      const onTimeStart = new Date(targetTime);
                                      onTimeStart.setMinutes(onTimeStart.getMinutes() - 15);
                                      const onTimeEnd = new Date(targetTime);
                                      onTimeEnd.setMinutes(onTimeEnd.getMinutes() + 15);
                                      
                                      // Use getTime() for precise comparison
                                      const checkInTimeMs = checkInTime.getTime();
                                      const onTimeStartMs = onTimeStart.getTime();
                                      const onTimeEndMs = onTimeEnd.getTime();
                                      const targetTimeMs = targetTime.getTime();
                                      
                                      const isOnTime = checkInTimeMs >= onTimeStartMs && checkInTimeMs <= onTimeEndMs;
                                      
                                      slotAttendances[matchedSlot.name].endTimeStatus = isOnTime ? 'on_time' : 'late';
                                    }
                                  }
                                }
                              }
                            });
                            
                            // Check time status for slots without attendance
                            slotsToShow.forEach((slot: any) => {
                              if (!slotAttendances[slot.name].start && slot.startTime) {
                                const timeStatus = getTimeStatus(slot, dayDateString);
                                slotAttendances[slot.name].startTimeStatus = timeStatus;
                              }
                              if (!slotAttendances[slot.name].end && slot.endTime) {
                                const timeStatus = getTimeStatus(slot, dayDateString);
                                slotAttendances[slot.name].endTimeStatus = timeStatus;
                              }
                            });
                            
                            return slotAttendances;
                          };
                          
                          const slotAttendances = getDayAttendances();
                          
                          // Only count registered slots
                          const registeredSlots = slotsToShow.filter((slot: any) => 
                            isParticipantRegisteredForSlot(participant, dayNumber, slot.name)
                          );
                          
                          const totalSlots = registeredSlots.length * 2; // Only count registered slots
                          const checkedInCount = registeredSlots.reduce((sum, slot: any) => {
                            const slotAtt = slotAttendances[slot.name] || {};
                            return sum + (slotAtt.start ? 1 : 0) + (slotAtt.end ? 1 : 0);
                          }, 0);
                          
                          // Calculate approved check-ins count (only for registered slots)
                          const approvedCheckInCount = registeredSlots.reduce((sum, slot: any) => {
                            const slotAtt = slotAttendances[slot.name] || {};
                            if (!slotAtt) return sum;
                            const hasStartApproved = slotAtt.start && slotAtt.start.status === 'approved';
                            const hasEndApproved = slotAtt.end && slotAtt.end.status === 'approved';
                            return sum + (hasStartApproved ? 1 : 0) + (hasEndApproved ? 1 : 0);
                          }, 0);
                          
                          // Calculate completed sessions (both start and end approved) - only for registered slots
                          const completedSessions = registeredSlots.reduce((sum, slot: any) => {
                            const slotAtt = slotAttendances[slot.name] || {};
                            if (!slotAtt) return sum;
                            const hasStartApproved = slotAtt.start && slotAtt.start.status === 'approved';
                            const hasEndApproved = slotAtt.end && slotAtt.end.status === 'approved';
                            // Both start and end are approved = completed session
                            return sum + (hasStartApproved && hasEndApproved ? 1 : 0);
                          }, 0);
                          
                          // Total number of registered sessions (not check-ins)
                          const totalSessions = registeredSlots.length;
                          
                          // Calculate percentage: (approved check-ins / total check-ins) * 100
                          // This shows the percentage of check-ins that are approved
                          const attendancePercentage = totalSlots > 0 
                            ? Math.round((approvedCheckInCount / totalSlots) * 100) 
                            : 0;
                          
                          // Calculate status summary (only for registered slots)
                          const onTimeCount = registeredSlots.reduce((sum, slot: any) => {
                            const slotAtt = slotAttendances[slot.name] || {};
                            if (!slotAtt) return sum;
                            return sum + 
                              (slotAtt.start && slotAtt.start.status === 'approved' && slotAtt.startTimeStatus === 'on_time' ? 1 : 0) +
                              (slotAtt.end && slotAtt.end.status === 'approved' && slotAtt.endTimeStatus === 'on_time' ? 1 : 0);
                          }, 0);
                          
                          const lateCount = registeredSlots.reduce((sum, slot: any) => {
                            const slotAtt = slotAttendances[slot.name] || {};
                            if (!slotAtt) return sum;
                            return sum + 
                              (slotAtt.start && slotAtt.start.status === 'approved' && slotAtt.startTimeStatus === 'late' ? 1 : 0) +
                              (slotAtt.end && slotAtt.end.status === 'approved' && slotAtt.endTimeStatus === 'late' ? 1 : 0);
                          }, 0);
                          
                          const absentCount = totalSlots - checkedInCount;
                          
                          return (
                            <td 
                              key={scheduleDay.day}
                              className={`px-2 py-2 text-center border-l-2 min-w-[180px] relative ${
                                isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'
                              }`}
                            >
                              {/* Summary View with Status */}
                              <div className="flex flex-col items-center gap-1.5">
                                {/* Count Badge with Status - Compact */}
                                <div className={`px-2 py-1 rounded text-xs font-bold ${
                                  checkedInCount === totalSlots && onTimeCount === totalSlots
                                    ? isDarkMode 
                                      ? 'bg-green-600/30 text-green-300 border border-green-500/50' 
                                      : 'bg-green-100 text-green-800 border border-green-400'
                                    : checkedInCount === totalSlots && lateCount > 0
                                      ? isDarkMode 
                                        ? 'bg-orange-600/30 text-orange-300 border border-orange-500/50' 
                                        : 'bg-orange-100 text-orange-800 border border-orange-400'
                                      : checkedInCount > 0
                                        ? isDarkMode 
                                          ? 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/50' 
                                          : 'bg-yellow-100 text-yellow-800 border border-yellow-400'
                                        : isDarkMode 
                                          ? 'bg-gray-700/30 text-gray-400 border border-gray-600/50' 
                                          : 'bg-gray-100 text-gray-700 border border-gray-400'
                                }`}>
                                  <div className="text-xs font-extrabold">{checkedInCount}/{totalSlots}</div>
                                  <div className={`text-[10px] font-bold mt-0.5 px-1 py-0.5 rounded ${
                                    attendancePercentage >= 80
                                      ? isDarkMode 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-green-500 text-white'
                                      : attendancePercentage >= 50
                                        ? isDarkMode 
                                          ? 'bg-yellow-500 text-white' 
                                          : 'bg-yellow-500 text-white'
                                        : attendancePercentage > 0
                                          ? isDarkMode 
                                            ? 'bg-orange-500 text-white' 
                                            : 'bg-orange-500 text-white'
                                          : isDarkMode 
                                            ? 'bg-gray-600 text-white' 
                                            : 'bg-gray-500 text-white'
                                  }`}>
                                    {attendancePercentage}%
                                  </div>
                                </div>
                                
                                {/* Table Layout for Slots */}
                                <div className="w-full">
                                  <table className={`w-full text-[10px] border ${
                                    isDarkMode ? 'border-gray-600' : 'border-gray-300'
                                  }`}>
                                    <thead>
                                      <tr className={`border-b ${
                                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
                                      }`}>
                                        <th className={`px-1.5 py-1 text-center font-bold border-r ${
                                          isDarkMode ? 'text-white bg-blue-600 border-blue-500' : 'text-white bg-blue-600 border-blue-500'
                                        }`}>
                                          Buổi
                                        </th>
                                        <th className={`px-1.5 py-1 text-center font-bold border-r ${
                                          isDarkMode ? 'text-white bg-green-600 border-green-500' : 'text-white bg-green-600 border-green-500'
                                        }`}>
                                          Đầu
                                        </th>
                                        <th className={`px-1.5 py-1 text-center font-bold ${
                                          isDarkMode ? 'text-white bg-orange-600' : 'text-white bg-orange-600'
                                        }`}>
                                          Cuối
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {slotsToShow.map((slot: any, idx: number) => {
                                        const slotAtt = slotAttendances[slot.name] || {};
                                        const hasStart = !!slotAtt.start;
                                        const hasEnd = !!slotAtt.end;
                                        const startStatus = slotAtt.start?.status;
                                        const endStatus = slotAtt.end?.status;
                                        const startTimeStatus = slotAtt.startTimeStatus;
                                        const endTimeStatus = slotAtt.endTimeStatus;
                                        
                                        // Check if participant has registered for this slot
                                        const isRegisteredForSlot = isParticipantRegisteredForSlot(participant, dayNumber, slot.name);
                                        
                                        // Get status text and color for start - Enhanced with better colors (sync with officer)
                                        const getStartStatus = () => {
                                          // If not registered, show "không đăng ký"
                                          if (!isRegisteredForSlot) {
                                            return {
                                              text: 'Không đăng ký',
                                              color: isDarkMode 
                                                ? 'text-gray-400 bg-gray-700/30 border border-gray-600/50' 
                                                : 'text-gray-500 bg-gray-100 border border-gray-300',
                                              icon: '○'
                                            };
                                          }
                                          
                                          // If registered, check attendance status
                                          if (hasStart) {
                                            if (startStatus === 'approved') {
                                              // Check if it's manual check-in
                                              const isManual = isManualCheckInRecord(slotAtt.start);
                                              const officerName = isManual && slotAtt.start?.verifiedBy 
                                                ? getVerifierName(slotAtt.start.verifiedBy, slotAtt.start.verifiedByName) 
                                                : null;
                                              
                                              let statusText = '';
                                              if (isManual && officerName && officerName !== 'Hệ thống tự động') {
                                                statusText = `Thủ Công (${officerName})`;
                                              } else if (isManual) {
                                                statusText = 'Thủ Công';
                                              } else {
                                                statusText = startTimeStatus === 'on_time' ? 'Đúng' : 'Trễ';
                                              }
                                              
                                              return {
                                                text: statusText,
                                                color: startTimeStatus === 'on_time' 
                                                  ? isDarkMode 
                                                    ? 'text-green-300 bg-green-600/30 border border-green-500/50' 
                                                    : 'text-green-700 bg-green-100 border border-green-400'
                                                  : isDarkMode 
                                                    ? 'text-orange-300 bg-orange-600/30 border border-orange-500/50' 
                                                    : 'text-orange-700 bg-orange-100 border border-orange-400',
                                                icon: '✓'
                                              };
                                            } else if (startStatus === 'rejected') {
                                              return {
                                                text: 'Từ chối',
                                                color: isDarkMode 
                                                  ? 'text-red-300 bg-red-600/30 border border-red-500/50' 
                                                  : 'text-red-700 bg-red-100 border border-red-400',
                                                icon: '✗'
                                              };
                                            } else {
                                              return {
                                                text: 'Chờ duyệt',
                                                color: isDarkMode 
                                                  ? 'text-yellow-300 bg-yellow-600/30 border border-yellow-500/50' 
                                                  : 'text-yellow-700 bg-yellow-100 border border-yellow-400',
                                                icon: '⏳'
                                              };
                                            }
                                          } else {
                                            if (startTimeStatus === 'not_started') {
                                              return {
                                                text: 'Chưa đến',
                                                color: isDarkMode 
                                                  ? 'text-blue-300 bg-blue-600/30 border border-blue-500/50' 
                                                  : 'text-blue-700 bg-blue-100 border border-blue-400',
                                                icon: '○'
                                              };
                                            } else if (startTimeStatus === 'in_progress') {
                                              return {
                                                text: 'Đang mở',
                                                color: isDarkMode 
                                                  ? 'text-cyan-300 bg-cyan-600/30 border border-cyan-500/50' 
                                                  : 'text-cyan-700 bg-cyan-100 border border-cyan-400',
                                                icon: '○'
                                              };
                                            } else {
                                              return {
                                                text: 'Vắng',
                                                color: isDarkMode 
                                                  ? 'text-red-300 bg-red-600/30 border border-red-500/50' 
                                                  : 'text-red-700 bg-red-100 border border-red-400',
                                                icon: '✗'
                                              };
                                            }
                                          }
                                        };
                                        
                                        // Get status text and color for end - Enhanced with better colors (sync with officer)
                                        const getEndStatus = () => {
                                          // If not registered, show "không đăng ký"
                                          if (!isRegisteredForSlot) {
                                            return {
                                              text: 'Không đăng ký',
                                              color: isDarkMode 
                                                ? 'text-gray-400 bg-gray-700/30 border border-gray-600/50' 
                                                : 'text-gray-500 bg-gray-100 border border-gray-300',
                                              icon: '○'
                                            };
                                          }
                                          
                                          // If registered, check attendance status
                                          if (hasEnd) {
                                            if (endStatus === 'approved') {
                                              // Check if it's manual check-in
                                              const isManual = isManualCheckInRecord(slotAtt.end);
                                              const officerName = isManual && slotAtt.end?.verifiedBy 
                                                ? getVerifierName(slotAtt.end.verifiedBy, slotAtt.end.verifiedByName) 
                                                : null;
                                              
                                              let statusText = '';
                                              if (isManual && officerName && officerName !== 'Hệ thống tự động') {
                                                statusText = `Thủ Công (${officerName})`;
                                              } else if (isManual) {
                                                statusText = 'Thủ Công';
                                              } else {
                                                statusText = endTimeStatus === 'on_time' ? 'Đúng' : 'Trễ';
                                              }
                                              
                                              return {
                                                text: statusText,
                                                color: endTimeStatus === 'on_time' 
                                                  ? isDarkMode 
                                                    ? 'text-green-300 bg-green-600/30 border border-green-500/50' 
                                                    : 'text-green-700 bg-green-100 border border-green-400'
                                                  : isDarkMode 
                                                    ? 'text-orange-300 bg-orange-600/30 border border-orange-500/50' 
                                                    : 'text-orange-700 bg-orange-100 border border-orange-400',
                                                icon: '✓'
                                              };
                                            } else if (endStatus === 'rejected') {
                                              return {
                                                text: 'Từ chối',
                                                color: isDarkMode 
                                                  ? 'text-red-300 bg-red-600/30 border border-red-500/50' 
                                                  : 'text-red-700 bg-red-100 border border-red-400',
                                                icon: '✗'
                                              };
                                            } else {
                                              return {
                                                text: 'Chờ duyệt',
                                                color: isDarkMode 
                                                  ? 'text-yellow-300 bg-yellow-600/30 border border-yellow-500/50' 
                                                  : 'text-yellow-700 bg-yellow-100 border border-yellow-400',
                                                icon: '⏳'
                                              };
                                            }
                                          } else {
                                            if (endTimeStatus === 'not_started') {
                                              return {
                                                text: 'Chưa đến',
                                                color: isDarkMode 
                                                  ? 'text-blue-300 bg-blue-600/30 border border-blue-500/50' 
                                                  : 'text-blue-700 bg-blue-100 border border-blue-400',
                                                icon: '○'
                                              };
                                            } else if (endTimeStatus === 'in_progress') {
                                              return {
                                                text: 'Đang mở',
                                                color: isDarkMode 
                                                  ? 'text-cyan-300 bg-cyan-600/30 border border-cyan-500/50' 
                                                  : 'text-cyan-700 bg-cyan-100 border border-cyan-400',
                                                icon: '○'
                                              };
                                            } else {
                                              return {
                                                text: 'Vắng',
                                                color: isDarkMode 
                                                  ? 'text-red-300 bg-red-600/30 border border-red-500/50' 
                                                  : 'text-red-700 bg-red-100 border border-red-400',
                                                icon: '✗'
                                              };
                                            }
                                          }
                                        };
                                        
                                        const startStatusInfo = getStartStatus();
                                        const endStatusInfo = getEndStatus();
                                        
                                        return (
                                          <tr key={idx} className={`border-b ${
                                            isDarkMode ? 'border-gray-700' : 'border-gray-200'
                                          }`}>
                                            <td className={`px-1.5 py-1 text-[10px] font-medium border-r ${
                                              isDarkMode ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'
                                            }`}>
                                              {slot.name}
                                            </td>
                                            <td className={`px-1 py-1 text-center border-r ${
                                              isDarkMode ? 'border-gray-600' : 'border-gray-300'
                                            }`}>
                                              <span 
                                                className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-bold min-w-[50px] cursor-pointer hover:opacity-80 transition-opacity ${startStatusInfo.color}`}
                                                onClick={() => {
                                                  if (hasStart && slotAtt.start) {
                                                    setSelectedAttendance({
                                                      participant,
                                                      attendance: slotAtt.start,
                                                      slot,
                                                      checkInType: 'start',
                                                      dayDate: dayDateString,
                                                    });
                                                  }
                                                }}
                                                title={hasStart ? "Nhấn để xem chi tiết" : ""}
                                              >
                                                {startStatusInfo.text}
                                              </span>
                                            </td>
                                            <td className="px-1 py-1 text-center">
                                              <span 
                                                className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-bold min-w-[50px] cursor-pointer hover:opacity-80 transition-opacity ${endStatusInfo.color}`}
                                                onClick={() => {
                                                  if (hasEnd && slotAtt.end) {
                                                    setSelectedAttendance({
                                                      participant,
                                                      attendance: slotAtt.end,
                                                      slot,
                                                      checkInType: 'end',
                                                      dayDate: dayDateString,
                                                    });
                                                  }
                                                }}
                                                title={hasEnd ? "Nhấn để xem chi tiết" : ""}
                                              >
                                                {endStatusInfo.text}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                              
                              {/* Detailed Tooltip on Hover */}
                              <div className={`absolute left-full top-0 ml-2 z-50 hidden group-hover:block ${
                                isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                              } border rounded-lg shadow-xl p-3 min-w-[250px]`}>
                                <div className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  Ngày {scheduleDay.day} - {new Date(scheduleDay.date).toLocaleDateString('vi-VN')}
                                </div>
                                <div className="space-y-1.5">
                                  {slotsToShow.map((slot: any) => {
                                    const slotAtt = slotAttendances[slot.name] || {};
                                    const isRegisteredForSlot = isParticipantRegisteredForSlot(participant, dayNumber, slot.name);
                                    
                                    return (
                                      <div key={slot.name} className="text-[10px]">
                                        <div className={`font-medium mb-0.5 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{slot.name}:</div>
                                        <div className="flex flex-col gap-1 pl-2">
                                          {/* Start Check-in Status */}
                                          <span className={
                                            !isRegisteredForSlot
                                              ? 'text-gray-500'
                                              : slotAtt.start ? 
                                                slotAtt.start.status === 'approved' 
                                                  ? slotAtt.startTimeStatus === 'on_time' ? 'text-green-500' : 'text-orange-500'
                                                  : slotAtt.start.status === 'rejected' ? 'text-red-500' : 'text-yellow-500'
                                                : slotAtt.startTimeStatus === 'not_started' ? 'text-blue-500'
                                                  : slotAtt.startTimeStatus === 'in_progress' ? 'text-purple-500'
                                                  : 'text-red-500'
                                          }>
                                            Đầu: {!isRegisteredForSlot
                                              ? '○ Không đăng ký'
                                              : slotAtt.start ? 
                                                slotAtt.start.status === 'approved' 
                                                  ? slotAtt.startTimeStatus === 'on_time' ? '✓ Đúng giờ' : '✓ Trễ'
                                                  : slotAtt.start.status === 'rejected' ? '✗ Từ chối' : '⏳ Chờ duyệt'
                                                : slotAtt.startTimeStatus === 'not_started' ? '○ Chưa đến'
                                                  : slotAtt.startTimeStatus === 'in_progress' ? '○ Đang mở điểm danh'
                                                  : '✗ Vắng'
                                            }
                                          </span>
                                          {/* End Check-in Status */}
                                          <span className={
                                            !isRegisteredForSlot
                                              ? 'text-gray-500'
                                              : slotAtt.end ? 
                                                slotAtt.end.status === 'approved' 
                                                  ? slotAtt.endTimeStatus === 'on_time' ? 'text-green-500' : 'text-orange-500'
                                                  : slotAtt.end.status === 'rejected' ? 'text-red-500' : 'text-yellow-500'
                                                : slotAtt.endTimeStatus === 'not_started' ? 'text-blue-500'
                                                  : slotAtt.endTimeStatus === 'in_progress' ? 'text-purple-500'
                                                  : 'text-red-500'
                                          }>
                                            Cuối: {!isRegisteredForSlot
                                              ? '○ Không đăng ký'
                                              : slotAtt.end ? 
                                                slotAtt.end.status === 'approved' 
                                                  ? slotAtt.endTimeStatus === 'on_time' ? '✓ Đúng giờ' : '✓ Trễ'
                                                  : slotAtt.end.status === 'rejected' ? '✗ Từ chối' : '⏳ Chờ duyệt'
                                                : slotAtt.endTimeStatus === 'not_started' ? '○ Chưa đến'
                                                  : slotAtt.endTimeStatus === 'in_progress' ? '○ Đang mở điểm danh'
                                                  : '✗ Vắng'
                                            }
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        <Footer isDarkMode={isDarkMode} />

        {/* Attendance Detail Modal */}
        {selectedAttendance && (
          <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setSelectedAttendance(null)}
          >
            <div 
              className={`rounded-xl border shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto backdrop-blur-md ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-gray-800/95 to-gray-900/95 border-gray-700/50' 
                  : 'bg-white/95 border-gray-200/50'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={`sticky top-0 z-10 px-4 py-3 border-b backdrop-blur-md ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-gray-800/95 to-gray-800/90 border-gray-700/50' 
                  : 'bg-gradient-to-r from-white/95 to-gray-50/90 border-gray-200/50'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className={`text-base font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Chi tiết điểm danh
                    </h3>
                    <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {selectedAttendance.participant.name} - {selectedAttendance.slot.name} ({selectedAttendance.checkInType === 'start' ? 'Đầu buổi' : 'Cuối buổi'})
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedAttendance(null)}
                    className={`p-2 rounded-lg transition-all duration-200 flex-shrink-0 ${
                      isDarkMode 
                        ? 'hover:bg-gray-700/50 text-gray-300 hover:text-white' 
                        : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <XCircle size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-3">
                {/* Overall Attendance Percentage - Prominent Display */}
                {activity && (() => {
                  // Use check-in based calculation to match table display
                  const overallStats = calculateAttendancePercentageByCheckIns(selectedAttendance.participant);
                  const overallPercentage = overallStats.percentage;
                  const approvedCheckIns = overallStats.approved;
                  const totalCheckIns = overallStats.total;
                  
                  // Calculate percentage for the specific session that was clicked
                  let sessionApproved = 0;
                  let sessionTotal = 0;
                  const clickedSlot = selectedAttendance.slot;
                  const clickedSlotName = clickedSlot.name;
                  
                  if (activity.type === 'single_day' && activity.timeSlots) {
                    // For single-day, find the specific slot
                    const matchingSlot = activity.timeSlots.find((s: any) => 
                      s.name === clickedSlotName || 
                      s.name.includes(clickedSlotName) ||
                      clickedSlotName.includes(s.name) ||
                      (s.id && clickedSlot.id && s.id === clickedSlot.id)
                    );
                    
                    if (matchingSlot) {
                      sessionTotal = 2; // Start and end check-ins
                      const startStatus = getAttendanceStatusWithTime(selectedAttendance.participant, matchingSlot, 'start', activity.date);
                      const endStatus = getAttendanceStatusWithTime(selectedAttendance.participant, matchingSlot, 'end', activity.date);
                      
                      if (startStatus.attendance?.status === 'approved') {
                        sessionApproved++;
                      }
                      if (endStatus.attendance?.status === 'approved') {
                        sessionApproved++;
                      }
                    }
                  } else if (activity.type === 'multiple_days' && activity.schedule) {
                    // For multi-day, count all occurrences of this slot across all days
                    const dayTimeSlots = activity.timeSlots?.filter((s: any) => s.isActive) || [];
                    const slotsToUse = dayTimeSlots.length > 0 ? dayTimeSlots : [
                      { name: 'Buổi Sáng', id: 'morning', startTime: '08:00', endTime: '11:30', isActive: true },
                      { name: 'Buổi Chiều', id: 'afternoon', startTime: '13:00', endTime: '17:00', isActive: true },
                      { name: 'Buổi Tối', id: 'evening', startTime: '18:00', endTime: '21:00', isActive: true }
                    ];
                    
                    // Find matching slot by name or id
                    const matchingSlot = slotsToUse.find((s: any) => 
                      s.name === clickedSlotName || 
                      s.name.includes(clickedSlotName) ||
                      clickedSlotName.includes(s.name) ||
                      (s.id && clickedSlot.id && s.id === clickedSlot.id)
                    );
                    
                    if (matchingSlot) {
                      // Count this slot across all days in schedule
                      activity.schedule.forEach((scheduleDay: any) => {
                        const dayNumber = scheduleDay.day;
                        const dayDateString = scheduleDay.date;
                        sessionTotal += 2; // Each day has start and end check-ins for this slot
                        
                        // Use getAttendanceStatusWithTime to check attendance for this day and slot
                        const startStatus = getAttendanceStatusWithTime(
                          selectedAttendance.participant, 
                          matchingSlot, 
                          'start', 
                          dayDateString,
                          dayNumber
                        );
                        const endStatus = getAttendanceStatusWithTime(
                          selectedAttendance.participant, 
                          matchingSlot, 
                          'end', 
                          dayDateString,
                          dayNumber
                        );
                        
                        if (startStatus.attendance?.status === 'approved') {
                          sessionApproved++;
                        }
                        if (endStatus.attendance?.status === 'approved') {
                          sessionApproved++;
                        }
                      });
                    }
                  }
                  
                  const sessionPercentage = sessionTotal > 0 
                    ? Math.round((sessionApproved / sessionTotal) * 100)
                    : 0;
                  
                  return (
                    <div className="space-y-4">
                      {/* Overall Attendance Percentage */}
                      <div className={`p-4 sm:p-5 rounded-2xl border shadow-lg backdrop-blur-sm ${
                        overallPercentage >= 80
                          ? isDarkMode 
                            ? 'bg-gradient-to-br from-green-600/30 to-emerald-600/20 border-green-500/40' 
                            : 'bg-gradient-to-br from-green-50 to-emerald-50/80 border-green-300/50'
                          : overallPercentage >= 50
                            ? isDarkMode 
                              ? 'bg-gradient-to-br from-yellow-600/30 to-orange-600/20 border-yellow-500/40' 
                              : 'bg-gradient-to-br from-yellow-50 to-orange-50/80 border-yellow-300/50'
                            : overallPercentage > 0
                              ? isDarkMode 
                                ? 'bg-gradient-to-br from-orange-600/30 to-red-600/20 border-orange-500/40' 
                                : 'bg-gradient-to-br from-orange-50 to-red-50/80 border-orange-300/50'
                              : isDarkMode 
                                ? 'bg-gradient-to-br from-gray-700/40 to-gray-600/30 border-gray-600/40' 
                                : 'bg-gradient-to-br from-gray-100 to-gray-200/80 border-gray-300/50'
                      }`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${
                              isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'
                            }`}>
                              <Users size={24} className={
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              } strokeWidth={2.5} />
                            </div>
                            <div>
                              <p className={`text-sm font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                Tổng phần trăm tham gia
                              </p>
                              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {approvedCheckIns}/{totalCheckIns} lần điểm danh đã duyệt
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-3xl sm:text-4xl font-bold ${
                              overallPercentage >= 80
                                ? isDarkMode ? 'text-green-300' : 'text-green-700'
                                : overallPercentage >= 50
                                  ? isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
                                  : overallPercentage > 0
                                    ? isDarkMode ? 'text-orange-300' : 'text-orange-700'
                                    : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {overallPercentage}%
                            </div>
                            <div className={`text-xs font-semibold mt-1 ${
                              overallPercentage >= 80
                                ? isDarkMode ? 'text-green-400' : 'text-green-600'
                                : overallPercentage >= 50
                                  ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                                  : overallPercentage > 0
                                    ? isDarkMode ? 'text-orange-400' : 'text-orange-600'
                                    : isDarkMode ? 'text-gray-500' : 'text-gray-500'
                            }`}>
                              {overallPercentage >= 80 ? 'Xuất sắc' : overallPercentage >= 50 ? 'Khá' : overallPercentage > 0 ? 'Cần cải thiện' : 'Chưa tham gia'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Specific Session Attendance Percentage */}
                      {sessionTotal > 0 && (
                        <div className={`p-3 rounded-lg border shadow-md backdrop-blur-sm ${
                          sessionPercentage >= 80
                            ? isDarkMode 
                              ? 'bg-gradient-to-br from-blue-600/30 to-indigo-600/20 border-blue-500/40' 
                              : 'bg-gradient-to-br from-blue-50 to-indigo-50/80 border-blue-300/50'
                            : sessionPercentage >= 50
                              ? isDarkMode 
                                ? 'bg-gradient-to-br from-blue-600/30 to-indigo-600/20 border-blue-500/40' 
                                : 'bg-gradient-to-br from-blue-50 to-indigo-50/80 border-blue-300/50'
                              : sessionPercentage > 0
                                ? isDarkMode 
                                  ? 'bg-gradient-to-br from-gray-700/40 to-gray-600/30 border-gray-600/40' 
                                  : 'bg-gradient-to-br from-gray-100 to-gray-200/80 border-gray-300/50'
                                : isDarkMode 
                                  ? 'bg-gradient-to-br from-gray-700/40 to-gray-600/30 border-gray-600/40' 
                                  : 'bg-gradient-to-br from-gray-100 to-gray-200/80 border-gray-300/50'
                        }`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'
                              }`}>
                                <Calendar size={18} className={
                                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                } strokeWidth={2.5} />
                              </div>
                              <div>
                                <p className={`text-xs font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                  Phần trăm: <span className="font-extrabold">{clickedSlotName}</span>
                                </p>
                                <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {sessionApproved}/{sessionTotal} lần đã duyệt
                                  {activity.type === 'multiple_days' && sessionTotal > 2 && (
                                    <span className="ml-1">(tất cả các ngày)</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${
                                sessionPercentage >= 80
                                  ? isDarkMode ? 'text-blue-300' : 'text-blue-700'
                                  : sessionPercentage >= 50
                                    ? isDarkMode ? 'text-blue-300' : 'text-blue-700'
                                    : sessionPercentage > 0
                                      ? isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                      : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {sessionPercentage}%
                              </div>
                              <div className={`text-[10px] font-semibold mt-0.5 ${
                                sessionPercentage >= 80
                                  ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                  : sessionPercentage >= 50
                                    ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                    : sessionPercentage > 0
                                      ? isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                      : isDarkMode ? 'text-gray-500' : 'text-gray-500'
                              }`}>
                                {sessionPercentage >= 80 ? 'Xuất sắc' : sessionPercentage >= 50 ? 'Khá' : sessionPercentage > 0 ? 'Cần cải thiện' : 'Chưa tham gia'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Participant Info */}
                <div className={`p-3 rounded-lg border shadow-sm backdrop-blur-sm ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-gray-700/40 to-gray-800/30 border-gray-600/40' 
                    : 'bg-gradient-to-br from-gray-50 to-white border-gray-200/50'
                }`}>
                  <div className="flex items-center gap-3">
                    {selectedAttendance.participant.avatarUrl ? (
                      <div className="relative group">
                        <Image
                          src={selectedAttendance.participant.avatarUrl}
                          alt={selectedAttendance.participant.name}
                          width={48}
                          height={48}
                          className="rounded-lg object-cover border border-gray-300 dark:border-gray-600 shadow-md transition-transform duration-300 group-hover:scale-105"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center border shadow-md ${
                        isDarkMode 
                          ? 'bg-gradient-to-br from-gray-600 to-gray-700 border-gray-500 text-white' 
                          : 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300 text-gray-700'
                      }`}>
                        {(() => {
                          const name = selectedAttendance.participant.name || '';
                          const nameParts = name.trim().split(' ').filter(p => p.length > 0);
                          const initials = nameParts.length > 0 
                            ? nameParts[nameParts.length - 1][0].toUpperCase()
                            : name[0]?.toUpperCase() || '?';
                          return (
                            <span className="text-sm font-bold">{initials}</span>
                          );
                        })()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {selectedAttendance.participant.name}
                      </p>
                      <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {selectedAttendance.participant.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Attendance Photo - Always show section, even if no photo */}
                <div>
                  <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-gray-600/30' : 'bg-gray-100'}`}>
                      <Eye size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} strokeWidth={2.5} />
                    </div>
                    <span>Ảnh điểm danh</span>
                  </h4>
                  {selectedAttendance.attendance.photoUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border-2 shadow-xl group">
                      <Image
                        src={selectedAttendance.attendance.photoUrl}
                        alt="Ảnh điểm danh"
                        width={800}
                        height={600}
                        className="w-full h-auto object-contain bg-gray-100 dark:bg-gray-900 transition-transform duration-300 group-hover:scale-105"
                        unoptimized
                        onError={(e) => {
                          console.error('Error loading image:', selectedAttendance.attendance.photoUrl);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <a
                          href={selectedAttendance.attendance.photoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2.5 rounded-xl ${
                            isDarkMode 
                              ? 'bg-white/20 backdrop-blur-md text-white border border-white/30' 
                              : 'bg-black/20 backdrop-blur-md text-gray-900 border border-gray-300'
                          } text-sm font-semibold shadow-lg`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Mở ảnh gốc
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-8 rounded-2xl border-2 border-dashed text-center ${
                      isDarkMode 
                        ? 'bg-gray-700/30 border-gray-600/50 text-gray-400' 
                        : 'bg-gray-50 border-gray-300 text-gray-500'
                    }`}>
                      <Eye size={32} className="mx-auto mb-3 opacity-50" strokeWidth={2} />
                      <p className="text-sm font-medium">Không có ảnh điểm danh</p>
                    </div>
                  )}
                </div>

                {/* Attendance Details - Table Format */}
                <div className={`rounded-lg border shadow-sm backdrop-blur-sm overflow-hidden ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-gray-700/40 to-gray-800/30 border-gray-600/40' 
                    : 'bg-gradient-to-br from-gray-50 to-white border-gray-200/50'
                }`}>
                  <div className={`px-3 py-2 border-b ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
                    <h4 className={`text-xs font-bold flex items-center gap-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      <CheckCircle2 size={14} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} strokeWidth={2.5} />
                      <span>Thông tin điểm danh</span>
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <tbody>
                        {/* Time Slot */}
                        <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <td className={`px-3 py-2 font-semibold align-top w-[120px] ${isDarkMode ? 'text-gray-300 bg-gray-800/30' : 'text-gray-600 bg-gray-50'}`}>
                            <div className="flex items-center gap-1.5">
                              <Calendar size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={2} />
                              <span>Buổi</span>
                            </div>
                          </td>
                          <td className={`px-3 py-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {selectedAttendance.slot.name} ({selectedAttendance.checkInType === 'start' ? 'Đầu buổi' : 'Cuối buổi'})
                          </td>
                        </tr>

                        {/* Check-in Time */}
                        <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <td className={`px-3 py-2 font-semibold align-top ${isDarkMode ? 'text-gray-300 bg-gray-800/30' : 'text-gray-600 bg-gray-50'}`}>
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={2} />
                              <span>Thời gian</span>
                            </div>
                          </td>
                          <td className={`px-3 py-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {new Date(selectedAttendance.attendance.checkInTime).toLocaleString('vi-VN')}
                          </td>
                        </tr>

                        {/* Status */}
                        <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <td className={`px-3 py-2 font-semibold align-top ${isDarkMode ? 'text-gray-300 bg-gray-800/30' : 'text-gray-600 bg-gray-50'}`}>
                            <div className="flex items-center gap-1.5">
                              {selectedAttendance.attendance.status === 'approved' ? (
                                <CheckCircle2 size={12} className="text-green-500" strokeWidth={2} />
                              ) : selectedAttendance.attendance.status === 'rejected' ? (
                                <XCircle size={12} className="text-red-500" strokeWidth={2} />
                              ) : (
                                <Loader2 size={12} className="text-yellow-500 animate-spin" strokeWidth={2} />
                              )}
                              <span>Trạng thái</span>
                            </div>
                          </td>
                          <td className={`px-3 py-2`}>
                            <span className={`text-xs font-bold ${
                              selectedAttendance.attendance.status === 'approved' 
                                ? isDarkMode ? 'text-green-400' : 'text-green-700'
                                : selectedAttendance.attendance.status === 'rejected'
                                  ? isDarkMode ? 'text-red-400' : 'text-red-700'
                                  : isDarkMode ? 'text-yellow-400' : 'text-yellow-700'
                            }`}>
                              {selectedAttendance.attendance.status === 'approved' 
                                ? 'Đã duyệt' 
                                : selectedAttendance.attendance.status === 'rejected' 
                                  ? 'Đã từ chối' 
                                  : 'Chờ duyệt'}
                            </span>
                          </td>
                        </tr>

                        {/* Location */}
                        {selectedAttendance.attendance.location && (
                          <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <td className={`px-3 py-2 font-semibold align-top ${isDarkMode ? 'text-gray-300 bg-gray-800/30' : 'text-gray-600 bg-gray-50'}`}>
                              <div className="flex items-center gap-1.5">
                                <MapPin size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={2} />
                                <span>Vị trí</span>
                              </div>
                            </td>
                            <td className={`px-3 py-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              <div>
                                <p className="font-medium">
                                  {selectedAttendance.attendance.location.address || 
                                   `${selectedAttendance.attendance.location.lat?.toFixed(6)}, ${selectedAttendance.attendance.location.lng?.toFixed(6)}`}
                                </p>
                                {selectedAttendance.attendance.location.lat && selectedAttendance.attendance.location.lng && (
                                  <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Tọa độ: {selectedAttendance.attendance.location.lat.toFixed(6)}, {selectedAttendance.attendance.location.lng.toFixed(6)}
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Additional Information - Table Format */}
                {(selectedAttendance.attendance.lateReason || selectedAttendance.attendance.verificationNote || selectedAttendance.attendance.cancelReason) && (
                  <div className={`rounded-lg border shadow-sm backdrop-blur-sm overflow-hidden ${
                    isDarkMode 
                      ? 'bg-gradient-to-br from-gray-700/40 to-gray-800/30 border-gray-600/40' 
                      : 'bg-gradient-to-br from-gray-50 to-white border-gray-200/50'
                  }`}>
                    <div className={`px-3 py-2 border-b ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
                      <h4 className={`text-xs font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        Thông tin bổ sung
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <tbody>
                          {/* Late Reason */}
                          {selectedAttendance.attendance.lateReason && (
                            <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                              <td className={`px-3 py-2 font-semibold align-top w-[120px] ${isDarkMode ? 'text-orange-300 bg-orange-900/20' : 'text-orange-700 bg-orange-50'}`}>
                                <div className="flex items-center gap-1.5">
                                  <Clock size={12} className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} strokeWidth={2} />
                                  <span>Lý do trễ</span>
                                </div>
                              </td>
                              <td className={`px-3 py-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                {selectedAttendance.attendance.lateReason}
                              </td>
                            </tr>
                          )}

                          {/* Verification Note */}
                          {selectedAttendance.attendance.verificationNote && (
                            <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                              <td className={`px-3 py-2 font-semibold align-top ${isDarkMode ? 'text-blue-300 bg-blue-900/20' : 'text-blue-700 bg-blue-50'}`}>
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 size={12} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={2} />
                                  <span>Ghi chú</span>
                                </div>
                              </td>
                              <td className={`px-3 py-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                {selectedAttendance.attendance.verificationNote}
                              </td>
                            </tr>
                          )}

                          {/* Cancel Reason */}
                          {selectedAttendance.attendance.cancelReason && (
                            <tr>
                              <td className={`px-3 py-2 font-semibold align-top ${isDarkMode ? 'text-red-300 bg-red-900/20' : 'text-red-700 bg-red-50'}`}>
                                <div className="flex items-center gap-1.5">
                                  <XCircle size={12} className={isDarkMode ? 'text-red-400' : 'text-red-600'} strokeWidth={2} />
                                  <span>Lý do từ chối</span>
                                </div>
                              </td>
                              <td className={`px-3 py-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                {selectedAttendance.attendance.cancelReason}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

    