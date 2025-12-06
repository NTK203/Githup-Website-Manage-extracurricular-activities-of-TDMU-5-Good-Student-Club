'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  CheckSquare,
  Calendar,
  CalendarRange,
  Clock,
  MapPin,
  Search,
  Filter,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader,
  Loader2,
  XCircle,
  X,
  LucideIcon,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sunrise,
  Sun,
  Moon,
  UserPlus,
  RotateCcw
} from 'lucide-react';
import PaginationBar from '@/components/common/PaginationBar';

interface AttendanceRecord {
  _id?: string;
  timeSlot: string;
  checkInType: 'start' | 'end';
  checkInTime: string;
  status: 'pending' | 'approved' | 'rejected';
  dayNumber?: number;
  slotDate?: string;
}

interface Participant {
  userId: string | { _id: string; name: string; email: string };
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  avatarUrl?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'removed';
  rejectionReason?: string;
  rejectedBy?: string | { _id: string; name: string; email: string };
  rejectedAt?: string;
  removedAt?: string;
  removedBy?: string | { _id: string; name: string; email: string };
  removalReason?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  attendances?: AttendanceRecord[];
  registeredDaySlots?: Array<{ day: number; slot: 'morning' | 'afternoon' | 'evening' }>;
}

interface TimeSlot {
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  activities?: string;
  detailedLocation?: string;
}

interface Activity {
  _id: string;
  name: string;
  description: string;
  date: string;
  participants: Participant[];
  maxParticipants: number;
  status: string;
  location?: string;
  responsiblePerson?: any;
  type?: 'single_day' | 'multiple_days';
  timeSlots?: TimeSlot[];
  schedule?: Array<{
    day: number;
    date: string;
    activities: string;
  }>;
  registrationThreshold?: number;
}

export default function ParticipantsPage() {
  const { activityId } = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [participantToRemove, setParticipantToRemove] = useState<Participant | null>(null);
  const [removalReason, setRemovalReason] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<'morning' | 'afternoon' | 'evening' | null>(null);
  const [expandedRejected, setExpandedRejected] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'main' | 'removed' | 'rejected'>('main');
  const [showRegisteredSlotsModal, setShowRegisteredSlotsModal] = useState(false);
  const [selectedParticipantForSlots, setSelectedParticipantForSlots] = useState<Participant | null>(null);
  const [selectedDaySlotsForRegistration, setSelectedDaySlotsForRegistration] = useState<Array<{ day: number; slot: 'morning' | 'afternoon' | 'evening' }>>([]);
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
  const hasFetchedRef = useRef(false);

  // Check if user has required role (CLUB_DEPUTY, OFFICER, or CLUB_MEMBER)
  const hasAccess = useMemo(() => {
    return user && (user.role === 'CLUB_DEPUTY' || user.role === 'OFFICER' || user.role === 'CLUB_MEMBER');
  }, [user?.role]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Reset fetch flag when activityId changes
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [activityId]);

  useEffect(() => {
    // Prevent multiple fetches for the same activityId
    if (hasFetchedRef.current) return;
    
    // Wait for auth to finish loading before checking access
    if (authLoading) return;
    
    if (hasAccess) {
      hasFetchedRef.current = true;
      fetchActivityAndParticipants();
    } else if (user) {
      // User is loaded but doesn't have access
      hasFetchedRef.current = true;
      setLoading(false);
      setError('Bạn không có quyền truy cập trang này. Chỉ CLUB_DEPUTY, OFFICER và CLUB_MEMBER mới có quyền.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId, hasAccess, authLoading]);

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      const savedTheme = localStorage.getItem('theme');
      setIsDarkMode(savedTheme === 'dark');
    };
    
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  const fetchActivityAndParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      // Fetch activity data
      const activityResponse = await fetch(`/api/activities/${activityId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!activityResponse.ok) {
        throw new Error('Không thể tải thông tin hoạt động');
      }

      const activityData = await activityResponse.json();
      if (!activityData.success || !activityData.data) {
        throw new Error('Dữ liệu hoạt động không hợp lệ');
      }

      const activityInfo = activityData.data.activity || activityData.data;
      
      // Extract timeSlots from schedule for multiple_days activities if timeSlots is empty
      if (activityInfo.type === 'multiple_days' && (!activityInfo.timeSlots || activityInfo.timeSlots.length === 0) && activityInfo.schedule) {
        // Parse timeSlots from schedule.activities string
        const extractedSlots: TimeSlot[] = [];
        activityInfo.schedule.forEach((day: any) => {
          if (day.activities) {
            const slotMatches = day.activities.match(/Buổi (Sáng|Chiều|Tối) \(([\d:]+)-([\d:]+)\)/g);
            if (slotMatches) {
              slotMatches.forEach((match: string) => {
                const nameMatch = match.match(/Buổi (Sáng|Chiều|Tối)/);
                const timeMatch = match.match(/\(([\d:]+)-([\d:]+)\)/);
                if (nameMatch && timeMatch) {
                  const slotName = `Buổi ${nameMatch[1]}`;
                  if (!extractedSlots.find(s => s.name === slotName)) {
                    extractedSlots.push({
                      name: slotName,
                      startTime: timeMatch[1],
                      endTime: timeMatch[2],
                      isActive: true
                    });
                  }
                }
              });
            }
          }
        });
        if (extractedSlots.length > 0) {
          activityInfo.timeSlots = extractedSlots;
        }
      }
      
      setActivity(activityInfo);
      
      // Set initial selected day to first day in schedule for multiple_days
      if (activityInfo.type === 'multiple_days' && activityInfo.schedule && activityInfo.schedule.length > 0) {
        setSelectedDay(activityInfo.schedule[0].day);
        
        // Parse schedule data for multiple days into structured format (similar to student page)
        if (activityInfo.schedule && activityInfo.schedule.length > 0) {
          const parsedData = activityInfo.schedule.map((daySchedule: any) => {
            const activitiesText = daySchedule.activities || '';
            const lines = activitiesText.split('\n').filter((line: string) => line.trim());
            
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
            
            lines.forEach((line: string) => {
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
      }
      
      // Fetch attendance data to get attendances for each participant
      let attendanceData: any = null;
      try {
        const attendanceResponse = await fetch(`/api/activities/${activityId}/attendance`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (attendanceResponse.ok) {
          const attendanceJson = await attendanceResponse.json();
          if (attendanceJson.success && attendanceJson.data) {
            attendanceData = attendanceJson.data;
          }
        } else {
          console.warn('Attendance API response not OK:', attendanceResponse.status, attendanceResponse.statusText);
        }
      } catch (attendanceError) {
        console.warn('Could not fetch attendance data:', attendanceError);
        // Continue without attendance data
      }
      
      // Create a map of participant attendances from attendance API
      // Use normalized userId strings as keys for reliable matching
      const attendancesMap = new Map<string, AttendanceRecord[]>();
      // API returns 'participants' not 'participantsWithAttendance'
      const participantsFromAttendance = attendanceData?.participants || attendanceData?.participantsWithAttendance || [];
      
      if (participantsFromAttendance.length > 0) {
        participantsFromAttendance.forEach((p: any) => {
          // Normalize userId to string for consistent matching
          let participantId: string;
          if (typeof p.userId === 'object' && p.userId !== null) {
            participantId = String(p.userId._id || p.userId);
          } else {
            participantId = String(p.userId);
          }
          
          if (p.attendances && Array.isArray(p.attendances)) {
            // Store attendances even if empty array, but prefer non-empty arrays
            if (p.attendances.length > 0) {
              attendancesMap.set(participantId, p.attendances);
            } else if (!attendancesMap.has(participantId)) {
              // Store empty array as fallback
              attendancesMap.set(participantId, []);
            }
          }
        });
      }
      
      // Debug: Log attendance data structure
      if (process.env.NODE_ENV === 'development') {
        console.log('Attendance API response:', {
          hasData: !!attendanceData,
          hasParticipants: !!attendanceData?.participants,
          hasParticipantsWithAttendance: !!attendanceData?.participantsWithAttendance,
          participantsCount: participantsFromAttendance.length,
          attendancesMapSize: attendancesMap.size,
          attendancesMapKeys: Array.from(attendancesMap.keys())
        });
      }
        
        // Process participants - handle both populated and unpopulated userId
      const processedParticipants = (activityInfo.participants || []).map((participant: any) => {
          // Handle userId - can be ObjectId string or populated object
          const userId = typeof participant.userId === 'object' && participant.userId !== null
            ? participant.userId._id || participant.userId
            : participant.userId;
          
        // Normalize participantId to string for consistent matching
        const participantId = String(userId);
          
          // Get name and email - prefer direct fields, fallback to userId object
          const name = participant.name || 
            (typeof participant.userId === 'object' && participant.userId !== null && 'name' in participant.userId 
              ? String(participant.userId.name) 
              : 'Chưa có tên');
          const email = participant.email || 
            (typeof participant.userId === 'object' && participant.userId !== null && 'email' in participant.userId 
              ? String(participant.userId.email) 
              : '');
          
          // Handle joinedAt - convert to ISO string if it's a Date object or already a string
          const joinedAt = participant.joinedAt 
            ? (typeof participant.joinedAt === 'string' 
                ? participant.joinedAt 
                : new Date(participant.joinedAt).toISOString())
            : new Date().toISOString();
          
        // Get attendances from attendance API if available
        // Try multiple matching strategies to ensure we find the attendances
        let attendances: AttendanceRecord[] = [];
        
        // Debug: Log matching attempt
        if (process.env.NODE_ENV === 'development') {
          console.log(`Matching attendances for participant:`, {
            name,
            participantId,
            attendancesMapHasKey: attendancesMap.has(participantId),
            attendancesMapKeys: Array.from(attendancesMap.keys()),
            participantUserId: userId,
            participantUserIdType: typeof userId
          });
        }
        
        // First, try direct match with normalized participantId
        if (attendancesMap.has(participantId)) {
          attendances = attendancesMap.get(participantId) || [];
        } else {
          // Try matching with different string formats
          // Normalize both keys and participantId for comparison
          const normalizedParticipantId = String(participantId).trim();
          for (const [key, value] of attendancesMap.entries()) {
            const normalizedKey = String(key).trim();
            // Direct string match (case-insensitive)
            if (normalizedKey.toLowerCase() === normalizedParticipantId.toLowerCase() ||
                normalizedKey === normalizedParticipantId) {
              attendances = value;
              break;
            }
            // Try removing any whitespace and comparing
            if (normalizedKey.replace(/\s/g, '') === normalizedParticipantId.replace(/\s/g, '')) {
              attendances = value;
              break;
            }
          }
        }
        
        // Fallback to participant.attendances if available
        if (attendances.length === 0 && participant.attendances && Array.isArray(participant.attendances)) {
          attendances = participant.attendances;
        }
        
        // Debug: Log final attendances
        if (process.env.NODE_ENV === 'development') {
          console.log(`Final attendances for ${name}:`, {
            attendancesCount: attendances.length,
            attendances: attendances
          });
        }
          
          return {
            userId: userId,
            name: name,
            email: email,
            role: participant.role || 'Người Tham Gia',
            joinedAt: joinedAt,
            avatarUrl: participant.avatarUrl,
            approvalStatus: participant.approvalStatus || 'pending',
            rejectionReason: participant.rejectionReason,
            rejectedBy: participant.rejectedBy,
            rejectedAt: participant.rejectedAt,
            removedAt: participant.removedAt,
            removedBy: participant.removedBy,
            removalReason: participant.removalReason,
            checkedIn: participant.checkedIn || false,
            checkedInAt: participant.checkedInAt ? (
              typeof participant.checkedInAt === 'string' 
                ? participant.checkedInAt 
                : new Date(participant.checkedInAt).toISOString()
            ) : undefined,
            checkedInBy: participant.checkedInBy || undefined,
            attendances: attendances,
            registeredDaySlots: participant.registeredDaySlots || []
          };
        });
        
      // Debug: Log attendances mapping
      if (process.env.NODE_ENV === 'development') {
        console.log('Participants with attendances:', processedParticipants.map((p: Participant) => ({
          name: p.name,
          userId: p.userId,
          attendancesCount: p.attendances?.length || 0,
          attendances: p.attendances
        })));
        
        // Debug: Log approval statuses
        const statusCounts = processedParticipants.reduce((acc: any, p: Participant) => {
          const status = p.approvalStatus || 'pending';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
        console.log('Participants by approval status:', statusCounts);
        console.log('Removed participants:', processedParticipants.filter((p: Participant) => p.approvalStatus === 'removed').map((p: Participant) => ({
          name: p.name,
          removedAt: p.removedAt,
          removedBy: p.removedBy
        })));
        console.log('Rejected participants:', processedParticipants.filter((p: Participant) => p.approvalStatus === 'rejected').map((p: Participant) => ({
          name: p.name,
          rejectedAt: p.rejectedAt,
          rejectedBy: p.rejectedBy
        })));
      }
      
      setParticipants(processedParticipants);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!participantToRemove) return;
    
    try {
      const participantId = typeof participantToRemove.userId === 'object' && participantToRemove.userId !== null
        ? participantToRemove.userId._id || String(participantToRemove.userId)
        : String(participantToRemove.userId);
      
      setProcessing(participantId);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/activities/${activityId}/participants`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          userId: participantId,
          removalReason: removalReason.trim() || undefined
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.message || responseData.error || 'Không thể xóa người tham gia';
        const errorDetails = responseData.details ? `\nChi tiết: ${Array.isArray(responseData.details) ? responseData.details.join(', ') : responseData.details}` : '';
        throw new Error(errorMessage + errorDetails);
      }

      // Refresh list
      await fetchActivityAndParticipants();
      setShowRemoveModal(false);
      setParticipantToRemove(null);
      setRemovalReason('');
      setSuccessMessage('Đã xóa người tham gia thành công');
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      setSuccessMessage(null);
    } finally {
      setProcessing(null);
    }
  };

  const confirmRemove = (participant: Participant) => {
    setParticipantToRemove(participant);
    setRemovalReason('');
    setShowRemoveModal(true);
  };

  const handlePermanentDelete = async (participant: Participant) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn người này khỏi hoạt động? Hành động này không thể hoàn tác.')) {
      return;
    }
    
    try {
      const participantId = typeof participant.userId === 'object' && participant.userId !== null
        ? participant.userId._id || String(participant.userId)
        : String(participant.userId);
      
      setProcessing(`${participantId}-permanent`);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/activities/${activityId}/participants`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: participantId, permanent: true }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.message || responseData.error || 'Không thể xóa vĩnh viễn người tham gia';
        throw new Error(errorMessage);
      }

      // Refresh list
      await fetchActivityAndParticipants();
      setSuccessMessage('Đã xóa vĩnh viễn người tham gia thành công');
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      setSuccessMessage(null);
    } finally {
      setProcessing(null);
    }
  };

  const handleRestore = async (participant: Participant) => {
    if (!confirm(`Bạn có chắc chắn muốn khôi phục ${participant.name || 'người này'} không? Người này sẽ được chuyển về trạng thái chờ duyệt.`)) {
      return;
    }
    
    try {
      const participantId = typeof participant.userId === 'object' && participant.userId !== null
        ? participant.userId._id || String(participant.userId)
        : String(participant.userId);
      const processingKey = `${participantId}-restore`;
      setProcessing(processingKey);
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/activities/${activityId}/participants`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          userId: participantId,
          action: 'restore'
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.message || responseData.error || 'Không thể khôi phục người tham gia';
        throw new Error(errorMessage);
      }

      // Refresh list
      await fetchActivityAndParticipants();
      setSuccessMessage('Đã khôi phục người tham gia thành công');
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      setSuccessMessage(null);
    } finally {
      setProcessing(null);
    }
  };

  const handleApproveReject = async (
    participant: Participant,
    action: 'approve' | 'reject' | 'undo_reject',
    rejectionReasonParam?: string
  ) => {
    try {
      const participantId = typeof participant.userId === 'object' && participant.userId !== null
        ? participant.userId._id || String(participant.userId)
        : String(participant.userId);
      const processingKey = `${participantId}-${action}`;
      setProcessing(processingKey);
      
      // Nếu là reject và chưa có lý do, hỏi người dùng
      let finalRejectionReason = rejectionReasonParam || '';
      if (action === 'reject' && !finalRejectionReason) {
        const reason = prompt('Nhập lý do từ chối (nếu có):');
        if (reason === null) {
          // User cancelled
          setProcessing(null);
          return;
        }
        finalRejectionReason = reason || '';
      }
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/activities/${activityId}/participants`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          userId: participantId,
          action: action,
          rejectionReason: finalRejectionReason
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorData = responseData;
        const actionMessages: { [key: string]: string } = {
          'approve': 'duyệt',
          'reject': 'từ chối',
          'undo_reject': 'xóa từ chối'
        };
        throw new Error(errorData.message || `Không thể ${actionMessages[action] || action} người tham gia`);
      }

      // Refresh list
      await fetchActivityAndParticipants();
      const actionMessages: { [key: string]: string } = {
        'approve': 'duyệt',
        'reject': 'từ chối',
        'undo_reject': 'xóa từ chối'
      };
      setSuccessMessage(`Đã ${actionMessages[action] || action} người tham gia thành công`);
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      setSuccessMessage(null);
    } finally {
      setProcessing(null);
    }
  };

  // Helper function to get registration threshold (default 80 if not set)
  const getRegistrationThreshold = useCallback((): number => {
    if (!activity) return 80;
    return activity.registrationThreshold !== undefined && activity.registrationThreshold !== null ? activity.registrationThreshold : 80;
  }, [activity]);

  // Count registered participants for a specific day and slot
  const countRegisteredForDaySlot = useCallback((day: number, slot: 'morning' | 'afternoon' | 'evening'): number => {
    if (!participants || participants.length === 0) {
      return 0;
    }
    
    const dayNum = Number(day);
    const filtered = participants.filter(p => {
      // Only count approved and pending participants
      if (p.approvalStatus === 'rejected' || p.approvalStatus === 'removed') {
        return false;
      }
      
      if (!p.registeredDaySlots || !Array.isArray(p.registeredDaySlots) || p.registeredDaySlots.length === 0) {
        return false;
      }
      
      const hasSlot = p.registeredDaySlots.some((daySlot: { day: number; slot: string }) => {
        const slotDayNum = Number(daySlot.day);
        const dayMatches = slotDayNum === dayNum;
        const slotMatches = daySlot.slot === slot;
        return dayMatches && slotMatches;
      });
      
      // Debug log
      if (process.env.NODE_ENV === 'development' && hasSlot) {
        console.log(`Participant ${p.name} registered for Day ${day}, Slot ${slot}:`, {
          participantName: p.name,
          registeredDaySlots: p.registeredDaySlots,
          dayNum,
          slot,
          hasSlot
        });
      }
      
      return hasSlot;
    });
    
    const count = filtered.length;
    
    // Debug log
    if (process.env.NODE_ENV === 'development') {
      console.log(`Count for Day ${day}, Slot ${slot}:`, {
        day,
        slot,
        count,
        totalParticipants: participants.length,
        filteredParticipants: filtered.map(p => p.name)
      });
    }
    
    return count;
  }, [participants]);

  // Get registration counts for all slots in a day
  const getDaySlotCounts = useCallback((day: number) => {
    if (!participants || participants.length === 0) {
      return {
        morning: 0,
        afternoon: 0,
        evening: 0,
        total: 0
      };
    }
    
    // Count unique participants who registered for at least one slot in this day
    const uniqueParticipants = new Set<string>();
    
    participants.forEach(p => {
      // Only count approved and pending participants
      if (p.approvalStatus === 'rejected' || p.approvalStatus === 'removed') {
        return;
      }
      
      if (!p.registeredDaySlots || !Array.isArray(p.registeredDaySlots) || p.registeredDaySlots.length === 0) {
        return;
      }
      
      // Check if this participant registered for any slot in this day
      const hasRegisteredForDay = p.registeredDaySlots.some((daySlot: { day: number; slot: string }) => {
        return Number(daySlot.day) === Number(day);
      });
      
      if (hasRegisteredForDay) {
        // Use userId as unique identifier
        const participantId = typeof p.userId === 'object' && p.userId !== null
          ? String(p.userId._id || p.userId)
          : String(p.userId);
        uniqueParticipants.add(participantId);
      }
    });
    
    return {
      morning: countRegisteredForDaySlot(day, 'morning'),
      afternoon: countRegisteredForDaySlot(day, 'afternoon'),
      evening: countRegisteredForDaySlot(day, 'evening'),
      total: uniqueParticipants.size // Count unique participants, not total slots
    };
  }, [participants, countRegisteredForDaySlot]);

  // Calculate registration rate for a specific day and slot
  const calculateRegistrationRate = useCallback((day: number, slot: 'morning' | 'afternoon' | 'evening'): number => {
    if (!activity) {
      return 0;
    }

    if (!activity.maxParticipants || activity.maxParticipants === 0 || activity.maxParticipants === Infinity) {
      return 0;
    }

    let registeredCount = 0;
    
    if (!activity.participants || activity.participants.length === 0) {
      return 0;
    }
    
    if (activity.type === 'multiple_days') {
      registeredCount = activity.participants.filter((p: any) => {
        const approvalStatus = p.approvalStatus || 'pending';
        if (approvalStatus === 'rejected' || approvalStatus === 'removed') {
          return false;
        }
        
        if (p.registeredDaySlots && Array.isArray(p.registeredDaySlots) && p.registeredDaySlots.length > 0) {
          return p.registeredDaySlots.some((ds: any) => ds.day === day && ds.slot === slot);
        }
        return true;
      }).length;
    } else {
      registeredCount = activity.participants.filter((p: any) => {
        const approvalStatus = p.approvalStatus || 'pending';
        return approvalStatus !== 'rejected' && approvalStatus !== 'removed';
      }).length;
    }

    const rate = (registeredCount / activity.maxParticipants) * 100;
    return Math.round(rate);
  }, [activity]);

  // Check if registration is allowed (rate < registrationThreshold)
  const canRegister = useCallback((day: number, slot: 'morning' | 'afternoon' | 'evening'): boolean => {
    if (!activity) return false;
    const rate = calculateRegistrationRate(day, slot);
    const threshold = getRegistrationThreshold();
    return rate < threshold;
  }, [calculateRegistrationRate, activity, getRegistrationThreshold]);

  // Calculate total registration rate based on selected slots
  const calculateTotalRegistrationRate = useCallback((): number => {
    if (!activity || selectedDaySlotsForRegistration.length === 0) {
      return 0;
    }

    if (activity.type === 'multiple_days' && parsedScheduleData.length > 0) {
      let totalAvailableSlots = 0;
      parsedScheduleData.forEach((dayData: { day: number; date: string; slots: Array<{ slotKey?: string }> }) => {
        const activeSlots = dayData.slots.filter((s: { slotKey?: string }) => s.slotKey).length;
        totalAvailableSlots += activeSlots;
      });

      if (totalAvailableSlots === 0) {
        return 0;
      }

      const selectedSlotsCount = selectedDaySlotsForRegistration.length;
      const totalRate = (selectedSlotsCount / totalAvailableSlots) * 100;
      return Math.round(totalRate);
    }

    return 0;
  }, [activity, selectedDaySlotsForRegistration, parsedScheduleData]);

  // Toggle day slot selection
  const toggleDaySlotSelection = async (day: number, slot: 'morning' | 'afternoon' | 'evening') => {
    const exists = selectedDaySlotsForRegistration.find(ds => ds.day === day && ds.slot === slot);
    
    if (exists) {
      setSelectedDaySlotsForRegistration(prev => prev.filter(ds => !(ds.day === day && ds.slot === slot)));
    } else {
      if (!canRegister(day, slot)) {
        if (!activity) return;
        const slotName = slot === 'morning' ? 'Sáng' : slot === 'afternoon' ? 'Chiều' : 'Tối';
        const threshold = getRegistrationThreshold();
        alert(`Tỷ lệ đăng ký cho ngày ${day}, buổi ${slotName} đã đạt ${calculateRegistrationRate(day, slot)}%. Chỉ có thể đăng ký khi tỷ lệ dưới ${threshold}%.`);
        return;
      }

      // Check for overlapping slots with other activities (for the participant being updated)
      if (selectedParticipantForSlots && activity && activity._id) {
        try {
          const participantId = typeof selectedParticipantForSlots.userId === 'object' && selectedParticipantForSlots.userId !== null
            ? selectedParticipantForSlots.userId._id || String(selectedParticipantForSlots.userId)
            : String(selectedParticipantForSlots.userId);
          
          const token = localStorage.getItem('token');
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
              schedule: activity.schedule,
              userId: participantId // Pass participant's userId to check their other registrations
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
              currentActivityName: activity?.name,
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

  // Handle update registeredDaySlots for a participant (officer can update on behalf of participant)
  const handleUpdateParticipantDaySlots = async () => {
    if (!selectedParticipantForSlots || !activity || selectedDaySlotsForRegistration.length === 0) {
      alert("Vui lòng chọn ít nhất một ngày và buổi.");
      return;
    }

    const totalRate = calculateTotalRegistrationRate();
    const threshold = getRegistrationThreshold();
    if (totalRate < threshold) {
      alert(`Tổng tỷ lệ đăng ký của các buổi đã chọn là ${totalRate}%. Bạn phải chọn đủ buổi để tổng tỷ lệ đạt ít nhất ${threshold}% mới có thể cập nhật.`);
      return;
    }

    try {
      const participantId = typeof selectedParticipantForSlots.userId === 'object' && selectedParticipantForSlots.userId !== null
        ? selectedParticipantForSlots.userId._id || String(selectedParticipantForSlots.userId)
        : String(selectedParticipantForSlots.userId);
      
      setProcessing(`${participantId}-update-slots`);
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/activities/${activityId}/register`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: participantId,
          daySlots: selectedDaySlotsForRegistration
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update registered slots');
      }

      const result = await response.json();
      alert(result.message);

      // Refresh data
      await fetchActivityAndParticipants();
      
      setShowRegisteredSlotsModal(false);
      setSelectedParticipantForSlots(null);
      setSelectedDaySlotsForRegistration([]);
      setSuccessMessage('Đã cập nhật buổi đăng ký thành công');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi cập nhật buổi đăng ký');
      setSuccessMessage(null);
    } finally {
      setProcessing(null);
    }
  };

  // Filter participants
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      const participantName = p.name || 
        (typeof p.userId === 'object' && p.userId !== null && 'name' in p.userId 
          ? String(p.userId.name) 
          : '');
      const participantEmail = p.email || 
        (typeof p.userId === 'object' && p.userId !== null && 'email' in p.userId 
          ? String(p.userId.email) 
          : '');
      
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = searchLower === '' || 
        participantName.toLowerCase().includes(searchLower) ||
        participantEmail.toLowerCase().includes(searchLower);
      
      const matchesRole = selectedRole === 'all' || (p.role || 'Người Tham Gia') === selectedRole;
      
      // Exclude rejected and removed participants from main list
      const matchesStatus = p.approvalStatus !== 'rejected' && p.approvalStatus !== 'removed';
      
      // Filter by selectedDay: if a day is selected, only show participants who registered for that day
      let matchesDay = true;
      if (selectedDay !== null && selectedDay !== undefined && activity && activity.type === 'multiple_days') {
        // Check if participant has registeredDaySlots for the selected day
        if (p.registeredDaySlots && Array.isArray(p.registeredDaySlots) && p.registeredDaySlots.length > 0) {
          // Ensure both values are numbers for proper comparison
          const selectedDayNum = Number(selectedDay);
          matchesDay = p.registeredDaySlots.some((daySlot: { day: number; slot: string }) => {
            const daySlotDayNum = Number(daySlot.day);
            const dayMatches = daySlotDayNum === selectedDayNum;
            
            // If a slot is also selected, check if it matches
            if (selectedSlot !== null && selectedSlot !== undefined) {
              return dayMatches && daySlot.slot === selectedSlot;
            }
            
            // If no slot selected, just check day
            return dayMatches;
          });
        } else {
          // If no registeredDaySlots, don't show this participant when a day is selected
          matchesDay = false;
        }
      }
      
      return matchesSearch && matchesRole && matchesStatus && matchesDay;
    });
  }, [participants, searchQuery, selectedRole, selectedDay, selectedSlot, activity]);

  // Filter rejected participants separately
  const rejectedParticipants = useMemo(() => {
    return participants.filter(p => {
      const participantName = p.name || 
        (typeof p.userId === 'object' && p.userId !== null && 'name' in p.userId 
          ? String(p.userId.name) 
          : '');
      const participantEmail = p.email || 
        (typeof p.userId === 'object' && p.userId !== null && 'email' in p.userId 
          ? String(p.userId.email) 
          : '');
      
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = searchLower === '' || 
        participantName.toLowerCase().includes(searchLower) ||
        participantEmail.toLowerCase().includes(searchLower);
      
      const matchesRole = selectedRole === 'all' || (p.role || 'Người Tham Gia') === selectedRole;
      
      return p.approvalStatus === 'rejected' && matchesSearch && matchesRole;
    });
  }, [participants, searchQuery, selectedRole]);

  // Filter removed participants separately
  const removedParticipants = useMemo(() => {
    return participants.filter(p => {
      const participantName = p.name || 
        (typeof p.userId === 'object' && p.userId !== null && 'name' in p.userId 
          ? String(p.userId.name) 
          : '');
      const participantEmail = p.email || 
        (typeof p.userId === 'object' && p.userId !== null && 'email' in p.userId 
          ? String(p.userId.email) 
          : '');
      
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = searchLower === '' || 
        participantName.toLowerCase().includes(searchLower) ||
        participantEmail.toLowerCase().includes(searchLower);
      
      const matchesRole = selectedRole === 'all' || (p.role || 'Người Tham Gia') === selectedRole;
      
      return p.approvalStatus === 'removed' && matchesSearch && matchesRole;
    });
  }, [participants, searchQuery, selectedRole]);
  
  // Paginated participants
  const paginatedParticipants = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredParticipants.slice(startIndex, endIndex);
  }, [filteredParticipants, currentPage, itemsPerPage]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRole]);

  // Get unique roles for filter
  const uniqueRoles = useMemo(() => {
    const roles = new Set(participants.map(p => p.role || 'Người Tham Gia'));
    return Array.from(roles).sort();
  }, [participants]);

  // Calculate participation percentage (for registration)
  const participationPercent = useMemo(() => {
    if (!activity || !activity.maxParticipants || activity.maxParticipants === Infinity) return 0;
    return Math.round((participants.length / activity.maxParticipants) * 100);
  }, [activity, participants]);

  // Calculate overall attendance percentage based on check-ins (same as attendance page)
  // Count all participants (not just approved) to match attendance page logic
  const overallAttendancePercentage = useMemo(() => {
    if (!activity || !participants.length) return 0;

    let approvedCheckIns = 0;

    if (activity.type === 'multiple_days' && activity.schedule && activity.timeSlots) {
      const activeSlots = activity.timeSlots.filter(slot => slot.isActive);
      if (activeSlots.length === 0) return 0;
      
      const totalExpected = activity.schedule.length * activeSlots.length * 2 * participants.length; // days * slots * 2 (start+end) * participants
      
      participants.forEach((participant) => {
        if (participant.attendances && Array.isArray(participant.attendances) && participant.attendances.length > 0) {
          participant.attendances.forEach((att) => {
            if (att.status === 'approved') {
              approvedCheckIns++;
            }
          });
        }
      });

      const percentage = totalExpected > 0 ? Math.round((approvedCheckIns / totalExpected) * 100) : 0;
      return percentage;
    } else if (activity.type === 'single_day' && activity.timeSlots) {
      const activeSlots = activity.timeSlots.filter(slot => slot.isActive);
      if (activeSlots.length === 0) return 0;
      
      const totalExpected = activeSlots.length * 2 * participants.length; // slots * 2 (start+end) * participants
      
      participants.forEach((participant) => {
        if (participant.attendances && Array.isArray(participant.attendances) && participant.attendances.length > 0) {
          participant.attendances.forEach((att) => {
            if (att.status === 'approved') {
              approvedCheckIns++;
            }
          });
        }
      });

      const percentage = totalExpected > 0 ? Math.round((approvedCheckIns / totalExpected) * 100) : 0;
      return percentage;
    }

    return 0;
  }, [activity, participants]);

  // Get time status for a slot (not_started, in_progress, past)
  const getTimeStatus = useCallback((slot: TimeSlot, activityDate: string, checkInType?: 'start' | 'end'): 'not_started' | 'in_progress' | 'past' => {
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
      targetTime = endTime;
    } else {
      targetTime = startTime;
    }
    
    // Allow 15 minutes before target time
    const earlyStart = new Date(targetTime.getTime() - 15 * 60000);
    // Close 30 minutes after target time
    const closeTime = new Date(targetTime.getTime() + 30 * 60000);
    
    if (now < earlyStart) {
      return 'not_started';
    } else if (now >= earlyStart && now <= closeTime) {
      return 'in_progress';
    } else {
      return 'past';
    }
  }, []);

  // Get attendance status with time information (same as attendance page)
  const getAttendanceStatusWithTime = useCallback((
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
      return {
        attendance,
        status: attendance.status,
        timeStatus: 'on_time', // Simplified for percentage calculation
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
  }, [getTimeStatus]);

  // Calculate attendance percentage for a participant (using same logic as attendance page)
  // If selectedDay is provided, calculate only for that day; otherwise calculate for all days
  const calculateAttendancePercentage = useCallback((participant: Participant, selectedDay?: number | null): number => {
    if (!activity || !activity.timeSlots) return 0;
    
    const activeSlots = activity.timeSlots.filter(slot => slot.isActive);
    if (activeSlots.length === 0) return 0;
    
    // Debug: Check if participant has attendances
    if (process.env.NODE_ENV === 'development' && !participant.attendances) {
      console.warn('Participant has no attendances:', participant.name, participant.userId);
    }
    
    let totalCheckIns = 0; // Total check-ins needed (100%)
    let completedCheckIns = 0; // Number of check-ins (approved + pending, excluding rejected)
    
    // For multiple_days activities
    if (activity.type === 'multiple_days' && activity.schedule) {
      // Filter schedule days based on selectedDay
      const daysToProcess = selectedDay !== null && selectedDay !== undefined
        ? activity.schedule.filter((scheduleDay: any) => scheduleDay.day === selectedDay)
        : activity.schedule;
      
      if (daysToProcess.length === 0) return 0;
      
      // Total check-ins = number of selected days * number of active slots * 2 (start + end)
      totalCheckIns = daysToProcess.length * activeSlots.length * 2;
      
      // Count check-ins for selected day(s) and slots (approved + pending)
      daysToProcess.forEach((scheduleDay: any) => {
        const dayNumber = scheduleDay.day;
        activeSlots.forEach((slot) => {
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
      // Total check-ins = number of active slots * 2 (start + end)
      totalCheckIns = activeSlots.length * 2;
      
      // Count check-ins (approved + pending, not rejected)
      activeSlots.forEach((slot) => {
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
    
    // Debug: Log calculation details
    if (process.env.NODE_ENV === 'development') {
      console.log(`Attendance percentage for ${participant.name} (selectedDay: ${selectedDay}):`, {
        completedCheckIns,
        totalCheckIns,
        percentage,
        hasAttendances: !!participant.attendances,
        attendancesCount: participant.attendances?.length || 0
      });
    }
    
    return percentage;
  }, [activity, getAttendanceStatusWithTime]);

  // Get day name helper
  const getDayName = (date: Date | string): string => {
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
    return days[dayOfWeek] || '';
  };

  // Group schedule days by week
  const groupDaysByWeek = useMemo(() => {
    if (!activity || activity.type !== 'multiple_days' || !activity.schedule || activity.schedule.length === 0) return [];
    
    // Sort schedule by date
    const sortedSchedule = [...activity.schedule].sort((a: any, b: any) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });
    
    // Group by week
    const weeks: Array<Array<{ date: Date; scheduleDay: any; dayName: string }>> = [];
    let currentWeek: Array<{ date: Date; scheduleDay: any; dayName: string }> = [];
    let currentWeekStart: Date | null = null;
    
    sortedSchedule.forEach((scheduleDay: any) => {
      const dayDate = new Date(scheduleDay.date);
      
      // Find the Monday of this day's week
      const dayMonday = new Date(dayDate);
      const dayOfWeek = dayMonday.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      dayMonday.setDate(dayMonday.getDate() - daysToMonday);
      dayMonday.setHours(0, 0, 0, 0);
      
      // If this is a new week, start a new week array
      if (!currentWeekStart || dayMonday.getTime() !== currentWeekStart.getTime()) {
        if (currentWeek.length > 0) {
          weeks.push(currentWeek);
        }
        currentWeek = [];
        currentWeekStart = dayMonday;
      }
      
      currentWeek.push({
        date: dayDate,
        scheduleDay,
        dayName: getDayName(dayDate)
      });
    });
    
    // Add the last week
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  }, [activity]);

  // Get week days for a given week index - return all 7 days (Monday to Sunday)
  const getWeekDays = useCallback((weekIndex: number) => {
    if (!activity || activity.type !== 'multiple_days' || !activity.schedule || activity.schedule.length === 0) return [];
    
    // Get all dates from schedule
    const allDates = activity.schedule.map((s: any) => new Date(s.date));
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    
    // Find the Monday of the first week
    const firstMonday = new Date(minDate);
    const firstDayOfWeek = firstMonday.getDay();
    const daysToMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    firstMonday.setDate(firstMonday.getDate() - daysToMonday);
    
    // Calculate the Monday of the target week
    const targetMonday = new Date(firstMonday);
    targetMonday.setDate(targetMonday.getDate() + (weekIndex * 7));
    
    // Generate all 7 days of the week (Monday to Sunday)
    const weekDays: Array<{ date: Date; scheduleDay: any | null; dayName: string }> = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(targetMonday);
      dayDate.setDate(targetMonday.getDate() + i);
      
      // Find matching schedule day
      const scheduleDay = activity.schedule.find((s: any) => {
        const sDate = new Date(s.date);
        return sDate.toDateString() === dayDate.toDateString();
      });
      
      weekDays.push({ 
        date: dayDate, 
        scheduleDay: scheduleDay || null,
        dayName: getDayName(dayDate)
      });
    }
    
    return weekDays;
  }, [activity]);

  // Calculate total weeks needed
  const totalWeeks = useMemo(() => {
    return Math.max(1, groupDaysByWeek.length);
  }, [groupDaysByWeek]);

  // Get current week days
  const currentWeekDays = useMemo(() => {
    return getWeekDays(currentWeekIndex);
  }, [getWeekDays, currentWeekIndex]);

  // Calculate attendance percentage for a specific day
  const calculateDayAttendancePercentage = useCallback((scheduleDay: any): number => {
    if (!activity || !activity.timeSlots || !scheduleDay) return 0;
    
    const activeSlots = activity.timeSlots.filter(slot => slot.isActive);
    if (activeSlots.length === 0) return 0;
    
    const dayDate = scheduleDay.date;
    const dayNumber = scheduleDay.day;
    
    // Total expected check-ins for this day = number of slots * 2 (start + end) * number of participants
    const totalExpectedCheckIns = activeSlots.length * 2 * participants.length;
    if (totalExpectedCheckIns === 0) return 0;
    
    // Count approved check-ins for this specific day
    let approvedCheckIns = 0;
    
    participants.forEach((participant) => {
      if (participant.attendances && Array.isArray(participant.attendances) && participant.attendances.length > 0) {
        activeSlots.forEach((slot) => {
          // Check start check-in
          const startStatus = getAttendanceStatusWithTime(participant, slot, 'start', dayDate, dayNumber);
          if (startStatus.hasCheckedIn && 
              startStatus.attendance && 
              startStatus.attendance.status === 'approved') {
            approvedCheckIns++;
          }
          
          // Check end check-in
          const endStatus = getAttendanceStatusWithTime(participant, slot, 'end', dayDate, dayNumber);
          if (endStatus.hasCheckedIn && 
              endStatus.attendance && 
              endStatus.attendance.status === 'approved') {
            approvedCheckIns++;
          }
        });
      }
    });
    
    const percentage = totalExpectedCheckIns > 0 
      ? Math.round((approvedCheckIns / totalExpectedCheckIns) * 100)
      : 0;
    
    return percentage;
  }, [activity, participants, getAttendanceStatusWithTime]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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

  // Show loading while auth is loading or data is fetching
  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredRole="CLUB_MEMBER">
        <div className={`min-h-screen flex flex-col items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <Loader size={48} strokeWidth={2} className="animate-spin text-blue-500" />
          <p className={`mt-4 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Đang tải dữ liệu
          </p>
        </div>
      </ProtectedRoute>
    );
  }

  // Only show access denied if auth is loaded and user doesn't have access
  if (!authLoading && user && !hasAccess) {
    return (
      <ProtectedRoute requiredRole="CLUB_MEMBER">
        <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="text-center">
            <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Bạn không có quyền truy cập trang này
            </p>
            <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Chỉ CLUB_DEPUTY, OFFICER và CLUB_MEMBER mới có quyền xem danh sách người tham gia
            </p>
            <button
              onClick={() => router.back()}
              className={`mt-4 px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'}`}
            >
              Quay lại
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error && !activity) {
    return (
      <ProtectedRoute requiredRole="CLUB_MEMBER">
        <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="text-center">
            <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {error || 'Không tìm thấy hoạt động'}
            </p>
            <button
              onClick={() => router.back()}
              className={`mt-4 px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'}`}
            >
              Quay lại
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="CLUB_MEMBER">
      <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-[#0C0C0E]' : 'bg-[#F7F7F8]'}`}>
        <OfficerNav />
        
        <main className="flex-1 w-full">
          {/* Scientific Header Section */}
          {activity && (
            <div className={`border-b-[1.5px] ${isDarkMode ? 'bg-[#0C0C0E] border-[#2A2A2A]' : 'bg-white border-[#E2E2E2]'}`}>
              <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h1 className={`text-xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`} style={{ fontFamily: 'Inter, sans-serif' }}>
                      QUẢN LÝ NGƯỜI THAM GIA
                    </h1>
                    <p className={`text-xs mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Thông tin đăng ký của hoạt động • {(() => {
                        try {
                          const date = activity.date ? new Date(activity.date) : new Date();
                          if (isNaN(date.getTime())) return 'Chưa có ngày';
                          return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        } catch {
                          return 'Chưa có ngày';
                        }
                      })()}
                    </p>
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {activity.name}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/officer/activities/${activity._id}`)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border-[1.5px] ${
                        isDarkMode
                          ? 'border-[#2A2A2A] text-gray-300 hover:bg-[#2A2A2A]'
                          : 'border-[#E2E2E2] text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Xem hoạt động
                    </button>
                    <button
                      onClick={() => router.push(`/officer/attendance/${activity._id}`)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border-[1.5px] ${
                        isDarkMode
                          ? 'border-[#3A57E8] bg-[#3A57E8] text-white hover:bg-[#2A47D8]'
                          : 'border-[#3A57E8] bg-[#3A57E8] text-white hover:bg-[#2A47D8]'
                      }`}
                    >
                      <CheckSquare size={14} strokeWidth={2} className="inline mr-1" />
                      Điểm danh
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scientific Statistics Row */}
          {activity && (
            <div className={`border-b-[1.5px] ${isDarkMode ? 'bg-[#0C0C0E] border-[#2A2A2A]' : 'bg-white border-[#E2E2E2]'}`}>
              <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className={`p-3 rounded-[12px] border-[1.5px] ${isDarkMode ? 'bg-white border-black' : 'bg-white border-black'}`}>
                    <Users size={20} className={isDarkMode ? 'text-gray-900' : 'text-gray-900'} strokeWidth={2.5} />
                    <p className={`text-lg font-bold mt-2 mb-0.5 ${isDarkMode ? 'text-gray-900' : 'text-gray-900'}`}>
                      {participants.length} / {activity.maxParticipants || '∞'}
                    </p>
                    <p className={`text-[10px] uppercase tracking-wide ${isDarkMode ? 'text-gray-600' : 'text-gray-600'}`}>Tổng người tham gia</p>
                  </div>
                  
                  <div className={`p-3 rounded-[12px] border-[1.5px] ${isDarkMode ? 'bg-white border-black' : 'bg-white border-black'}`}>
                    <CheckSquare size={20} className={isDarkMode ? 'text-gray-900' : 'text-gray-900'} strokeWidth={2.5} />
                    <p className={`text-lg font-bold mt-2 mb-0.5 ${isDarkMode ? 'text-gray-900' : 'text-gray-900'}`}>{overallAttendancePercentage}%</p>
                    <p className={`text-[10px] uppercase tracking-wide ${isDarkMode ? 'text-gray-600' : 'text-gray-600'}`}>Tỷ lệ điểm danh</p>
                  </div>
                  
                  <div className={`p-3 rounded-[12px] border-[1.5px] ${isDarkMode ? 'bg-white border-black' : 'bg-white border-black'}`}>
                    <BarChart3 size={20} className={isDarkMode ? 'text-gray-900' : 'text-gray-900'} strokeWidth={2.5} />
                    <p className={`text-lg font-bold mt-2 mb-0.5 ${isDarkMode ? 'text-gray-900' : 'text-gray-900'}`}>{participationPercent}%</p>
                    <p className={`text-[10px] uppercase tracking-wide ${isDarkMode ? 'text-gray-600' : 'text-gray-600'}`}>Tỷ lệ đăng ký</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex flex-col gap-3">
              {/* Main Content Area */}
              <div className="flex-1 min-w-0">
                {/* Clean Week Selector for Multiple Days Activity */}
                {activity && activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0 && (
                  <div className={`w-full mb-3 rounded-[12px] border-[1.5px] ${isDarkMode ? 'bg-white border-black' : 'bg-white border-black'}`}>
                    <div className="p-2.5">
                      {/* Two Column Layout */}
                      {currentWeekDays.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Left Column - Week Navigation & Day Cards */}
                          <div className="flex flex-col items-center gap-3">
                      {/* Clean Week Navigation Header */}
                            <div className={`flex items-center justify-center px-2 py-1.5 rounded-lg ${
                        isDarkMode ? 'bg-gray-100' : 'bg-gray-100'
                      }`}>
                        <button
                          onClick={() => setCurrentWeekIndex(Math.max(0, currentWeekIndex - 1))}
                          disabled={currentWeekIndex === 0}
                          className={`p-0.5 rounded transition-colors ${
                            currentWeekIndex === 0
                              ? 'opacity-40 cursor-not-allowed'
                              : isDarkMode 
                                ? 'hover:bg-gray-200 text-gray-900' 
                                : 'hover:bg-gray-200 text-gray-900'
                          }`}
                        >
                          <ChevronLeft size={14} strokeWidth={2} />
                        </button>
                        
                        <div className="flex items-center gap-1.5 px-3">
                          <Calendar size={12} strokeWidth={2} className={isDarkMode ? 'text-gray-900' : 'text-gray-900'} />
                          <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-900' : 'text-gray-900'}`}>
                            Tuần {currentWeekIndex + 1}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => setCurrentWeekIndex(Math.min(totalWeeks - 1, currentWeekIndex + 1))}
                          disabled={currentWeekIndex === totalWeeks - 1}
                          className={`p-0.5 rounded transition-colors ${
                            currentWeekIndex === totalWeeks - 1
                              ? 'opacity-40 cursor-not-allowed'
                              : isDarkMode 
                                ? 'hover:bg-gray-200 text-gray-900' 
                                : 'hover:bg-gray-200 text-gray-900'
                          }`}
                        >
                          <ChevronRight size={14} strokeWidth={2} />
                        </button>
                      </div>
                      
                            {/* Week Days Grid - Centered */}
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {currentWeekDays.map((weekDay, dayIdx) => {
                            const isInSchedule = weekDay.scheduleDay !== null;
                            const registeredCount = isInSchedule ? participants.length : 0;
                            const maxParticipants = activity.maxParticipants || 12;
                            // Calculate attendance percentage for this specific day (not registration percentage)
                            const attendancePercentage = isInSchedule && weekDay.scheduleDay 
                              ? calculateDayAttendancePercentage(weekDay.scheduleDay)
                              : 0;
                            // Registration percentage (for display)
                            const registrationPercentage = maxParticipants > 0 ? Math.round((registeredCount / maxParticipants) * 100) : 0;
                            const isDaySelected = selectedDay === weekDay.scheduleDay?.day;
                            
                            return (
                              <button
                                key={dayIdx}
                                onClick={() => {
                                  if (isInSchedule && weekDay.scheduleDay) {
                                    setSelectedDay(weekDay.scheduleDay.day);
                                    setSelectedSlot(null); // Reset slot when selecting a new day
                                  }
                                }}
                                disabled={!isInSchedule}
                                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-[8px] border-[1.5px] transition-all min-w-[55px] ${
                                  !isInSchedule
                                    ? 'opacity-40 cursor-not-allowed'
                                    : 'cursor-pointer hover:shadow-sm'
                                } ${
                                  isDaySelected
                                    ? isDarkMode 
                                      ? 'bg-[#3A57E8] border-[#3A57E8] text-white' 
                                      : 'bg-[#3A57E8] border-[#3A57E8] text-white'
                                    : isDarkMode 
                                      ? 'bg-white border-black text-gray-900 hover:border-[#3A57E8]' 
                                      : 'bg-white border-black text-gray-900 hover:border-[#3A57E8]'
                                }`}
                              >
                                {/* Day Name */}
                                <p className={`text-[10px] font-semibold ${
                                  isDaySelected
                                    ? 'text-white'
                                    : isInSchedule
                                    ? isDarkMode ? 'text-gray-900' : 'text-gray-900'
                                    : isDarkMode ? 'text-gray-500' : 'text-gray-500'
                                }`}>
                                  {weekDay.dayName}
                                </p>
                                
                                {isInSchedule ? (
                                  <>
                                    {/* Stats */}
                                    <div className="flex flex-col items-center gap-0.5">
                                      <div className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                                        isDaySelected
                                          ? 'bg-white/20 text-white'
                                          : isDarkMode ? 'bg-gray-100 text-gray-900' : 'bg-gray-100 text-gray-900'
                                      }`}>
                                        {registeredCount}/{maxParticipants}
                                      </div>
                                      <div className={`text-[9px] font-medium ${
                                        isDaySelected
                                          ? 'text-white/80'
                                          : isDarkMode ? 'text-gray-600' : 'text-gray-600'
                                      }`}>
                                        {attendancePercentage}%
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <p className={`text-[9px] font-medium ${
                                    isDarkMode ? 'text-gray-500' : 'text-gray-500'
                                  }`}>
                                    Ngoài phạm vi
                                  </p>
                                )}
                              </button>
                            );
                          })}
                            </div>
                          </div>
                          
                          {/* Right Column - Slot Buttons */}
                          {selectedDay !== null && activity && activity.type === 'multiple_days' ? (() => {
                            const slotCounts = getDaySlotCounts(selectedDay);
                            const maxParticipants = activity.maxParticipants || 0;
                            
                            return (
                              <div className="flex flex-col items-center justify-center gap-3">
                                <div className="flex items-center gap-1.5 w-full max-w-md">
                                {/* Morning Slot */}
                                <button
                                  onClick={() => setSelectedSlot(selectedSlot === 'morning' ? null : 'morning')}
                                  className={`flex-1 flex items-center justify-between px-2 py-1.5 rounded-[6px] border-[1.5px] transition-all ${
                                    selectedSlot === 'morning'
                                      ? isDarkMode 
                                          ? 'bg-[#3A57E8] border-[#3A57E8] text-white' 
                                          : 'bg-[#3A57E8] border-[#3A57E8] text-white'
                                      : isDarkMode 
                                        ? 'bg-white border-black hover:bg-gray-50' 
                                        : 'bg-white border-black hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-1">
                                    <Sunrise size={10} strokeWidth={2} className={selectedSlot === 'morning' ? (isDarkMode ? 'text-white' : 'text-white') : (isDarkMode ? 'text-gray-900' : 'text-gray-900')} />
                                    <span className={`text-[9px] font-semibold ${selectedSlot === 'morning' ? (isDarkMode ? 'text-white' : 'text-white') : (isDarkMode ? 'text-gray-900' : 'text-gray-900')}`}>
                                      Sáng
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className={`text-xs font-bold ${selectedSlot === 'morning' ? (isDarkMode ? 'text-white' : 'text-white') : (isDarkMode ? 'text-gray-900' : 'text-gray-900')}`}>
                                      {slotCounts.morning}
                                    </span>
                                    {maxParticipants > 0 && (
                                      <span className={`text-[8px] ${selectedSlot === 'morning' ? (isDarkMode ? 'text-white/70' : 'text-white/70') : (isDarkMode ? 'text-gray-500' : 'text-gray-500')}`}>
                                        /{maxParticipants}
                                      </span>
                                    )}
                                  </div>
                                </button>
                                
                                {/* Afternoon Slot */}
                                <button
                                  onClick={() => setSelectedSlot(selectedSlot === 'afternoon' ? null : 'afternoon')}
                                  className={`flex-1 flex items-center justify-between px-2 py-1.5 rounded-[6px] border-[1.5px] transition-all ${
                                    selectedSlot === 'afternoon'
                                      ? isDarkMode 
                                          ? 'bg-[#3A57E8] border-[#3A57E8] text-white' 
                                          : 'bg-[#3A57E8] border-[#3A57E8] text-white'
                                      : isDarkMode 
                                        ? 'bg-white border-black hover:bg-gray-50' 
                                        : 'bg-white border-black hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-1">
                                    <Sun size={10} strokeWidth={2} className={selectedSlot === 'afternoon' ? (isDarkMode ? 'text-white' : 'text-white') : (isDarkMode ? 'text-gray-900' : 'text-gray-900')} />
                                    <span className={`text-[9px] font-semibold ${selectedSlot === 'afternoon' ? (isDarkMode ? 'text-white' : 'text-white') : (isDarkMode ? 'text-gray-900' : 'text-gray-900')}`}>
                                      Chiều
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className={`text-xs font-bold ${selectedSlot === 'afternoon' ? (isDarkMode ? 'text-white' : 'text-white') : (isDarkMode ? 'text-gray-900' : 'text-gray-900')}`}>
                                      {slotCounts.afternoon}
                                    </span>
                                    {maxParticipants > 0 && (
                                      <span className={`text-[8px] ${selectedSlot === 'afternoon' ? (isDarkMode ? 'text-white/70' : 'text-white/70') : (isDarkMode ? 'text-gray-500' : 'text-gray-500')}`}>
                                        /{maxParticipants}
                                      </span>
                                    )}
                                  </div>
                                </button>
                                
                                {/* Evening Slot */}
                                <button
                                  onClick={() => setSelectedSlot(selectedSlot === 'evening' ? null : 'evening')}
                                  className={`flex-1 flex items-center justify-between px-2 py-1.5 rounded-[6px] border-[1.5px] transition-all ${
                                    selectedSlot === 'evening'
                                      ? isDarkMode 
                                          ? 'bg-[#3A57E8] border-[#3A57E8] text-white' 
                                          : 'bg-[#3A57E8] border-[#3A57E8] text-white'
                                      : isDarkMode 
                                        ? 'bg-white border-black hover:bg-gray-50' 
                                        : 'bg-white border-black hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-1">
                                    <Moon size={10} strokeWidth={2} className={selectedSlot === 'evening' ? (isDarkMode ? 'text-white' : 'text-white') : (isDarkMode ? 'text-gray-900' : 'text-gray-900')} />
                                    <span className={`text-[9px] font-semibold ${selectedSlot === 'evening' ? (isDarkMode ? 'text-white' : 'text-white') : (isDarkMode ? 'text-gray-900' : 'text-gray-900')}`}>
                                      Tối
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className={`text-xs font-bold ${selectedSlot === 'evening' ? (isDarkMode ? 'text-white' : 'text-white') : (isDarkMode ? 'text-gray-900' : 'text-gray-900')}`}>
                                      {slotCounts.evening}
                                    </span>
                                    {maxParticipants > 0 && (
                                      <span className={`text-[8px] ${selectedSlot === 'evening' ? (isDarkMode ? 'text-white/70' : 'text-white/70') : (isDarkMode ? 'text-gray-500' : 'text-gray-500')}`}>
                                        /{maxParticipants}
                                      </span>
                                    )}
                                  </div>
                                </button>
                                </div>
                              </div>
                            );
                          })() : (
                            <div className="flex items-center justify-center h-full">
                              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Chọn ngày để xem buổi
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Không có ngày nào trong tuần này
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Scientific Filter Panel */}
                <div className={`rounded-[12px] p-3 border-[1.5px] ${isDarkMode ? 'bg-white border-black' : 'bg-white border-black'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Search Bar */}
                    <div className="flex-1">
                      <div className="relative">
                        <Search size={14} strokeWidth={2} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`} />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Tìm theo tên hoặc email…"
                          className={`w-full pl-8 pr-2 py-1.5 rounded-[10px] border-[1.5px] text-xs transition-colors ${
                            isDarkMode 
                              ? 'bg-white border-black text-gray-900 placeholder-gray-500 focus:border-[#3A57E8]' 
                              : 'bg-white border-black text-gray-900 placeholder-gray-500 focus:border-[#3A57E8]'
                          } focus:outline-none`}
                        />
                      </div>
                    </div>
                    
                    {/* Day/Slot Filter */}
                    {activity && activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0 && (
                      <div className="flex items-center gap-3">
                        <select
                          value={selectedDay?.toString() || ''}
                          onChange={(e) => {
                            const day = e.target.value ? Number(e.target.value) : null;
                            setSelectedDay(day);
                            setSelectedSlot(null);
                          }}
                          className={`flex-1 px-2 py-1.5 rounded-[10px] border-[1.5px] text-xs transition-colors ${
                            isDarkMode 
                              ? 'bg-white border-black text-gray-900 focus:border-[#3A57E8]' 
                              : 'bg-white border-black text-gray-900 focus:border-[#3A57E8]'
                          } focus:outline-none`}
                        >
                          <option value="">Tất cả ngày</option>
                          {activity.schedule.map((s: any) => (
                            <option key={s.day} value={s.day}>Ngày {s.day}</option>
                          ))}
                        </select>
                        {selectedDay !== null && (
                          <select
                            value={selectedSlot || ''}
                            onChange={(e) => setSelectedSlot(e.target.value as 'morning' | 'afternoon' | 'evening' | null || null)}
                            className={`px-2 py-1.5 rounded-[10px] border-[1.5px] text-xs transition-colors ${
                              isDarkMode 
                                ? 'bg-white border-black text-gray-900 focus:border-[#3A57E8]' 
                                : 'bg-white border-black text-gray-900 focus:border-[#3A57E8]'
                            } focus:outline-none`}
                          >
                            <option value="">Tất cả buổi</option>
                            <option value="morning">Sáng</option>
                            <option value="afternoon">Chiều</option>
                            <option value="evening">Tối</option>
                          </select>
                        )}
                      </div>
                    )}
                    
                    {/* Role Filter - Segmented Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedRole('all')}
                        className={`flex-1 px-2 py-1.5 rounded-[10px] text-xs font-semibold transition-colors border-[1.5px] ${
                          selectedRole === 'all'
                            ? isDarkMode
                              ? 'bg-[#3A57E8] text-white border-[#3A57E8]'
                              : 'bg-[#3A57E8] text-white border-[#3A57E8]'
                            : isDarkMode
                              ? 'bg-white text-gray-900 border-black hover:bg-gray-50'
                              : 'bg-white text-gray-900 border-black hover:bg-gray-50'
                        }`}
                      >
                        Tất cả
                      </button>
                      {uniqueRoles.slice(0, 3).map(role => (
                        <button
                          key={role}
                          onClick={() => setSelectedRole(role)}
                          className={`flex-1 px-2 py-1.5 rounded-[10px] text-xs font-semibold transition-colors border-[1.5px] ${
                            selectedRole === role
                              ? isDarkMode
                                ? 'bg-[#3A57E8] text-white border-[#3A57E8]'
                                : 'bg-[#3A57E8] text-white border-[#3A57E8]'
                              : isDarkMode
                                ? 'bg-white text-gray-900 border-black hover:bg-gray-50'
                                : 'bg-white text-gray-900 border-black hover:bg-gray-50'
                          }`}
                        >
                          {role === 'Người Tham Gia' ? 'Thành viên' : role === 'Thành Viên Ban Tổ Chức' ? 'Cán bộ' : role}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Modern Underline Tabs */}
                {activity && (
                  <div className={`mb-3 ${isDarkMode ? 'bg-[#0C0C0E]' : 'bg-[#F7F7F8]'}`}>
                    <div className="flex items-center justify-end gap-4 border-b-[1.5px] border-[#E2E2E2]">
                      <button
                        onClick={() => setActiveTab('main')}
                        className={`px-3 py-2 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
                          activeTab === 'main'
                            ? isDarkMode 
                              ? 'text-white' 
                              : 'text-gray-900'
                            : isDarkMode
                              ? 'text-gray-400 hover:text-white hover:opacity-70'
                              : 'text-gray-600 hover:text-gray-900 hover:opacity-70'
                        }`}
                      >
                        <span>Đang tham gia</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          activeTab === 'main'
                            ? isDarkMode 
                              ? 'bg-white/20 text-white' 
                              : 'bg-gray-900/10 text-gray-900'
                            : isDarkMode
                              ? 'bg-gray-700/50 text-gray-400'
                              : 'bg-gray-200 text-gray-600'
                        }`}>
                          {filteredParticipants.length}
                        </span>
                        {activeTab === 'main' && (
                          <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3A57E8]" />
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab('rejected')}
                        className={`px-3 py-2 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
                          activeTab === 'rejected'
                            ? isDarkMode 
                              ? 'text-white' 
                              : 'text-gray-900'
                            : isDarkMode
                              ? 'text-gray-400 hover:text-white hover:opacity-70'
                              : 'text-gray-600 hover:text-gray-900 hover:opacity-70'
                        }`}
                      >
                        <span>Bị từ chối</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          activeTab === 'rejected'
                            ? isDarkMode 
                              ? 'bg-white/20 text-white' 
                              : 'bg-gray-900/10 text-gray-900'
                            : isDarkMode
                              ? 'bg-gray-700/50 text-gray-400'
                              : 'bg-gray-200 text-gray-600'
                        }`}>
                          {rejectedParticipants.length}
                        </span>
                        {activeTab === 'rejected' && (
                          <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3A57E8]" />
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab('removed')}
                        className={`px-3 py-2 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
                          activeTab === 'removed'
                            ? isDarkMode 
                              ? 'text-white' 
                              : 'text-gray-900'
                            : isDarkMode
                              ? 'text-gray-400 hover:text-white hover:opacity-70'
                              : 'text-gray-600 hover:text-gray-900 hover:opacity-70'
                        }`}
                      >
                        <span>Đã xóa</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          activeTab === 'removed'
                            ? isDarkMode 
                              ? 'bg-white/20 text-white' 
                              : 'bg-gray-900/10 text-gray-900'
                            : isDarkMode
                              ? 'bg-gray-700/50 text-gray-400'
                              : 'bg-gray-200 text-gray-600'
                        }`}>
                          {removedParticipants.length}
                        </span>
                        {activeTab === 'removed' && (
                          <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3A57E8]" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {successMessage && activity && (
                  <div className={`mb-3 p-2 rounded-lg border ${isDarkMode ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-green-50 border-green-200 text-green-700'}`}>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} strokeWidth={2} />
                      <p className="text-xs font-medium flex-1">{successMessage}</p>
                      <button
                        onClick={() => setSuccessMessage(null)}
                        className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                          isDarkMode ? 'hover:bg-green-500/20' : 'hover:bg-green-100'
                        }`}
                      >
                        <X size={10} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && activity && (
                  <div className={`mb-3 p-2 rounded-lg border ${isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={12} strokeWidth={2} />
                      <p className="text-xs font-medium flex-1">{error}</p>
                      <button
                        onClick={() => setError(null)}
                        className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                          isDarkMode ? 'hover:bg-red-500/20' : 'hover:bg-red-100'
                        }`}
                      >
                        <X size={10} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Participants List - Main Tab */}
                {activeTab === 'main' && filteredParticipants.length > 0 ? (
                  <>
                    {/* Pagination - Top */}
                    <div className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                      <PaginationBar
                        totalItems={filteredParticipants.length}
                        currentPage={currentPage}
                        itemsPerPage={itemsPerPage}
                        onPageChange={(page) => {
                          setCurrentPage(page);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        onItemsPerPageChange={(newItemsPerPage) => {
                          setItemsPerPage(newItemsPerPage);
                          setCurrentPage(1);
                        }}
                        itemLabel="người tham gia"
                        isDarkMode={isDarkMode}
                        itemsPerPageOptions={[6, 12, 24, 48]}
                      />
                    </div>
                    
                  <div className="space-y-3">
                    {Object.entries(
                        paginatedParticipants.reduce((acc, p) => {
                        const role = p.role || 'Người Tham Gia';
                        if (!acc[role]) {
                          acc[role] = [];
                        }
                        acc[role].push(p);
                        return acc;
                      }, {} as { [key: string]: Participant[] })
                    ).map(([role, roleParticipants]) => {
                      const config = roleConfig[role] || roleConfig['Người Tham Gia'];
                      
                      return (
                        <div key={role} className={`rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                          {/* Clean Section Header */}
                          <div className={`px-3 py-2 border-b-[1.5px] ${isDarkMode ? 'bg-white border-black' : 'bg-white border-black'}`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-[8px] flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-900'}`}>
                                {(() => {
                                  const IconComponent = config.icon;
                                  return <IconComponent size={12} strokeWidth={2.5} className="text-white" />;
                                })()}
                              </div>
                              <div className="flex-1">
                                <h2 className={`text-xs font-bold ${isDarkMode ? 'text-gray-900' : 'text-gray-900'}`}>
                                  {role}
                                </h2>
                                <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-gray-600' : 'text-gray-600'}`}>
                                  {roleParticipants.length} {roleParticipants.length === 1 ? 'người' : 'người'}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Scientific Participants Grid */}
                          <div className="p-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {roleParticipants.map((participant, idx) => {
                            const participantId = typeof participant.userId === 'object' && participant.userId !== null
                              ? (participant.userId._id || String(participant.userId))
                              : String(participant.userId);
                            
                            const participantName = participant.name || 'Chưa có tên';
                            const participantEmail = participant.email || '';

                            return (
                              <div
                                key={`${participantId}-${idx}`}
                                className={`rounded-[12px] border-[1.5px] transition-all ${
                                  isDarkMode 
                                    ? 'bg-white border-black hover:shadow-md' 
                                    : 'bg-white border-black hover:shadow-md'
                                }`}
                              >
                                <div className="p-3">
                                  {/* Avatar and Info */}
                                  <div className="flex items-start gap-2.5 mb-2.5">
                                    {participant.avatarUrl ? (
                                      <img
                                        src={participant.avatarUrl}
                                        alt={participantName}
                                        className="w-8 h-8 rounded-[8px] object-cover border-[1.5px] border-black flex-shrink-0"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const placeholder = target.nextElementSibling as HTMLElement;
                                          if (placeholder) {
                                            placeholder.style.display = 'flex';
                                          }
                                        }}
                                      />
                                    ) : null}
                                    <div
                                      className={`w-8 h-8 rounded-[8px] flex items-center justify-center text-[10px] font-bold border-[1.5px] border-black flex-shrink-0 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-900 text-white'}`}
                                      style={{ display: participant.avatarUrl ? 'none' : 'flex' }}
                                    >
                                      {getInitials(participantName)}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <h3 className={`font-bold text-sm mb-0.5 ${isDarkMode ? 'text-gray-900' : 'text-gray-900'}`}>
                                        {participantName}
                                      </h3>
                                      <p className={`text-[11px] mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                        {participantEmail}
                                      </p>
                                      
                                      {/* Role Tag */}
                                      <div className="mb-2">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[6px] text-[10px] font-semibold border-[1.5px] ${
                                          isDarkMode 
                                            ? 'border-black text-gray-900 bg-white' 
                                            : 'border-black text-gray-900 bg-white'
                                        }`}>
                                          {participant.role || 'Người Tham Gia'}
                                        </span>
                                      </div>
                                      
                                      {/* Status Badges */}
                                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                        {/* Approval Status Badge */}
                                        {participant.role === 'Người Tham Gia' && participant.approvalStatus === 'pending' && (
                                          <>
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                                            isDarkMode ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-50 text-yellow-700'
                                          }`}>
                                              <Loader size={10} strokeWidth={2} className="animate-spin" />
                                            Chờ duyệt
                                          </span>
                                            {/* Registration Percentage for multiple_days activities */}
                                            {activity && activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0 && (() => {
                                              const totalAvailableSlots = activity.schedule.length * 3;
                                              const registeredSlotsCount = participant.registeredDaySlots?.length || 0;
                                              const registrationPercentage = totalAvailableSlots > 0 
                                                ? Math.round((registeredSlotsCount / totalAvailableSlots) * 100) 
                                                : 0;
                                              return (
                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                                                  registrationPercentage >= 80
                                                    ? isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-50 text-green-700'
                                                    : registrationPercentage >= 50
                                                    ? isDarkMode ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-50 text-yellow-700'
                                                    : registrationPercentage > 0
                                                    ? isDarkMode ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-50 text-orange-700'
                                                    : isDarkMode ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-50 text-gray-600'
                                                }`}>
                                                  <BarChart3 size={10} strokeWidth={2} />
                                                  Đăng ký: {registrationPercentage}%
                                                </span>
                                              );
                                            })()}
                                          </>
                                        )}
                                        {/* Registration Percentage for approved participants - multiple_days activities */}
                                        {participant.approvalStatus === 'approved' && activity && activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0 && (() => {
                                          const totalAvailableSlots = activity.schedule.length * 3;
                                          const registeredSlotsCount = participant.registeredDaySlots?.length || 0;
                                          const registrationPercentage = totalAvailableSlots > 0 
                                            ? Math.round((registeredSlotsCount / totalAvailableSlots) * 100) 
                                            : 0;
                                          return (
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                                              registrationPercentage >= 80
                                                ? isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-50 text-green-700'
                                                : registrationPercentage >= 50
                                                ? isDarkMode ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-50 text-yellow-700'
                                                : registrationPercentage > 0
                                                ? isDarkMode ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-50 text-orange-700'
                                                : isDarkMode ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-50 text-gray-600'
                                            }`}>
                                              <BarChart3 size={10} strokeWidth={2} />
                                              Đăng ký: {registrationPercentage}%
                                            </span>
                                          );
                                        })()}
                                        
                                        {/* Attendance Status Badge */}
                                        {participant.approvalStatus === 'approved' && (() => {
                                          const attendancePercent = calculateAttendancePercentage(participant, selectedDay);
                                          return (
                                            <>
                                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                                                attendancePercent >= 80
                                                  ? isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-50 text-green-700'
                                                  : attendancePercent >= 50
                                                  ? isDarkMode ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-50 text-yellow-700'
                                                  : attendancePercent > 0
                                                  ? isDarkMode ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-50 text-orange-700'
                                                  : isDarkMode ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-50 text-gray-600'
                                              }`}>
                                                <CheckSquare size={10} strokeWidth={2} />
                                                Điểm danh: {attendancePercent}%
                                              </span>
                                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                                            participant.checkedIn
                                              ? isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-50 text-green-700'
                                              : isDarkMode ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-50 text-gray-600'
                                          }`}>
                                            {participant.checkedIn ? (
                                                  <CheckCircle2 size={10} strokeWidth={2} />
                                            ) : (
                                                  <XCircle size={10} strokeWidth={2} />
                                            )}
                                                {participant.checkedIn ? 'Đã điểm danh' : 'Chưa điểm danh'}
                                          </span>
                                            </>
                                          );
                                        })()}
                                      </div>
                                      
                                      {/* Date */}
                                      <div className="flex items-center gap-1 text-[10px]">
                                        <Calendar size={10} strokeWidth={2} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                                          {(() => {
                                            try {
                                              const date = participant.joinedAt ? new Date(participant.joinedAt) : new Date();
                                              if (isNaN(date.getTime())) return 'Chưa có ngày';
                                              return date.toLocaleDateString('vi-VN');
                                            } catch {
                                              return 'Chưa có ngày';
                                            }
                                          })()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Modern Minimal Action Buttons */}
                                  <div className="flex flex-col gap-1.5 mt-2.5">
                                    {/* View Registered Slots Button */}
                                    {activity && activity.type === 'multiple_days' && participant.role === 'Người Tham Gia' && (
                                      <button
                                        onClick={() => {
                                          const fullParticipant = participants.find((p: Participant) => {
                                            const pId = typeof p.userId === 'object' && p.userId !== null
                                              ? (p.userId._id || String(p.userId))
                                              : String(p.userId);
                                            return pId === participantId;
                                          });
                                          const participantToView = fullParticipant || participant;
                                          setSelectedParticipantForSlots(participantToView);
                                          if (participantToView.registeredDaySlots && Array.isArray(participantToView.registeredDaySlots) && participantToView.registeredDaySlots.length > 0) {
                                            setSelectedDaySlotsForRegistration([...participantToView.registeredDaySlots]);
                                          } else {
                                            setSelectedDaySlotsForRegistration([]);
                                          }
                                          setShowRegisteredSlotsModal(true);
                                        }}
                                        className={`w-full px-2.5 py-1.5 rounded-[8px] text-xs font-semibold transition-colors border-[1.5px] flex items-center justify-center gap-1.5 ${
                                          isDarkMode 
                                            ? 'border-black text-gray-900 bg-white hover:bg-gray-50' 
                                            : 'border-black text-gray-900 bg-white hover:bg-gray-50'
                                        }`}
                                        title="Xem danh sách các buổi đã đăng ký"
                                      >
                                        <Calendar size={12} strokeWidth={2} />
                                        Xem buổi đã chọn
                                      </button>
                                    )}
                                    
                                    {/* Approve/Reject Buttons for Pending Participants */}
                                    {participant.role === 'Người Tham Gia' && participant.approvalStatus === 'pending' && (
                                      <>
                                        <button
                                          onClick={() => handleApproveReject(participant, 'approve')}
                                          disabled={!!processing && processing.includes(`${participantId}-`)}
                                          className={`w-full px-4 py-2.5 rounded-[8px] text-sm font-semibold transition-colors border-[1.5px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                                            isDarkMode 
                                              ? 'border-[#3CCB7F] text-[#1B8F52] bg-transparent hover:bg-[#3CCB7F]/10' 
                                              : 'border-[#3CCB7F] text-[#1B8F52] bg-transparent hover:bg-[#3CCB7F]/10'
                                          }`}
                                          title="Duyệt người tham gia"
                                        >
                                          {processing && processing.includes(`${participantId}-approve`) ? (
                                            <>
                                              <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                                              Đang xử lý...
                                            </>
                                          ) : (
                                            <>
                                              <CheckCircle2 size={16} strokeWidth={2} />
                                              Duyệt
                                            </>
                                          )}
                                        </button>
                                        <button
                                          onClick={() => handleApproveReject(participant, 'reject')}
                                          disabled={!!processing && processing.includes(`${participantId}-`)}
                                          className={`w-full px-4 py-2.5 rounded-[8px] text-sm font-semibold transition-colors border-[1.5px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                                            isDarkMode 
                                              ? 'border-[#F4443E] text-[#B3261E] bg-transparent hover:bg-[#F4443E]/10' 
                                              : 'border-[#F4443E] text-[#B3261E] bg-transparent hover:bg-[#F4443E]/10'
                                          }`}
                                          title="Từ chối người tham gia"
                                        >
                                          {processing && processing.includes(`${participantId}-reject`) ? (
                                            <>
                                              <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                                              Đang xử lý...
                                            </>
                                          ) : (
                                            <>
                                              <XCircle size={16} strokeWidth={2} />
                                              Từ chối
                                            </>
                                          )}
                                        </button>
                                      </>
                                    )}
                                    {/* Hiển thị badge trạng thái cho "Người Tham Gia" đã được duyệt/từ chối */}
                                    {participant.role === 'Người Tham Gia' && participant.approvalStatus && participant.approvalStatus !== 'pending' && (
                                      <div className="space-y-1.5">
                                      <div className={`w-full px-2.5 py-1.5 rounded text-xs text-center font-medium ${
                                        participant.approvalStatus === 'approved'
                                          ? isDarkMode ? 'bg-green-600 text-white' : 'bg-green-600 text-white'
                                          : isDarkMode ? 'bg-red-600 text-white' : 'bg-red-600 text-white'
                                      }`}>
                                        {participant.approvalStatus === 'approved' ? (
                                          <>
                                            <CheckCircle2 size={11} strokeWidth={2} className="inline mr-1" />
                                            Đã được duyệt
                                          </>
                                        ) : (
                                            <button
                                              onClick={() => {
                                                const participantId = typeof participant.userId === 'object' && participant.userId !== null
                                                  ? participant.userId._id || String(participant.userId)
                                                  : String(participant.userId);
                                                const key = participantId;
                                                const newExpanded = new Set(expandedRejected);
                                                if (newExpanded.has(key)) {
                                                  newExpanded.delete(key);
                                                } else {
                                                  newExpanded.add(key);
                                                }
                                                setExpandedRejected(newExpanded);
                                              }}
                                              className="flex items-center justify-center gap-1 hover:opacity-80 transition-opacity w-full"
                                            >
                                              <XCircle size={11} strokeWidth={2} />
                                            Đã bị từ chối
                                              <span className="ml-1 text-[10px]">
                                                {expandedRejected.has(typeof participant.userId === 'object' && participant.userId !== null
                                                  ? participant.userId._id || String(participant.userId)
                                                  : String(participant.userId)) ? '▼' : '▶'}
                                              </span>
                                            </button>
                                          )}
                                        </div>
                                        
                                        {/* Chi tiết từ chối */}
                                        {participant.approvalStatus === 'rejected' && expandedRejected.has(typeof participant.userId === 'object' && participant.userId !== null
                                          ? participant.userId._id || String(participant.userId)
                                          : String(participant.userId)) && (
                                          <div className={`p-2.5 rounded-lg border text-xs ${
                                            isDarkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200'
                                          }`}>
                                            {participant.rejectionReason ? (
                                              <>
                                                <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-red-200' : 'text-red-600'}`}>
                                                  Lý do từ chối:
                                                </p>
                                                <p className={`text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                  {participant.rejectionReason}
                                                </p>
                                              </>
                                            ) : (
                                              <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                Đơn đăng ký tham gia đã bị từ chối.
                                              </p>
                                            )}
                                            {participant.rejectedBy && (
                                              <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Từ chối bởi: {typeof participant.rejectedBy === 'object' ? participant.rejectedBy.name : participant.rejectedBy}
                                                {participant.rejectedAt && ` • ${new Date(participant.rejectedAt).toLocaleString('vi-VN')}`}
                                              </p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {/* Delete Button */}
                                    {(participant.role === 'Người Tham Gia' || 
                                      participant.role === 'Thành Viên Ban Tổ Chức' || 
                                      participant.role === 'Người Giám Sát') && (
                                      <button
                                        onClick={() => confirmRemove(participant)}
                                        disabled={!!processing && processing.includes(participantId)}
                                        className={`w-full px-4 py-2.5 rounded-[8px] text-sm font-semibold transition-colors border-[1.5px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                                          isDarkMode 
                                            ? 'border-black text-gray-900 bg-white hover:bg-gray-100' 
                                            : 'border-black text-gray-900 bg-white hover:bg-gray-100'
                                        }`}
                                        title="Xóa người tham gia"
                                      >
                                        <Trash2 size={16} strokeWidth={2} />
                                        Xóa
                                      </button>
                                    )}
                                  </div>
                                  
                                  {/* Date */}
                                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t-[1.5px] border-[#E2E2E2]">
                                    <Calendar size={12} strokeWidth={2} className={isDarkMode ? 'text-gray-500' : 'text-gray-500'} />
                                    <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                      {(() => {
                                        try {
                                          const date = participant.joinedAt ? new Date(participant.joinedAt) : new Date();
                                          if (isNaN(date.getTime())) return 'Chưa có ngày';
                                          return date.toLocaleDateString('vi-VN');
                                        } catch {
                                          return 'Chưa có ngày';
                                        }
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
                    
                    {/* Pagination - Bottom */}
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <PaginationBar
                        totalItems={filteredParticipants.length}
                        currentPage={currentPage}
                        itemsPerPage={itemsPerPage}
                        onPageChange={(page) => {
                          setCurrentPage(page);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        onItemsPerPageChange={(newItemsPerPage) => {
                          setItemsPerPage(newItemsPerPage);
                          setCurrentPage(1);
                        }}
                        itemLabel="người tham gia"
                        isDarkMode={isDarkMode}
                        itemsPerPageOptions={[6, 12, 24, 48]}
                      />
                    </div>
                  </>
                ) : activeTab === 'main' ? (
                  <div className={`text-center py-12 rounded-lg border border-dashed ${isDarkMode ? 'bg-gray-800/30 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                    <div className={`w-14 h-14 mx-auto rounded-lg flex items-center justify-center mb-3 ${
                      isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                    }`}>
                      {participants.length === 0 ? (
                        <Users size={28} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={1.5} />
                      ) : (
                        <Search size={28} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={1.5} />
                      )}
                    </div>
                    <h3 className="text-base font-bold mb-1.5">
                      {participants.length === 0 ? 'Chưa có người tham gia' : 'Không tìm thấy kết quả'}
                    </h3>
                    <p className="text-xs">
                      {participants.length === 0 
                        ? 'Chưa có ai đăng ký tham gia hoạt động này'
                        : 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc'}
                    </p>
                  </div>
                ) : null}

                {/* Removed Participants Section - Removed Tab */}
                {activeTab === 'removed' && activity && (
                  <div className={`rounded-lg border mt-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    {/* Section Header */}
                    <div className={`px-5 py-3.5 border-b ${isDarkMode ? 'bg-gray-900/20 border-gray-600/30' : 'bg-gray-50 border-gray-300'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-gray-500/20' : 'bg-gray-100'}`}>
                          <Trash2 size={18} strokeWidth={2.5} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                        </div>
                        <div className="flex-1">
                          <h2 className={`text-base font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Danh sách người đã xóa
                          </h2>
                          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {removedParticipants.length} {removedParticipants.length === 1 ? 'người' : 'người'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Removed Participants Grid */}
                    <div className="p-4">
                      {removedParticipants.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {removedParticipants.map((participant, idx) => {
                            const participantId = typeof participant.userId === 'object' && participant.userId !== null
                              ? (participant.userId._id || String(participant.userId))
                              : String(participant.userId);
                            
                            const participantName = participant.name || 
                              (typeof participant.userId === 'object' && participant.userId !== null && 'name' in participant.userId 
                                ? String(participant.userId.name) 
                                : 'Không có tên');
                            const participantEmail = participant.email || 
                              (typeof participant.userId === 'object' && participant.userId !== null && 'email' in participant.userId 
                                ? String(participant.userId.email) 
                                : 'Không có email');
                            const participantAvatar = participant.avatarUrl || 
                              (typeof participant.userId === 'object' && participant.userId !== null && 'avatarUrl' in participant.userId 
                                ? String(participant.userId.avatarUrl) 
                                : null);
                            
                            return (
                              <div
                                key={participantId}
                                className={`p-4 rounded-lg border transition-all opacity-75 ${
                                  isDarkMode ? 'bg-gray-800/30 border-gray-700 hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-start gap-3 mb-3">
                                  {/* Avatar */}
                                  {participantAvatar ? (
                                    <img
                                      src={participantAvatar}
                                      alt={participantName}
                                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-300 opacity-60"
                                    />
                                  ) : (
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${
                                      isDarkMode ? 'bg-gray-700/30 border-gray-600/50 text-gray-400' : 'bg-gray-200 border-gray-300 text-gray-500'
                                    }`}>
                                      {participantName.charAt(0).toUpperCase()}
                  </div>
                )}
                                  
                                  {/* Name and Email */}
                                  <div className="flex-1 min-w-0">
                                    <h3 className={`text-sm font-bold mb-1 truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                      {participantName}
                                    </h3>
                                    <p className={`text-xs truncate ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                      {participantEmail}
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Removal Info */}
                                <div className={`p-3 rounded-lg border ${
                                  isDarkMode ? 'bg-gray-800/30 border-gray-700/50' : 'bg-gray-100 border-gray-200'
                                }`}>
                                  <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Đã bị xóa khỏi hoạt động
                                  </p>
                                  {participant.removalReason && (
                                    <div className={`mb-2 p-2 rounded border ${
                                      isDarkMode 
                                        ? 'bg-orange-900/20 border-orange-500/30' 
                                        : 'bg-orange-50 border-orange-200'
                                    }`}>
                                      <p className={`text-xs font-medium mb-0.5 ${isDarkMode ? 'text-orange-200' : 'text-orange-700'}`}>
                                        Lý do:
                                      </p>
                                      <p className={`text-xs ${isDarkMode ? 'text-orange-100' : 'text-orange-600'}`}>
                                        {participant.removalReason}
                                      </p>
                                    </div>
                                  )}
                                  {participant.removedBy && (
                                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                      Xóa bởi: {typeof participant.removedBy === 'object' ? participant.removedBy.name : participant.removedBy}
                                      {participant.removedAt && ` • ${new Date(participant.removedAt).toLocaleString('vi-VN')}`}
                                    </p>
                                  )}
                                  {participant.removedAt && !participant.removedBy && (
                                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                      {new Date(participant.removedAt).toLocaleString('vi-VN')}
                                    </p>
                                  )}
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex gap-2 mt-3">
                                  {/* Restore Button */}
                                  <button
                                    onClick={() => handleRestore(participant)}
                                    disabled={!!processing && processing.includes(`${participantId}-restore`)}
                                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                                      isDarkMode 
                                        ? 'bg-green-600 text-white hover:bg-green-700' 
                                        : 'bg-green-600 text-white hover:bg-green-700'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    title="Khôi phục người này về trạng thái chờ duyệt"
                                  >
                                    {processing && processing.includes(`${participantId}-restore`) ? (
                                      <>
                                        <Loader size={12} strokeWidth={2.5} className="animate-spin" />
                                        <span>Đang xử lý...</span>
                                      </>
                                    ) : (
                                      <>
                                        <RotateCcw size={12} strokeWidth={2.5} />
                                        <span>Khôi phục</span>
                                      </>
                                    )}
                                  </button>
                                  
                                  {/* Permanent Delete Button */}
                                <button
                                  onClick={() => handlePermanentDelete(participant)}
                                  disabled={!!processing && processing.includes(`${participantId}-permanent`)}
                                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                                    isDarkMode 
                                      ? 'bg-red-600 text-white hover:bg-red-700' 
                                      : 'bg-red-600 text-white hover:bg-red-700'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  title="Xóa vĩnh viễn người này khỏi hoạt động"
                                >
                                  {processing && processing.includes(`${participantId}-permanent`) ? (
                                    <>
                                      <Loader size={12} strokeWidth={2.5} className="animate-spin" />
                                      <span>Đang xử lý...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 size={12} strokeWidth={2.5} />
                                      <span>Xóa vĩnh viễn</span>
                                    </>
                                  )}
                                </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={`text-center py-8 rounded-lg border border-dashed ${isDarkMode ? 'bg-gray-800/30 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                          <Trash2 size={32} className={`mx-auto mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} strokeWidth={1.5} />
                          <p className="text-sm font-medium">Chưa có người nào bị xóa</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Rejected Participants Section - Rejected Tab */}
                {activeTab === 'rejected' && activity && (
                  <div className={`rounded-lg border mt-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    {/* Section Header */}
                    <div className={`px-5 py-3.5 border-b ${isDarkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-red-500/20' : 'bg-red-100'}`}>
                          <XCircle size={18} strokeWidth={2.5} className={isDarkMode ? 'text-red-300' : 'text-red-600'} />
                        </div>
                        <div className="flex-1">
                          <h2 className={`text-base font-bold ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                            Danh sách người đã từ chối
                          </h2>
                          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-red-200' : 'text-red-600'}`}>
                            {rejectedParticipants.length} {rejectedParticipants.length === 1 ? 'người' : 'người'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Rejected Participants Grid */}
                    <div className="p-4">
                      {rejectedParticipants.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {rejectedParticipants.map((participant, idx) => {
                          const participantId = typeof participant.userId === 'object' && participant.userId !== null
                            ? (participant.userId._id || String(participant.userId))
                            : String(participant.userId);
                          
                          const participantName = participant.name || 
                            (typeof participant.userId === 'object' && participant.userId !== null && 'name' in participant.userId 
                              ? String(participant.userId.name) 
                              : 'Không có tên');
                          const participantEmail = participant.email || 
                            (typeof participant.userId === 'object' && participant.userId !== null && 'email' in participant.userId 
                              ? String(participant.userId.email) 
                              : 'Không có email');
                          const participantAvatar = participant.avatarUrl || 
                            (typeof participant.userId === 'object' && participant.userId !== null && 'avatarUrl' in participant.userId 
                              ? String(participant.userId.avatarUrl) 
                              : null);
                          
                          return (
                            <div
                              key={participantId}
                              className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                                isDarkMode ? 'bg-gray-800/50 border-gray-700 hover:border-red-500/50' : 'bg-gray-50 border-gray-200 hover:border-red-300'
                              }`}
                            >
                              <div className="flex items-start gap-3 mb-3">
                                {/* Avatar */}
                                {participantAvatar ? (
                                  <img
                                    src={participantAvatar}
                                    alt={participantName}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-red-300"
                                  />
                                ) : (
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${
                                    isDarkMode ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'bg-red-100 border-red-300 text-red-700'
                                  }`}>
                                    {participantName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                
                                {/* Name and Email */}
                                <div className="flex-1 min-w-0">
                                  <h3 className={`text-sm font-bold mb-1 truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                    {participantName}
                                  </h3>
                                  <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {participantEmail}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Rejection Details */}
                              <div className={`p-3 rounded-lg border ${
                                isDarkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200'
                              }`}>
                                {participant.rejectionReason ? (
                                  <>
                                    <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-red-200' : 'text-red-600'}`}>
                                      Lý do từ chối:
                                    </p>
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                      {participant.rejectionReason}
                                    </p>
                                  </>
                                ) : (
                                  <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Đơn đăng ký tham gia đã bị từ chối.
                                  </p>
                                )}
                                {participant.rejectedBy && (
                                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Từ chối bởi: {typeof participant.rejectedBy === 'object' && participant.rejectedBy !== null
                                      ? (participant.rejectedBy.name || 'Không có tên')
                                      : (participant.rejectedBy || 'Không xác định')}
                                    {participant.rejectedAt && ` • ${new Date(participant.rejectedAt).toLocaleString('vi-VN')}`}
                                  </p>
                                )}
                              </div>
                              
                              {/* Action Button - Khôi phục */}
                              <button
                                onClick={() => {
                                  console.log('Khôi phục button clicked:', { participantId, participantName: participantName });
                                  handleApproveReject(participant, 'undo_reject');
                                }}
                                disabled={!!processing && processing.includes(`${participantId}-undo_reject`)}
                                className={`w-full mt-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                                  isDarkMode 
                                    ? 'bg-green-600 text-white hover:bg-green-700' 
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                title="Khôi phục người này về trạng thái chờ duyệt"
                              >
                                {processing && processing.includes(`${participantId}-undo_reject`) ? (
                                  <>
                                    <Loader size={12} strokeWidth={2.5} className="animate-spin" />
                                    <span>Đang xử lý...</span>
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw size={12} strokeWidth={2.5} />
                                    <span>Khôi phục</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                        </div>
                      ) : (
                        <div className={`text-center py-8 rounded-lg border border-dashed ${isDarkMode ? 'bg-gray-800/30 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                          <XCircle size={32} className={`mx-auto mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} strokeWidth={1.5} />
                          <p className="text-sm font-medium">Chưa có người nào bị từ chối</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Scientific Registration Modal */}
        {showRegisteredSlotsModal && selectedParticipantForSlots && activity && activity.type === 'multiple_days' && parsedScheduleData.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`rounded-[12px] border-[2px] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col ${
              isDarkMode ? 'bg-white border-black' : 'bg-white border-black'
            }`}>
              {/* Modal Header - Scientific Style */}
              <div className={`px-4 py-2.5 border-b-[2px] flex items-center justify-between ${
                isDarkMode ? 'border-black bg-white' : 'border-black bg-white'
              }`}>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className={isDarkMode ? 'text-gray-900' : 'text-gray-900'} strokeWidth={2.5} />
                  <h2 className={`text-sm font-bold ${isDarkMode ? 'text-gray-900' : 'text-gray-900'}`}>
                    Danh sách các buổi đã đăng ký
                  </h2>
                  <span className={`text-xs ${isDarkMode ? 'text-gray-600' : 'text-gray-600'}`}>
                    - {selectedParticipantForSlots.name || 'Người tham gia'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowRegisteredSlotsModal(false);
                    setSelectedParticipantForSlots(null);
                    setSelectedDaySlotsForRegistration([]);
                  }}
                  className={`p-1.5 rounded-[8px] transition-colors ${
                    isDarkMode ? 'hover:bg-gray-100 text-gray-900' : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>

              {/* Registration Percentage Banner - Circular Progress */}
              {(() => {
                let totalAvailableSlots = 0;
                if (activity.type === 'multiple_days' && parsedScheduleData.length > 0) {
                  parsedScheduleData.forEach((dayData: { day: number; date: string; slots: Array<{ slotKey?: string }> }) => {
                    const activeSlots = dayData.slots.filter((s: { slotKey?: string }) => s.slotKey).length;
                    totalAvailableSlots += activeSlots;
                  });
                }
                
                if (totalAvailableSlots > 0 && selectedDaySlotsForRegistration.length > 0) {
                  const totalRate = Math.round((selectedDaySlotsForRegistration.length / totalAvailableSlots) * 100);
                  const threshold = getRegistrationThreshold();
                  const isAboveThreshold = totalRate >= threshold;
                  const radius = 28; // Smaller radius
                  const circumference = 2 * Math.PI * radius;
                  const strokeDasharray = circumference;
                  const strokeDashoffset = circumference - (totalRate / 100) * circumference;
                  
                  return (
                    <div className={`px-3 py-2 border-b flex items-center justify-center gap-3 ${
                      isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                    }`}>
                      {/* Circular Progress */}
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="transform -rotate-90 w-16 h-16">
                          {/* Background circle */}
                          <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                            strokeWidth="4"
                            fill="none"
                          />
                          {/* Progress circle */}
                          <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            stroke={isAboveThreshold 
                              ? (isDarkMode ? '#3A57E8' : '#3A57E8')
                              : (isDarkMode ? '#f59e0b' : '#d97706')
                            }
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-300"
                          />
                        </svg>
                        {/* Percentage text in center */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-sm font-bold ${
                            isAboveThreshold
                              ? isDarkMode ? 'text-[#3A57E8]' : 'text-[#3A57E8]'
                              : isDarkMode ? 'text-amber-400' : 'text-amber-600'
                          }`}>
                            {totalRate}%
                          </span>
                          {isAboveThreshold && (
                            <CheckCircle2 size={10} className={
                              isDarkMode ? 'text-[#3A57E8]' : 'text-[#3A57E8]'
                            } />
                          )}
                        </div>
                      </div>
                      
                      {/* Info text */}
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-xs font-medium ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Tổng phần trăm đăng ký
                        </span>
                        <span className={`text-xs font-semibold ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {selectedDaySlotsForRegistration.length} / {totalAvailableSlots} buổi
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}


              {/* Modal Content - Scientific Style */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-2.5">
                  {parsedScheduleData.map((dayData) => {
                    const scheduleDate = new Date(dayData.date);
                    const dayDateStr = scheduleDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
                    
                    // Collect locations for all active slots
                    const slotLocations: Array<{ slotKey: string; location: string | null }> = [];
                    ['morning', 'afternoon', 'evening'].forEach((slotKey) => {
                      const slot = dayData.slots.find(s => s.slotKey === slotKey);
                      if (slot) {
                        const location = slot.mapLocation?.address || slot.detailedLocation || dayData.dayMapLocation?.address || dayData.dayDetailedLocation || null;
                        slotLocations.push({ slotKey, location });
                      }
                    });
                    
                    // Get all non-null locations
                    const allLocations = slotLocations.map(sl => sl.location).filter(Boolean) as string[];
                    const uniqueLocations = [...new Set(allLocations)];
                    
                    // Check if all active slots have the same location
                    // Only show common location if:
                    // 1. There are active slots
                    // 2. All active slots have a location (no null)
                    // 3. All locations are the same
                    const activeSlotsCount = slotLocations.length;
                    const hasAllSlotsWithLocation = slotLocations.every(sl => sl.location !== null);
                    const hasSameLocation = hasAllSlotsWithLocation && uniqueLocations.length === 1 && activeSlotsCount > 0;
                    const commonLocation = hasSameLocation ? uniqueLocations[0] : null;
                    
                    return (
                      <div
                        key={dayData.day}
                        className={`rounded-[12px] border-[1.5px] ${
                          isDarkMode ? 'bg-white border-black' : 'bg-white border-black'
                        }`}
                      >
                        {/* Day Header */}
                        <div className={`px-3 py-2 border-b-[1.5px] flex items-center justify-between ${
                          isDarkMode ? 'border-black bg-white' : 'border-black bg-white'
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} className={isDarkMode ? 'text-gray-900' : 'text-gray-900'} strokeWidth={2.5} />
                            <h3 className={`text-sm font-bold ${isDarkMode ? 'text-gray-900' : 'text-gray-900'}`}>
                              Ngày {dayData.day}
                            </h3>
                            <span className={`text-xs ${isDarkMode ? 'text-gray-600' : 'text-gray-600'}`}>
                              {dayDateStr}
                            </span>
                          </div>
                          {hasSameLocation && commonLocation && (
                            <div className={`flex items-center gap-1.5 text-xs ${isDarkMode ? 'text-gray-600' : 'text-gray-600'}`}>
                              <MapPin size={12} strokeWidth={2} />
                              <span className="line-clamp-1">{commonLocation}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Slots Grid - Scientific Style */}
                        <div className="p-2.5">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {['morning', 'afternoon', 'evening'].map((slotKey) => {
                              const slot = dayData.slots.find(s => s.slotKey === slotKey);
                              const slotName = slotKey === 'morning' ? 'Sáng' : slotKey === 'afternoon' ? 'Chiều' : 'Tối';
                              const SlotIcon = slotKey === 'morning' ? Sunrise : slotKey === 'afternoon' ? Sun : Moon;
                              const isActive = !!slot;
                              const isSelected = selectedDaySlotsForRegistration.some(ds => ds.day === dayData.day && ds.slot === slotKey);
                              const registrationRate = calculateRegistrationRate(dayData.day, slotKey as 'morning' | 'afternoon' | 'evening');
                              const canRegisterSlot = canRegister(dayData.day, slotKey as 'morning' | 'afternoon' | 'evening');
                              const threshold = getRegistrationThreshold();
                              
                              return (
                                <div
                                  key={slotKey}
                                  className={`p-2.5 rounded-[12px] border-[1.5px] text-left ${
                                    isSelected
                                      ? isDarkMode
                                        ? 'bg-[#3A57E8] border-[#3A57E8] text-white'
                                        : 'bg-[#3A57E8] border-[#3A57E8] text-white'
                                      : isActive
                                        ? isDarkMode
                                          ? 'bg-white border-black'
                                          : 'bg-white border-black'
                                        : isDarkMode
                                          ? 'bg-gray-100 border-black opacity-50'
                                          : 'bg-gray-100 border-black opacity-50'
                                  }`}
                                >
                                  <div className="flex flex-col gap-1.5">
                                    {/* Slot Name */}
                                    <div className="flex items-center justify-between">
                                      <span className={`text-sm font-bold ${
                                        isSelected
                                          ? isDarkMode ? 'text-white' : 'text-white'
                                          : isActive
                                            ? isDarkMode ? 'text-gray-900' : 'text-gray-900'
                                            : isDarkMode ? 'text-gray-500' : 'text-gray-500'
                                      }`}>
                                        {slotName}
                                      </span>
                                      {isSelected && (
                                        <CheckCircle2 size={14} className={isDarkMode ? 'text-white' : 'text-white'} strokeWidth={2.5} />
                                      )}
                                    </div>
                                    
                                    {/* Time */}
                                    {slot && (
                                      <div className="flex items-center gap-1.5">
                                        <Clock size={12} className={isSelected ? (isDarkMode ? 'text-white/80' : 'text-white/80') : (isDarkMode ? 'text-gray-600' : 'text-gray-600')} strokeWidth={2} />
                                        <span className={`text-xs ${isSelected ? (isDarkMode ? 'text-white/80' : 'text-white/80') : (isDarkMode ? 'text-gray-600' : 'text-gray-600')}`}>
                                          {slot.startTime} - {slot.endTime}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {/* Location (only show if not same for all slots) */}
                                    {!hasSameLocation && slot && (() => {
                                      const slotLocation = slot.mapLocation?.address || slot.detailedLocation || dayData.dayMapLocation?.address || dayData.dayDetailedLocation;
                                      // Only show location if it exists and is different from common location
                                      if (slotLocation && slotLocation !== commonLocation) {
                                        return (
                                          <div className={`flex items-start gap-1.5 text-xs ${
                                            isSelected ? (isDarkMode ? 'text-white/80' : 'text-white/80') : (isDarkMode ? 'text-gray-600' : 'text-gray-600')
                                          }`}>
                                            <MapPin size={12} className="mt-0.5 flex-shrink-0" strokeWidth={2} />
                                            <span className="line-clamp-1">{slotLocation}</span>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                    
                                    {/* Slot Registration Count */}
                                    {isActive && (() => {
                                      let slotRegisteredCount = 0;
                                      if (activity.type === 'multiple_days' && activity.participants) {
                                        slotRegisteredCount = activity.participants.filter((p: any) => {
                                          const approvalStatus = p.approvalStatus || 'pending';
                                          if (approvalStatus === 'rejected' || approvalStatus === 'removed') return false;
                                          if (p.registeredDaySlots && Array.isArray(p.registeredDaySlots) && p.registeredDaySlots.length > 0) {
                                            return p.registeredDaySlots.some((ds: any) => ds.day === dayData.day && ds.slot === slotKey);
                                          }
                                          return false;
                                        }).length;
                                      } else {
                                        slotRegisteredCount = activity.participants?.filter((p: any) => {
                                          const approvalStatus = p.approvalStatus || 'pending';
                                          return approvalStatus !== 'rejected' && approvalStatus !== 'removed';
                                        }).length || 0;
                                      }
                                      
                                      const isFull = slotRegisteredCount >= (activity.maxParticipants || 0);
                                      
                                      return (
                                        <div className={`text-xs mt-1.5 pt-1.5 border-t-[1.5px] ${
                                          isSelected 
                                            ? (isDarkMode ? 'border-white/20 text-white/80' : 'border-white/20 text-white/80')
                                            : (isDarkMode ? 'border-black text-gray-600' : 'border-black text-gray-600')
                                        }`}>
                                          <div className="flex items-center justify-between">
                                            {isSelected ? (
                                              <>
                                            <span>Đã đăng ký</span>
                                            <span className="font-bold">
                                              {slotRegisteredCount}/{activity.maxParticipants}
                                            </span>
                                              </>
                                            ) : (
                                              <>
                                                {isFull ? (
                                                  <span className={`font-semibold ${isDarkMode ? 'text-[#F4443E]' : 'text-[#F4443E]'}`}>
                                                    Đã đầy ({slotRegisteredCount}/{activity.maxParticipants})
                                                  </span>
                                                ) : (
                                                  <span>
                                                    {slotRegisteredCount}/{activity.maxParticipants} người
                                                  </span>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer - Scientific Style */}
              <div className={`px-3 py-2.5 border-t-[2px] flex items-center justify-between gap-2 ${
                isDarkMode ? 'border-black bg-white' : 'border-black bg-white'
              }`}>
                {/* Summary Info */}
                <div className="flex items-center gap-2 flex-1">
                  {selectedDaySlotsForRegistration.length > 0 ? (
                    <>
                      <span className={`text-sm font-bold px-2 py-1 rounded-[8px] ${
                        isDarkMode ? 'bg-gray-100 text-gray-900' : 'bg-gray-100 text-gray-900'
                      }`}>
                        {selectedDaySlotsForRegistration.length} buổi
                      </span>
                      {(() => {
                        let totalAvailableSlots = 0;
                        if (activity.type === 'multiple_days' && parsedScheduleData.length > 0) {
                          parsedScheduleData.forEach((dayData: { day: number; date: string; slots: Array<{ slotKey?: string }> }) => {
                            const activeSlots = dayData.slots.filter((s: { slotKey?: string }) => s.slotKey).length;
                            totalAvailableSlots += activeSlots;
                          });
                        }
                        
                        if (totalAvailableSlots > 0) {
                          const totalRate = Math.round((selectedDaySlotsForRegistration.length / totalAvailableSlots) * 100);
                          const threshold = getRegistrationThreshold();
                          
                          return (
                            <>
                              <span className={`text-xs ${isDarkMode ? 'text-gray-600' : 'text-gray-600'}`}>
                                / {totalAvailableSlots}
                              </span>
                              <span className={`text-sm font-bold px-2 py-1 rounded-[8px] ${
                                totalRate >= threshold
                                  ? isDarkMode 
                                    ? 'bg-[#3A57E8]/10 text-[#3A57E8]' 
                                    : 'bg-[#3A57E8]/10 text-[#3A57E8]'
                                  : isDarkMode
                                    ? 'bg-[#FFB020]/10 text-[#FFB020]'
                                    : 'bg-[#FFB020]/10 text-[#FFB020]'
                              }`}>
                                {totalRate}%
                              </span>
                            </>
                          );
                        }
                        return null;
                      })()}
                    </>
                  ) : (
                    <span className={`text-xs ${isDarkMode ? 'text-gray-600' : 'text-gray-600'}`}>
                      Chưa đăng ký buổi nào
                    </span>
                  )}
                </div>
                
                {/* Action Button */}
                <button
                  onClick={() => {
                    setShowRegisteredSlotsModal(false);
                    setSelectedParticipantForSlots(null);
                    setSelectedDaySlotsForRegistration([]);
                  }}
                  className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-colors border-[1.5px] ${
                    isDarkMode
                      ? 'bg-white text-gray-900 border-black hover:bg-gray-50'
                      : 'bg-white text-gray-900 border-black hover:bg-gray-50'
                  }`}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scientific Remove Confirmation Modal */}
        {showRemoveModal && participantToRemove && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`rounded-[12px] border-[2px] shadow-xl max-w-md w-full ${
              isDarkMode ? 'bg-white border-black' : 'bg-white border-black'
            }`}>
              <div className="p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center border-[1.5px] ${
                    isDarkMode ? 'bg-white border-black' : 'bg-white border-black'
                  }`}>
                    <Trash2 size={20} strokeWidth={2.5} className={isDarkMode ? 'text-[#F4443E]' : 'text-[#F4443E]'} />
                  </div>
                  <h3 className={`text-base font-bold ${isDarkMode ? 'text-gray-900' : 'text-gray-900'}`}>
                    Xác nhận xóa
                  </h3>
                </div>
                <p className={`text-xs mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-600'}`}>
                  Bạn có chắc chắn muốn xóa <span className="font-semibold text-[#F4443E]">
                    {participantToRemove.name || (typeof participantToRemove.userId === 'object' && participantToRemove.userId !== null && 'name' in participantToRemove.userId ? String(participantToRemove.userId.name) : 'Người này')}
                  </span> khỏi danh sách người tham gia không?
                </p>
                <div className="mb-3">
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-gray-700' : 'text-gray-700'}`}>
                    Lý do xóa <span className="text-gray-400">(tùy chọn)</span>
                  </label>
                  <textarea
                    value={removalReason}
                    onChange={(e) => setRemovalReason(e.target.value)}
                    placeholder="Nhập lý do xóa người tham gia..."
                    rows={3}
                    className={`w-full px-3 py-2 rounded-[8px] text-xs border-[1.5px] resize-none ${
                      isDarkMode 
                        ? 'bg-white text-gray-900 border-black placeholder-gray-400 focus:border-[#3A57E8] focus:ring-1 focus:ring-[#3A57E8]' 
                        : 'bg-white text-gray-900 border-black placeholder-gray-400 focus:border-[#3A57E8] focus:ring-1 focus:ring-[#3A57E8]'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowRemoveModal(false);
                      setParticipantToRemove(null);
                      setRemovalReason('');
                    }}
                    className={`flex-1 px-3 py-2 rounded-[8px] text-xs font-semibold transition-colors border-[1.5px] ${
                      isDarkMode 
                        ? 'bg-white text-gray-900 border-black hover:bg-gray-50' 
                        : 'bg-white text-gray-900 border-black hover:bg-gray-50'
                    }`}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleRemove}
                    disabled={processing !== null}
                    className={`flex-1 px-3 py-2 rounded-[8px] text-xs font-semibold transition-colors border-[1.5px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${
                      isDarkMode
                        ? 'border-[#F4443E] text-[#B3261E] bg-transparent hover:bg-[#F4443E]/10'
                        : 'border-[#F4443E] text-[#B3261E] bg-transparent hover:bg-[#F4443E]/10'
                    }`}
                  >
                    {processing ? (
                      <>
                        <Loader2 size={12} strokeWidth={2.5} className="animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <Trash2 size={12} strokeWidth={2.5} />
                        Xác nhận xóa
                      </>
                    )}
                  </button>
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

        <Footer isDarkMode={isDarkMode} />
      </div>
    </ProtectedRoute>
  );
}
