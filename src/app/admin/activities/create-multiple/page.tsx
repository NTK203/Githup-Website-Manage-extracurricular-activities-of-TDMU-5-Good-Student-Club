'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Cropper, { Area } from 'react-easy-crop';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { 
  Calendar, 
  CalendarRange,
  Image as ImageIcon,
  ImageUp,
  FileText, 
  Users, 
  MapPin, 
  User, 
  FolderOpen, 
  StickyNote,
  CheckCircle2,
  XCircle,
  Info,
  Clock,
  Sun,
  Moon,
  Loader,
  FileEdit,
  Globe,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Crown,
  UserCheck,
  Target,
  X,
  Scissors,
  ZoomIn,
  ZoomOut,
  Plus,
  Minus
} from 'lucide-react';

const OpenStreetMapPicker = dynamic(() => import('@/components/common/OpenStreetMapPicker'), {
  ssr: false,
});

const MultiTimeLocationPicker = dynamic(() => import('@/components/common/MultiTimeLocationPicker'), {
  ssr: false,
});

const DEFAULT_LOCATION_TEMPLATES = [
  'Hội trường A1',
  'Nhà thi đấu đa năng',
  'Sân vận động B',
  'Thư viện trung tâm',
  'Sảnh chính ký túc xá',
];

type ActivityStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';
type ActivityVisibility = 'public' | 'private';

interface LocationData {
  lat: number;
  lng: number;
  address: string;
  radius: number;
}

interface DaySchedule {
  date: string; // YYYY-MM-DD
  activities: string;
}

export default function CreateMultipleDaysActivityPage() {
  const router = useRouter();
  const params = useParams();
  const { isDarkMode } = useDarkMode();
  const { user } = useAuth();

  // Check if this is edit mode
  const activityId = params.id as string;
  const isEditMode = activityId && activityId !== 'new';
  
  console.log('CreateMultipleDaysActivityPage - activityId:', activityId);
  console.log('CreateMultipleDaysActivityPage - isEditMode:', isEditMode);

  const [isDesktop, setIsDesktop] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(isEditMode);
  const [submitError, setSubmitError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    maxParticipants: '',
    registrationThreshold: '80', // Phần trăm tối thiểu để đăng ký (mặc định 80%)
    visibility: 'public' as ActivityVisibility,
    responsiblePerson: [] as string[],
    status: 'draft' as ActivityStatus,
    imageUrl: '',
    overview: ''
  });

  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [globalDetailedLocation, setGlobalDetailedLocation] = useState<string>('');
  const [perDayDetailedLocation, setPerDayDetailedLocation] = useState<Record<DayKey, string>>({
    mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: ''
  });
  const [showPerDayLocationSection, setShowPerDayLocationSection] = useState<Record<DayKey, boolean>>({
    mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false
  });
  const [perSlotDetailedLocation, setPerSlotDetailedLocation] = useState<string>('');
  const [showPerSlotLocationSection, setShowPerSlotLocationSection] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageHeight, setImageHeight] = useState<number>(192); // Chiều cao mặc định 192px (h-48)
  
  // State cho crop ảnh
  const [showCropModal, setShowCropModal] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [responsiblePersons, setResponsiblePersons] = useState<Array<{
    _id: string;
    name: string;
    email: string;
    role: string;
    studentId: string;
    status: string;
    avatarUrl?: string;
    imageUrl?: string;
  }>>([]);
  const [loadingResponsiblePersons, setLoadingResponsiblePersons] = useState(false);

  // Quản lý vai trò thành viên - chỉ cho những người đã đăng ký tham gia
  type MemberRole = 'leader' | 'deputy' | 'member';
  interface ActivityMember {
    userId: string;
    name: string;
    email: string;
    studentId?: string;
    role: MemberRole;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
  }
  const [activityMembers, setActivityMembers] = useState<ActivityMember[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Weekly sessions (Mon-Sun), each day has 3 sessions like single-day
  type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  type TimeSlotKey = 'morning' | 'afternoon' | 'evening';
  const slotIdToTimeSlotKey: Record<string, TimeSlotKey> = {
    '1': 'morning',
    '2': 'afternoon',
    '3': 'evening',
  };
  const timeSlotKeyToSlotId: Record<TimeSlotKey, string> = {
    morning: '1',
    afternoon: '2',
    evening: '3',
  };

  const [selectedDayKey, setSelectedDayKey] = useState<DayKey>('mon');
  const [selectedDate, setSelectedDate] = useState<string>(''); // Date string (YYYY-MM-DD) for the selected day in current week
  interface WeeklySlot {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
    activities: string;
    detailedLocation: string;
    locationAddress?: string;
    locationLat?: number;
    locationLng?: number;
    locationRadius?: number;
  }

  interface SlotLocationItem {
    id: string;
    timeSlot: TimeSlotKey;
    location: {
      lat: number;
      lng: number;
      address: string;
    };
    radius: number;
  }

  type WeeklyPlan = Record<string, WeeklySlot[]>; // Key is date string (YYYY-MM-DD) instead of DayKey
  const defaultWeeklySlots: WeeklySlot[] = [
    { id: '1', name: 'Buổi Sáng', startTime: '07:00', endTime: '11:30', isActive: false, activities: '', detailedLocation: '' },
    { id: '2', name: 'Buổi Chiều', startTime: '12:30', endTime: '17:00', isActive: false, activities: '', detailedLocation: '' },
    { id: '3', name: 'Buổi Tối', startTime: '17:00', endTime: '22:00', isActive: false, activities: '', detailedLocation: '' }
  ];
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>({});
  const createEmptyLocationState = (): Record<DayKey, SlotLocationItem[]> => ({
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  });
  const [weeklySlotLocations, setWeeklySlotLocations] = useState<Record<DayKey, SlotLocationItem[]>>(createEmptyLocationState());

  type LocationMode = 'global' | 'perDay' | 'perSlot';
  const [locationMode, setLocationMode] = useState<LocationMode>('global');
  const isGlobalMode = locationMode === 'global';
  const isPerDayMode = locationMode === 'perDay';
  const isPerSlotMode = locationMode === 'perSlot';
  const locationModeSubtitles: Record<LocationMode, string> = {
    global: 'Chọn một vị trí chung, sau đó áp dụng nhanh cho các buổi.',
    perDay: 'Quản lý địa điểm riêng cho từng ngày trong tuần.',
    perSlot: 'Đặt địa điểm chi tiết cho từng buổi (Sáng/Chiều/Tối).',
  };

  const createEmptyDailyLocations = (): Record<DayKey, LocationData | null> => ({
    mon: null,
    tue: null,
    wed: null,
    thu: null,
    fri: null,
    sat: null,
    sun: null,
  });
  const [dailyLocations, setDailyLocations] = useState<Record<DayKey, LocationData | null>>(createEmptyDailyLocations());

  const [locationEditorDay, setLocationEditorDay] = useState<DayKey>('mon'); // dùng cho chế độ per slot
  const [dayLocationEditor, setDayLocationEditor] = useState<DayKey>('mon'); // dùng cho chế độ per day
  const [selectedTimeSlotForLocation, setSelectedTimeSlotForLocation] = useState<TimeSlotKey | null>(null);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0); // Index của tuần hiện tại đang xem
  const getLocationModeIcon = (mode: LocationMode) => {
    switch (mode) {
      case 'global':
        return <MapPin size={16} strokeWidth={1.5} />;
      case 'perDay':
        return <Calendar size={16} strokeWidth={1.5} />;
      case 'perSlot':
        return <Clock size={16} strokeWidth={1.5} />;
    }
  };
  
  const locationModeOptions: Array<{ value: LocationMode; label: string; description: string }> = [
    { value: 'global', label: 'Địa điểm chung', description: 'Áp dụng một địa điểm cho tất cả buổi đã bật' },
    { value: 'perDay', label: 'Theo ngày', description: 'Chọn địa điểm riêng cho từng ngày trong tuần' },
    { value: 'perSlot', label: 'Theo buổi', description: 'Mỗi buổi Sáng/Chiều/Tối có thể đặt địa điểm riêng' },
  ];
  const dayKeyOrder: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayKeyToLabel: Record<DayKey, string> = {
    mon: 'Thứ 2',
    tue: 'Thứ 3',
    wed: 'Thứ 4',
    thu: 'Thứ 5',
    fri: 'Thứ 6',
    sat: 'Thứ 7',
    sun: 'Chủ nhật',
  };
  const timeSlotIcon: Record<string, React.ReactNode> = {
    'Buổi Sáng': <Sun size={18} strokeWidth={1.5} />,
    'Buổi Chiều': <Sun size={18} strokeWidth={1.5} />,
    'Buổi Tối': <Moon size={18} strokeWidth={1.5} />,
  };
  const getDaySummary = (date: string) => {
    const slots = weeklyPlan[date] || [];
    const active = slots.filter(s => s.isActive).length;
    return { total: slots.length, active };
  };
  
  const getDaySummaryByDayKey = (dayKey: DayKey) => {
    // Get summary for the first date with this dayKey in current week
    const currentWeekDays = weekInfo.currentWeek?.days || [];
    const firstDate = currentWeekDays.find(d => d.dayKey === dayKey)?.date;
    if (firstDate) {
      return getDaySummary(firstDate);
    }
    return { total: 3, active: 0 };
  };
  const getDayKeyFromDate = (dateStr: string): DayKey => {
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    const day = d.getUTCDay(); // 0 Sun ... 6 Sat
    switch (day) {
      case 1: return 'mon';
      case 2: return 'tue';
      case 3: return 'wed';
      case 4: return 'thu';
      case 5: return 'fri';
      case 6: return 'sat';
      default: return 'sun';
    }
  };
  const updateWeeklySlot = (date: string, slotId: string, field: keyof WeeklySlot, value: string | boolean) => {
    setWeeklyPlan(prev => {
      const next = { ...prev };
      if (!next[date]) {
        next[date] = JSON.parse(JSON.stringify(defaultWeeklySlots));
      }
      next[date] = next[date].map(s => {
        if (s.id !== slotId) return s;
        const updated: WeeklySlot = { ...s, [field]: value };
        if (field === 'isActive' && value === false) {
          updated.locationAddress = undefined;
          updated.locationLat = undefined;
          updated.locationLng = undefined;
          updated.locationRadius = undefined;
        }
        if (field === 'isActive' && value === true) {
          const dayKey = getDayKeyFromDate(date);
          const dayLocation = dailyLocations[dayKey];
          if (dayLocation) {
            updated.locationAddress = dayLocation.address;
            updated.locationLat = dayLocation.lat;
            updated.locationLng = dayLocation.lng;
            updated.locationRadius = Number.isFinite(dayLocation.radius) ? dayLocation.radius : 200;
          }
        }
        return updated;
      });
      return next;
    });
    if (field === 'isActive' && value === false) {
      const slotKey = slotIdToTimeSlotKey[slotId];
      if (slotKey) {
        const dayKey = getDayKeyFromDate(date);
        setWeeklySlotLocations(prev => ({
          ...prev,
          [dayKey]: (prev[dayKey] || []).filter(item => item.timeSlot !== slotKey),
        }));
      }
    }
  };
  const copyDayToTarget = (source: DayKey, target: DayKey) => {
    if (source === target) return;
    // Tìm date string cho source và target dayKey
    const sourceDates = datesInRange.filter(d => getDayKeyFromDate(d) === source);
    const targetDates = datesInRange.filter(d => getDayKeyFromDate(d) === target);
    
    if (sourceDates.length === 0 || targetDates.length === 0) return;
    
    // Lấy date đầu tiên của source để copy
    const sourceDate = sourceDates[0];
    const sourceSlots = weeklyPlan[sourceDate] || defaultWeeklySlots;
    
    // Sao chép weeklyPlan cho tất cả các date có cùng target dayKey
    setWeeklyPlan(prev => {
      const next = { ...prev };
      targetDates.forEach(targetDate => {
        next[targetDate] = sourceSlots.map(s => ({ ...s }));
      });
      return next;
    });
    
    // Sao chép weeklySlotLocations (cho PerSlot mode)
    setWeeklySlotLocations(prev => {
      const sourceLocations = prev[source] || [];
      return {
        ...prev,
        [target]: sourceLocations.map(loc => ({
          ...loc,
          id: `${target}-${loc.timeSlot}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        })),
      };
    });
    // Sao chép dailyLocations (cho PerDay mode)
    setDailyLocations(prev => {
      const sourceLocation = prev[source];
      if (sourceLocation) {
        return {
          ...prev,
          [target]: {
            lat: sourceLocation.lat,
            lng: sourceLocation.lng,
            address: sourceLocation.address,
            radius: sourceLocation.radius,
          },
        };
      }
      return prev;
    });
    // Sao chép perDayDetailedLocation (cho PerDay mode)
    setPerDayDetailedLocation(prev => {
      const sourceDetailedLocation = prev[source];
      if (sourceDetailedLocation) {
        return {
          ...prev,
          [target]: sourceDetailedLocation,
        };
      }
      return prev;
    });
    // Sao chép ghi chú theo ngày (daySchedules)
    setDaySchedules(prev => {
      const next = { ...prev };
      // Lấy ghi chú của ngày đầu tiên có cùng dayKey với source
      const sourceDate = datesInRange.find(d => getDayKeyFromDate(d) === source);
      const sourceNote = sourceDate ? (prev[sourceDate] || '') : '';
      // Áp dụng ghi chú cho tất cả các ngày có cùng dayKey với target
      datesInRange.forEach(date => {
        if (getDayKeyFromDate(date) === target) {
          next[date] = sourceNote;
        }
      });
      return next;
    });
  };
  const copyDayToAll = (source: DayKey) => {
    // Tìm date string cho source dayKey
    const sourceDates = datesInRange.filter(d => getDayKeyFromDate(d) === source);
    if (sourceDates.length === 0) return;
    
    // Lấy date đầu tiên của source để copy
    const sourceDate = sourceDates[0];
    const sourceSlots = weeklyPlan[sourceDate] || defaultWeeklySlots;
    
    // Sao chép weeklyPlan cho tất cả các date trong datesInRange
    setWeeklyPlan(prev => {
      const next = { ...prev };
      datesInRange.forEach(date => {
        next[date] = sourceSlots.map(s => ({ ...s }));
      });
      return next;
    });
    // Sao chép weeklySlotLocations (cho PerSlot mode)
    setWeeklySlotLocations(prev => {
      const srcLocations = prev[source] || [];
      const cloneLocations = (day: DayKey) =>
        srcLocations.map(loc => ({
          ...loc,
          id: `${day}-${loc.timeSlot}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        }));
      return {
        mon: cloneLocations('mon'),
        tue: cloneLocations('tue'),
        wed: cloneLocations('wed'),
        thu: cloneLocations('thu'),
        fri: cloneLocations('fri'),
        sat: cloneLocations('sat'),
        sun: cloneLocations('sun'),
      };
    });
    // Sao chép dailyLocations (cho PerDay mode)
    setDailyLocations(prev => {
      const sourceLocation = prev[source];
      if (sourceLocation) {
        // Tạo object mới cho mỗi ngày để tránh reference issue
        return {
          mon: {
            lat: sourceLocation.lat,
            lng: sourceLocation.lng,
            address: sourceLocation.address,
            radius: sourceLocation.radius,
          },
          tue: {
            lat: sourceLocation.lat,
            lng: sourceLocation.lng,
            address: sourceLocation.address,
            radius: sourceLocation.radius,
          },
          wed: {
            lat: sourceLocation.lat,
            lng: sourceLocation.lng,
            address: sourceLocation.address,
            radius: sourceLocation.radius,
          },
          thu: {
            lat: sourceLocation.lat,
            lng: sourceLocation.lng,
            address: sourceLocation.address,
            radius: sourceLocation.radius,
          },
          fri: {
            lat: sourceLocation.lat,
            lng: sourceLocation.lng,
            address: sourceLocation.address,
            radius: sourceLocation.radius,
          },
          sat: {
            lat: sourceLocation.lat,
            lng: sourceLocation.lng,
            address: sourceLocation.address,
            radius: sourceLocation.radius,
          },
          sun: {
            lat: sourceLocation.lat,
            lng: sourceLocation.lng,
            address: sourceLocation.address,
            radius: sourceLocation.radius,
          },
        };
      }
      return prev;
    });
    // Sao chép perDayDetailedLocation (cho PerDay mode)
    setPerDayDetailedLocation(prev => {
      const sourceDetailedLocation = prev[source];
      if (sourceDetailedLocation) {
        return {
          mon: sourceDetailedLocation,
          tue: sourceDetailedLocation,
          wed: sourceDetailedLocation,
          thu: sourceDetailedLocation,
          fri: sourceDetailedLocation,
          sat: sourceDetailedLocation,
          sun: sourceDetailedLocation,
        };
      }
      return prev;
    });
    // Sao chép ghi chú theo ngày (daySchedules) sang tất cả các ngày khác
    setDaySchedules(prev => {
      const next = { ...prev };
      // Lấy ghi chú của ngày đầu tiên có cùng dayKey với source
      const sourceDate = datesInRange.find(d => getDayKeyFromDate(d) === source);
      const sourceNote = sourceDate ? (prev[sourceDate] || '') : '';
      // Áp dụng ghi chú cho tất cả các ngày trong khoảng thời gian
      datesInRange.forEach(date => {
        next[date] = sourceNote;
      });
      return next;
    });
  };
  const resetDayPlan = (day: DayKey) => {
    // Tìm tất cả các date có cùng dayKey
    const dayDates = datesInRange.filter(d => getDayKeyFromDate(d) === day);
    
    // Reset weeklyPlan về mặc định cho tất cả các date có cùng dayKey
    setWeeklyPlan(prev => {
      const next = { ...prev };
      dayDates.forEach(date => {
        next[date] = defaultWeeklySlots.map(slot => ({ ...slot }));
      });
      return next;
    });
    // Reset weeklySlotLocations (cho PerSlot mode)
    setWeeklySlotLocations(prev => ({
      ...prev,
      [day]: [],
    }));
    // Reset dailyLocations (cho PerDay mode)
    setDailyLocations(prev => ({
      ...prev,
      [day]: null,
    }));
    // Reset perDayDetailedLocation (cho PerDay mode)
    setPerDayDetailedLocation(prev => ({
      ...prev,
      [day]: '',
    }));
    // Reset ghi chú theo ngày (daySchedules) cho tất cả các ngày có cùng dayKey
    setDaySchedules(prev => {
      const next = { ...prev };
      datesInRange.forEach(date => {
        if (getDayKeyFromDate(date) === day) {
          next[date] = '';
        }
      });
      return next;
    });
  };

  const getActiveTimeSlotsForDay = (date: string): TimeSlotKey[] => {
    const slots = weeklyPlan[date] || [];
    return slots
      .filter((slot) => slot.isActive)
      .map((slot) => slotIdToTimeSlotKey[slot.id] ?? 'morning');
  };
  
  const getActiveTimeSlotsForDayKey = (dayKey: DayKey): TimeSlotKey[] => {
    // Get active slots for the first date with this dayKey in current week
    const currentWeekDays = weekInfo.currentWeek?.days || [];
    const firstDate = currentWeekDays.find(d => d.dayKey === dayKey)?.date;
    if (firstDate) {
      return getActiveTimeSlotsForDay(firstDate);
    }
    return [];
  };

  const handleDayLocationsChange = (day: DayKey, locations: SlotLocationItem[]) => {
    const normalized = locations.map((loc, idx) => ({
      ...loc,
      id: loc.id || `${day}-${loc.timeSlot}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`
    }));
    setWeeklySlotLocations(prev => ({
      ...prev,
      [day]: normalized,
    }));
    // Tìm tất cả các date có cùng dayKey
    const dayDates = datesInRange.filter(d => getDayKeyFromDate(d) === day);
    setWeeklyPlan(prev => {
      const next = { ...prev };
      dayDates.forEach(date => {
        if (!next[date]) {
          next[date] = JSON.parse(JSON.stringify(defaultWeeklySlots));
        }
        next[date] = next[date].map(slot => {
        const slotKey = slotIdToTimeSlotKey[slot.id] ?? 'morning';
        const matched = normalized.find(item => item.timeSlot === slotKey);
        return {
          ...slot,
          locationAddress: matched?.location.address,
          locationLat: matched?.location.lat,
          locationLng: matched?.location.lng,
          locationRadius: matched?.radius,
          detailedLocation: matched
            ? (slot.detailedLocation && slot.detailedLocation.trim().length > 0
                ? slot.detailedLocation
                : matched.location.address)
            : slot.detailedLocation,
        };
      });
      });
      return next;
    });
  };

  const handleSlotLocationSelect = (day: DayKey, slotKey: TimeSlotKey, location: LocationData) => {
    if (!location || !location.address) return;
    
    const slotId = timeSlotKeyToSlotId[slotKey];
    if (!slotId) return;

    // Cập nhật weeklySlotLocations
    setWeeklySlotLocations(prev => {
      const existing = prev[day].find(item => item.timeSlot === slotKey);
      const newLocation: SlotLocationItem = {
        id: existing?.id || `${day}-${slotKey}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timeSlot: slotKey,
        location: {
          lat: location.lat,
          lng: location.lng,
          address: location.address,
        },
        radius: location.radius || 200,
      };
      return {
        ...prev,
        [day]: existing
          ? prev[day].map(item => item.timeSlot === slotKey ? newLocation : item)
          : [...prev[day], newLocation],
      };
    });

    // Cập nhật weeklyPlan - Tìm tất cả các date có cùng dayKey
    const dayDates = datesInRange.filter(d => getDayKeyFromDate(d) === day);
    setWeeklyPlan(prev => {
      const next = { ...prev };
      dayDates.forEach(date => {
        if (!next[date]) {
          next[date] = JSON.parse(JSON.stringify(defaultWeeklySlots));
        }
        next[date] = next[date].map(slot => slot.id === slotId
          ? {
              ...slot,
              locationAddress: location.address,
              locationLat: location.lat,
              locationLng: location.lng,
              locationRadius: location.radius || 200,
            }
          : slot);
      });
      return next;
    });
  };

  const handleDayLocationSelect = (day: DayKey, location: LocationData) => {
    setLocationMode('perDay');
    const normalized: LocationData = {
      lat: location.lat,
      lng: location.lng,
      address: location.address,
      radius: Number.isFinite(location.radius) ? location.radius : 200,
    };
    setDailyLocations(prev => ({
      ...prev,
      [day]: normalized,
    }));
    // Tìm tất cả các date có cùng dayKey
    const dayDates = datesInRange.filter(d => getDayKeyFromDate(d) === day);
    setWeeklyPlan(prev => {
      const next = { ...prev };
      dayDates.forEach(date => {
        if (!next[date]) {
          next[date] = JSON.parse(JSON.stringify(defaultWeeklySlots));
        }
        next[date] = next[date].map(slot => {
          if (!slot.isActive) return slot;
          return {
            ...slot,
            locationAddress: normalized.address,
            locationLat: normalized.lat,
            locationLng: normalized.lng,
            locationRadius: normalized.radius,
          };
        });
      });
      return next;
    });
  };

  const handleClearDayLocation = (day: DayKey) => {
    setDailyLocations(prev => ({
      ...prev,
      [day]: null,
    }));
    // Tìm tất cả các date có cùng dayKey
    const dayDates = datesInRange.filter(d => getDayKeyFromDate(d) === day);
    setWeeklyPlan(prev => {
      const next = { ...prev };
      dayDates.forEach(date => {
        if (!next[date]) {
          next[date] = JSON.parse(JSON.stringify(defaultWeeklySlots));
        }
        next[date] = next[date].map(slot => ({
          ...slot,
          locationAddress: undefined,
          locationLat: undefined,
          locationLng: undefined,
          locationRadius: undefined,
        }));
      });
      return next;
    });
  };

  const handleClearSlotLocation = (day: DayKey, slotId: string) => {
    const slotKey = slotIdToTimeSlotKey[slotId];
    if (!slotKey) return;
    setWeeklySlotLocations(prev => ({
      ...prev,
      [day]: prev[day].filter(item => item.timeSlot !== slotKey),
    }));
    // Tìm tất cả các date có cùng dayKey
    const dayDates = datesInRange.filter(d => getDayKeyFromDate(d) === day);
    setWeeklyPlan(prev => {
      const next = { ...prev };
      dayDates.forEach(date => {
        if (!next[date]) {
          next[date] = JSON.parse(JSON.stringify(defaultWeeklySlots));
        }
        next[date] = next[date].map(slot => slot.id === slotId
          ? {
              ...slot,
              locationAddress: undefined,
              locationLat: undefined,
              locationLng: undefined,
              locationRadius: undefined,
            }
          : slot);
      });
      return next;
    });
  };

  const handleCopyDayLocationToAll = (source: DayKey) => {
    const sourceLoc = dailyLocations[source];
    if (!sourceLoc) return;
    const baseRadius = Number.isFinite(sourceLoc.radius) ? sourceLoc.radius : 200;
    
    // Tạo object mới cho mỗi ngày để đảm bảo React nhận biết thay đổi
    setDailyLocations(() => {
      const next: Record<DayKey, LocationData | null> = {
        mon: {
      lat: sourceLoc.lat,
      lng: sourceLoc.lng,
      address: sourceLoc.address,
      radius: baseRadius,
        },
        tue: {
          lat: sourceLoc.lat,
          lng: sourceLoc.lng,
          address: sourceLoc.address,
          radius: baseRadius,
        },
        wed: {
          lat: sourceLoc.lat,
          lng: sourceLoc.lng,
          address: sourceLoc.address,
          radius: baseRadius,
        },
        thu: {
          lat: sourceLoc.lat,
          lng: sourceLoc.lng,
          address: sourceLoc.address,
          radius: baseRadius,
        },
        fri: {
          lat: sourceLoc.lat,
          lng: sourceLoc.lng,
          address: sourceLoc.address,
          radius: baseRadius,
        },
        sat: {
          lat: sourceLoc.lat,
          lng: sourceLoc.lng,
          address: sourceLoc.address,
          radius: baseRadius,
        },
        sun: {
          lat: sourceLoc.lat,
          lng: sourceLoc.lng,
          address: sourceLoc.address,
          radius: baseRadius,
        },
      };
      return next;
    });
    setWeeklyPlan(prev => {
      const next = { ...prev };
      datesInRange.forEach(date => {
        if (!next[date]) {
          next[date] = JSON.parse(JSON.stringify(defaultWeeklySlots));
        }
        next[date] = next[date].map(slot => slot.isActive ? {
          ...slot,
          locationAddress: sourceLoc.address,
          locationLat: sourceLoc.lat,
          locationLng: sourceLoc.lng,
          locationRadius: baseRadius,
        } : slot);
      });
      return next;
    });
  };

  const handleApplyMainLocationToSlot = (day: DayKey, slotId: string) => {
    if (!locationData) return;
    const slotKey = slotIdToTimeSlotKey[slotId];
    if (!slotKey) return;
    const baseRadius = Number.isFinite(locationData.radius) ? locationData.radius : 200;
    const updatedDayLocations = [
      ...weeklySlotLocations[day].filter(item => item.timeSlot !== slotKey),
      {
        id: `${day}-${slotKey}-${Date.now()}`,
        timeSlot: slotKey,
        location: {
          lat: locationData.lat,
          lng: locationData.lng,
          address: locationData.address,
        },
        radius: baseRadius,
      },
    ];
    handleDayLocationsChange(day, updatedDayLocations);
    setLocationMode('perSlot');
  };

  const handleOpenSlotLocationPicker = (day: DayKey, slotId: string) => {
    const slotKey = slotIdToTimeSlotKey[slotId];
    if (!slotKey) return;
    setLocationMode('perSlot');
    setLocationEditorDay(day);
    setSelectedTimeSlotForLocation(slotKey);
    requestAnimationFrame(() => {
      const section = document.getElementById('session-map-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  // Sidebar state sync
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
        const newState = currentSidebarState === 'true';
        setIsSidebarOpen(prev => (prev !== newState ? newState : prev));
      }
    };
    checkSidebarState();
    const intervalId = setInterval(checkSidebarState, 100);
    return () => {
      window.removeEventListener('sidebarStateChange', handleSidebarChange);
      clearInterval(intervalId);
    };
  }, []);

  // Desktop detection
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const getRoleDisplayName = (role: string): string => {
    const roleMap: { [key: string]: string } = {
      'SUPER_ADMIN': 'Quản Trị Hệ Thống',
      'CLUB_LEADER': 'Chủ Nhiệm CLB',
      'CLUB_DEPUTY': 'Phó Chủ Nhiệm',
      'CLUB_MEMBER': 'Ủy Viên BCH',
      'CLUB_STUDENT': 'Thành Viên CLB'
    };
    return roleMap[role] || role;
  };
  const getStatusDisplayName = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'active': 'Hoạt động',
      'inactive': 'Không hoạt động',
      'suspended': 'Tạm ngưng',
      'pending': 'Chờ xác nhận'
    };
    return statusMap[status] || status;
  };

  // Load responsible persons
  useEffect(() => {
    const loadResponsiblePersons = async () => {
      const token = localStorage.getItem('token');
      if (!token || !user) return;
      setLoadingResponsiblePersons(true);
      try {
        const response = await fetch('/api/users/responsible-persons', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.responsiblePersons && Array.isArray(data.responsiblePersons)) {
            // Chỉ lấy CLUB_MEMBER và CLUB_DEPUTY
            const filtered = data.responsiblePersons.filter((p: any) => 
              p.role === 'CLUB_MEMBER' || p.role === 'CLUB_DEPUTY'
            );
            setResponsiblePersons(filtered);
          } else {
            setResponsiblePersons([]);
          }
        } else {
          setResponsiblePersons([]);
        }
      } catch {
        setResponsiblePersons([]);
      } finally {
        setLoadingResponsiblePersons(false);
      }
    };
    loadResponsiblePersons();
  }, [user]);


  // Load participants từ activity (chỉ khi edit mode và có activityId)
  useEffect(() => {
    const loadParticipants = async () => {
      if (!isEditMode || !activityId) {
        setActivityMembers([]);
        return;
      }
      
      setLoadingParticipants(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch(`/api/activities/${activityId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.activity) {
            const activity = result.data.activity;
            const participants = activity.participants || [];
            
            // Map participants sang ActivityMember format
            const mappedMembers: ActivityMember[] = participants.map((p: any) => {
              // Handle userId - can be ObjectId string or populated object
              const userId = typeof p.userId === 'object' && p.userId !== null
                ? p.userId._id || p.userId
                : p.userId;
              
              // Get name and email
              const name = p.name || 
                (typeof p.userId === 'object' && p.userId !== null && 'name' in p.userId 
                  ? String(p.userId.name) 
                  : 'Chưa có tên');
              const email = p.email || 
                (typeof p.userId === 'object' && p.userId !== null && 'email' in p.userId 
                  ? String(p.userId.email) 
                  : '');
              const studentId = p.studentId || 
                (typeof p.userId === 'object' && p.userId !== null && 'studentId' in p.userId 
                  ? String(p.userId.studentId) 
                  : undefined);
              
              // Map role từ database sang MemberRole
              // Database có: 'Trưởng Nhóm', 'Phó Trưởng Nhóm', 'Thành Viên Ban Tổ Chức', 'Người Tham Gia', 'Người Giám Sát'
              // MemberRole có: 'leader', 'deputy', 'member'
              let role: MemberRole = 'member';
              if (p.role === 'Trưởng Nhóm') {
                role = 'leader';
              } else if (p.role === 'Phó Trưởng Nhóm') {
                role = 'deputy';
              } else {
                role = 'member';
              }
              
              return {
                userId: String(userId),
                name,
                email,
                studentId,
                role,
                approvalStatus: p.approvalStatus || 'pending'
              };
            });
            
            setActivityMembers(mappedMembers);
          } else {
            setActivityMembers([]);
          }
        } else {
          setActivityMembers([]);
        }
      } catch (error) {
        console.error('Error loading participants:', error);
        setActivityMembers([]);
      } finally {
        setLoadingParticipants(false);
      }
    };
    
    loadParticipants();
  }, [isEditMode, activityId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Validate registrationThreshold: must be between 0 and 100
    if (name === 'registrationThreshold') {
      const trimmedValue = value.trim();
      
      // Allow empty string while typing, but validate when it's a number
      if (trimmedValue === '') {
        setForm(prev => ({
          ...prev,
          [name]: ''
        }));
        return;
      }
      
      const numValue = parseInt(trimmedValue);
      if (!isNaN(numValue)) {
        if (numValue > 100) {
          setForm(prev => ({
            ...prev,
            [name]: '100'
          }));
          return;
        }
        if (numValue < 0) {
          setForm(prev => ({
            ...prev,
            [name]: '0'
          }));
          return;
        }
        // Valid number, use trimmed value
        setForm(prev => ({
          ...prev,
          [name]: trimmedValue
        }));
        return;
      }
    }
    
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Hàm xử lý toggle người phụ trách
  const handleToggleResponsiblePerson = (personId: string) => {
    setForm(prev => {
      const current = prev.responsiblePerson || [];
      const isSelected = current.includes(personId);
      if (isSelected) {
        // Reset image error khi xóa người
        setImageErrors(prev => {
          const newSet = new Set(prev);
          newSet.delete(personId);
          return newSet;
        });
        return {
          ...prev,
          responsiblePerson: current.filter(id => id !== personId)
        };
      } else {
        return {
          ...prev,
          responsiblePerson: [...current, personId]
        };
      }
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Kích thước file không được vượt quá 10MB');
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setImagePreview(evt.target?.result as string);
      setShowCropModal(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  // Hàm xử lý khi crop xong
  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Hàm tạo ảnh đã crop
  const createCroppedImage = useCallback(async () => {
    if (!imagePreview || !croppedAreaPixels) return;

    const image = await createImage(imagePreview);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    return new Promise<string>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const fileUrl = URL.createObjectURL(blob);
        resolve(fileUrl);
      }, 'image/jpeg', 0.9);
    });
  }, [imagePreview, croppedAreaPixels]);

  // Helper function để tạo image element
  const createImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });
  };

  // Hàm xác nhận crop
  const handleCropComplete = async () => {
    if (!croppedAreaPixels) return;
    
    const croppedImageUrl = await createCroppedImage();
    if (croppedImageUrl) {
      // Chuyển blob URL thành File
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], selectedImage?.name || 'cropped-image.jpg', { type: 'image/jpeg' });
      
      setSelectedImage(file);
      setImagePreview(croppedImageUrl);
      setShowCropModal(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview('');
    setImageHeight(192); // Reset về chiều cao mặc định
    setForm(prev => ({ ...prev, imageUrl: '' }));
  };

  const handleLocationChange = (location: LocationData) => {
    setLocationData(location);
    setForm(prev => ({ ...prev, location: location.address }));
  };

  const applyLocationToSlots = (address: string, scope: 'all' | DayKey) => {
    if (!address || !address.trim()) return;
    const targetDays = scope === 'all' ? datesInRange : datesInRange.filter(d => getDayKeyFromDate(d) === scope);
    const activeSlotIdsByDate: Record<string, string[]> = targetDays.reduce((acc, date) => {
      const slots = weeklyPlan[date] || [];
      acc[date] = slots
        .filter(slot => slot.isActive)
        .map(slot => slot.id);
      return acc;
    }, {} as Record<string, string[]>);

    setWeeklyPlan(prev => {
      const next = { ...prev };
      targetDays.forEach((date) => {
        if (!next[date]) {
          next[date] = JSON.parse(JSON.stringify(defaultWeeklySlots));
        }
        next[date] = next[date].map((slot) => {
          if (!slot.isActive) return slot;
          const updated: WeeklySlot = {
            ...slot,
            detailedLocation: address,
          };
          if (isPerSlotMode && locationData && activeSlotIdsByDate[date]?.includes(slot.id)) {
            updated.locationAddress = locationData.address;
            updated.locationLat = locationData.lat;
            updated.locationLng = locationData.lng;
            updated.locationRadius = Number.isFinite(locationData.radius) ? locationData.radius : 200;
          }
          return updated;
        });
      });
      return next;
    });

    if (isPerDayMode && locationData) {
      setDailyLocations(prev => {
        const next = { ...prev };
        const payload: LocationData = {
          lat: locationData.lat,
          lng: locationData.lng,
          address: locationData.address,
          radius: locationData.radius,
        };
        targetDays.forEach(date => {
          const dayKey = getDayKeyFromDate(date);
          next[dayKey] = { ...payload };
        });
        return next;
      });
    }

    if (isPerSlotMode && locationData) {
      const baseRadius = Number.isFinite(locationData.radius) ? locationData.radius : 200;
      setWeeklySlotLocations(prev => {
        const next = { ...prev };
        targetDays.forEach(date => {
          const dayKey = getDayKeyFromDate(date);
          const activeSlotIds = activeSlotIdsByDate[date] || [];
          const retained = (prev[dayKey] || []).filter((item: SlotLocationItem) => !activeSlotIds.includes(timeSlotKeyToSlotId[item.timeSlot]));
          const replacements = activeSlotIds.map((slotId: string) => {
            const slotKey = slotIdToTimeSlotKey[slotId] ?? 'morning';
            return {
              id: `${dayKey}-${slotKey}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              timeSlot: slotKey,
              location: {
                lat: locationData.lat,
                lng: locationData.lng,
                address,
              },
              radius: baseRadius,
            };
          });
          next[dayKey] = [...retained, ...replacements];
        });
        return next;
      });
    }
  };

  const applySuggestionToSlot = (day: DayKey, slotId: string, value: string) => {
    if (!value) return;
    updateWeeklySlot(day, slotId, 'detailedLocation', value);
  };

  // Load activity data when in edit mode
  useEffect(() => {
    if (isEditMode && activityId) {
      loadActivityData(activityId);
    }
  }, [isEditMode, activityId]);

  // Function to load activity data for editing
  const loadActivityData = async (id: string) => {
    try {
      setIsLoadingActivity(true);
      console.log('Loading multiple days activity data for ID:', id);
      
      const response = await fetch(`/api/activities/${id}`);
      const result = await response.json();
      
      console.log('API response:', result);
      
      if (result.success && result.data.activity) {
        const activity = result.data.activity;
        // Fill form data
        setForm({
          name: activity.name || '',
          description: activity.description || '',
          startDate: activity.startDate ? new Date(activity.startDate).toISOString().split('T')[0] : '',
          endDate: activity.endDate ? new Date(activity.endDate).toISOString().split('T')[0] : '',
          location: activity.location || '',
          maxParticipants: activity.maxParticipants?.toString() || '',
          registrationThreshold: (activity.registrationThreshold !== undefined && activity.registrationThreshold !== null) 
            ? activity.registrationThreshold.toString() 
            : '80',
          visibility: activity.visibility || 'public',
          responsiblePerson: (() => {
            // Handle both single value and array
            if (Array.isArray(activity.responsiblePerson)) {
              return activity.responsiblePerson.map((rp: any) => 
                typeof rp === 'object' && rp !== null ? (rp._id || rp) : rp
              ).filter(Boolean);
            } else if (activity.responsiblePerson) {
              const rp = activity.responsiblePerson;
              return [typeof rp === 'object' && rp !== null ? (rp._id || rp) : rp].filter(Boolean);
            }
            return [];
          })(),
          status: activity.status || 'draft',
          imageUrl: activity.imageUrl || '',
          overview: activity.overview || '',
        });
        
        // Set image preview if exists
        if (activity.imageUrl) {
          setImagePreview(activity.imageUrl);
        }

        // Determine location mode from activity.location
        let detectedLocationMode: LocationMode = 'global';
        if (activity.location === 'Địa điểm theo buổi') {
          detectedLocationMode = 'perSlot';
        } else if (activity.location === 'Địa điểm theo ngày') {
          detectedLocationMode = 'perDay';
        } else if (activity.locationData) {
          detectedLocationMode = 'global';
        }
        setLocationMode(detectedLocationMode);

        // Fill location data based on mode
        if (detectedLocationMode === 'global' && activity.locationData) {
          const locationData = {
            lat: activity.locationData.lat || 0,
            lng: activity.locationData.lng || 0,
            address: activity.locationData.address || activity.location || '',
            radius: activity.locationData.radius || 200
          };
          setLocationData(locationData);
        } else if (detectedLocationMode === 'global' && activity.location && 
                   activity.location !== 'Địa điểm theo buổi' && 
                   activity.location !== 'Địa điểm theo ngày') {
          const locationData = {
            lat: 0,
            lng: 0,
            address: activity.location,
            radius: 200
          };
          setLocationData(locationData);
        }

        // Parse schedule to rebuild weeklyPlan
        if (activity.schedule && activity.schedule.length > 0) {

          // Parse schedule to extract weekly plan
          // Schedule format: Array<{ day: number; date: Date; activities: string }>
          const newWeeklyPlan: WeeklyPlan = {};

          // Parse schedule activities to extract time slot info
          activity.schedule.forEach((scheduleItem: any) => {
            const scheduleDate = new Date(scheduleItem.date);
            const dateStr = scheduleDate.toISOString().split('T')[0]; // YYYY-MM-DD
            const dayKey = getDayKeyFromDate(dateStr);
            const activitiesText = scheduleItem.activities || '';
            
            // Initialize slots for this date if not exists
            if (!newWeeklyPlan[dateStr]) {
              newWeeklyPlan[dateStr] = JSON.parse(JSON.stringify(defaultWeeklySlots));
            }
            
            // Parse activities text to extract time slot information
            // Format: "Buổi Sáng (07:00-11:30) - mô tả - Địa điểm..." or similar
            const lines = activitiesText.split('\n').filter((line: string) => line.trim());
            
            lines.forEach((line: string) => {
              // Skip lines that are clearly location info (not time slot info)
              if (line.trim().startsWith('Địa điểm') || line.trim().startsWith('Cùng địa chỉ')) {
                return; // Skip location lines
              }
              
              // Try to match time slot patterns
              if (line.includes('Buổi Sáng') || line.includes('Sáng')) {
                const morningMatch = line.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
                if (morningMatch) {
                  const slot = newWeeklyPlan[dateStr].find(s => s.id === '1');
                  if (slot) {
                    slot.isActive = true;
                    slot.startTime = morningMatch[1];
                    slot.endTime = morningMatch[2];
                    // Extract activities description
                    // Pattern: "Buổi Sáng (07:00-11:30) - mô tả hoạt động - Địa điểm..."
                    // We want to extract only the text between the first "- " after time and the next "- Địa điểm" or "- Địa điểm chi tiết"
                    // More precise pattern: match "- " followed by text that doesn't contain "Địa điểm" until we hit "- Địa điểm"
                    const timePattern = /\(\d{2}:\d{2}-\d{2}:\d{2}\)/;
                    const timeMatch = line.match(timePattern);
                    if (timeMatch) {
                      const afterTime = line.substring(line.indexOf(timeMatch[0]) + timeMatch[0].length);
                      // Look for "- " after time, then extract until "- Địa điểm" or end of line
                      const activitiesMatch = afterTime.match(/-\s*([^-]*?)(?:\s*-\s*Địa điểm|$)/);
                      if (activitiesMatch && activitiesMatch[1]) {
                        const extracted = activitiesMatch[1].trim();
                        // Only set if it's not empty and doesn't look like it's part of location info
                        if (extracted && 
                            extracted.length > 0 && 
                            !extracted.includes('Địa điểm') && 
                            !extracted.includes('Bán kính') &&
                            !extracted.includes('(') && // Avoid coordinates
                            !extracted.match(/^\d+\.\d+/) // Avoid lat/lng numbers
                        ) {
                          slot.activities = extracted;
                        }
                      }
                    }
                    // Extract detailed location
                    const locationMatch = line.match(/Địa điểm chi tiết:\s*(.+?)(?:\s*-\s*Địa điểm map|$)/);
                    if (locationMatch) {
                      slot.detailedLocation = locationMatch[1].trim();
                    }
                    // Extract map location
                    const mapLocationMatch = line.match(/Địa điểm map:\s*(.+?)(?:\s*\(|$)/);
                    if (mapLocationMatch) {
                      slot.locationAddress = mapLocationMatch[1].trim();
                      // Extract coordinates if available
                      const coordsMatch = line.match(/\(([\d.]+),\s*([\d.]+)\)/);
                      if (coordsMatch) {
                        slot.locationLat = parseFloat(coordsMatch[1]);
                        slot.locationLng = parseFloat(coordsMatch[2]);
                      }
                      // Extract radius if available
                      const radiusMatch = line.match(/Bán kính:\s*(\d+)m/);
                      if (radiusMatch) {
                        slot.locationRadius = parseInt(radiusMatch[1]);
                      }
                    }
                  }
                }
              } else if (line.includes('Buổi Chiều') || line.includes('Chiều')) {
                const afternoonMatch = line.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
                if (afternoonMatch) {
                  const slot = newWeeklyPlan[dateStr].find(s => s.id === '2');
                  if (slot) {
                    slot.isActive = true;
                    slot.startTime = afternoonMatch[1];
                    slot.endTime = afternoonMatch[2];
                    // Extract activities description
                    // Pattern: "Buổi Chiều (12:30-17:00) - mô tả hoạt động - Địa điểm..."
                    const timePattern = /\(\d{2}:\d{2}-\d{2}:\d{2}\)/;
                    const timeMatch = line.match(timePattern);
                    if (timeMatch) {
                      const afterTime = line.substring(line.indexOf(timeMatch[0]) + timeMatch[0].length);
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
                          slot.activities = extracted;
                        }
                      }
                    }
                    const locationMatch = line.match(/Địa điểm chi tiết:\s*(.+?)(?:\s*-\s*Địa điểm map|$)/);
                    if (locationMatch) {
                      slot.detailedLocation = locationMatch[1].trim();
                    }
                    // Extract map location
                    const mapLocationMatch = line.match(/Địa điểm map:\s*(.+?)(?:\s*\(|$)/);
                    if (mapLocationMatch) {
                      slot.locationAddress = mapLocationMatch[1].trim();
                      const coordsMatch = line.match(/\(([\d.]+),\s*([\d.]+)\)/);
                      if (coordsMatch) {
                        slot.locationLat = parseFloat(coordsMatch[1]);
                        slot.locationLng = parseFloat(coordsMatch[2]);
                      }
                      const radiusMatch = line.match(/Bán kính:\s*(\d+)m/);
                      if (radiusMatch) {
                        slot.locationRadius = parseInt(radiusMatch[1]);
                      }
                    }
                  }
                }
              } else if (line.includes('Buổi Tối') || line.includes('Tối')) {
                const eveningMatch = line.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
                if (eveningMatch) {
                  const slot = newWeeklyPlan[dateStr].find(s => s.id === '3');
                  if (slot) {
                    slot.isActive = true;
                    slot.startTime = eveningMatch[1];
                    slot.endTime = eveningMatch[2];
                    // Extract activities description
                    // Pattern: "Buổi Tối (17:00-22:00) - mô tả hoạt động - Địa điểm..."
                    const timePattern = /\(\d{2}:\d{2}-\d{2}:\d{2}\)/;
                    const timeMatch = line.match(timePattern);
                    if (timeMatch) {
                      const afterTime = line.substring(line.indexOf(timeMatch[0]) + timeMatch[0].length);
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
                          slot.activities = extracted;
                        }
                      }
                    }
                    const locationMatch = line.match(/Địa điểm chi tiết:\s*(.+?)(?:\s*-\s*Địa điểm map|$)/);
                    if (locationMatch) {
                      slot.detailedLocation = locationMatch[1].trim();
                    }
                    // Extract map location
                    const mapLocationMatch = line.match(/Địa điểm map:\s*(.+?)(?:\s*\(|$)/);
                    if (mapLocationMatch) {
                      slot.locationAddress = mapLocationMatch[1].trim();
                      const coordsMatch = line.match(/\(([\d.]+),\s*([\d.]+)\)/);
                      if (coordsMatch) {
                        slot.locationLat = parseFloat(coordsMatch[1]);
                        slot.locationLng = parseFloat(coordsMatch[2]);
                      }
                      const radiusMatch = line.match(/Bán kính:\s*(\d+)m/);
                      if (radiusMatch) {
                        slot.locationRadius = parseInt(radiusMatch[1]);
                      }
                    }
                  }
                }
              }
            });
          });

          setWeeklyPlan(newWeeklyPlan);

          // Load location data based on mode
          if (detectedLocationMode === 'perSlot') {
            // Load weeklySlotLocations from weeklyPlan for PerSlot mode
            // Parse lại schedule để đảm bảo load tất cả các buổi đã chọn trước đó
            const slotLocationsByDay: Record<DayKey, SlotLocationItem[]> = createEmptyLocationState();
            
            // Parse lại schedule để tìm tất cả các buổi có địa điểm
            activity.schedule.forEach((scheduleItem: any) => {
              const scheduleDate = new Date(scheduleItem.date);
              const dayKey = getDayKeyFromDate(scheduleDate.toISOString().split('T')[0]);
              const activitiesText = scheduleItem.activities || '';
              const lines = activitiesText.split('\n').filter((line: string) => line.trim());
              
              lines.forEach((line: string) => {
                // Tìm địa điểm map trong line
                const mapLocationMatch = line.match(/Địa điểm map:\s*(.+?)(?:\s*\(|$)/);
                if (mapLocationMatch) {
                  const address = mapLocationMatch[1].trim();
                  const coordsMatch = line.match(/\(([\d.]+),\s*([\d.]+)\)/);
                  const radiusMatch = line.match(/Bán kính:\s*(\d+)m/);
                  
                  if (coordsMatch) {
                    // Xác định timeSlot từ line
                    let slotKey: TimeSlotKey | null = null;
                    if (line.includes('Buổi Sáng') || line.includes('Sáng')) {
                      slotKey = 'morning';
                    } else if (line.includes('Buổi Chiều') || line.includes('Chiều')) {
                      slotKey = 'afternoon';
                    } else if (line.includes('Buổi Tối') || line.includes('Tối')) {
                      slotKey = 'evening';
                    }
                    
                    if (slotKey) {
                      // Kiểm tra xem đã có chưa
                      const existing = slotLocationsByDay[dayKey].find(item => item.timeSlot === slotKey);
                      if (!existing) {
                        slotLocationsByDay[dayKey].push({
                          id: `${dayKey}-${slotKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                          timeSlot: slotKey,
                          location: {
                            lat: parseFloat(coordsMatch[1]),
                            lng: parseFloat(coordsMatch[2]),
                            address: address,
                          },
                          radius: radiusMatch ? parseInt(radiusMatch[1]) : 200,
                        });
                      }
                    }
                  }
                }
              });
            });
            
            // Bổ sung từ weeklyPlan nếu có slot active nhưng chưa có trong slotLocationsByDay
            Object.keys(newWeeklyPlan).forEach((dateStr) => {
              const slots = newWeeklyPlan[dateStr];
              const dayKey = getDayKeyFromDate(dateStr);
              slots.forEach((slot) => {
                if (slot.isActive && slot.locationAddress && slot.locationLat && slot.locationLng) {
                  const slotKey = slotIdToTimeSlotKey[slot.id];
                  if (slotKey) {
                    const existing = slotLocationsByDay[dayKey].find(item => item.timeSlot === slotKey);
                    if (!existing) {
                      slotLocationsByDay[dayKey].push({
                        id: `${dayKey}-${slotKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        timeSlot: slotKey,
                        location: {
                          lat: slot.locationLat,
                          lng: slot.locationLng,
                          address: slot.locationAddress,
                        },
                        radius: slot.locationRadius || 200,
                      });
                    }
                  }
                }
              });
            });
            
            setWeeklySlotLocations(slotLocationsByDay);
          } else if (detectedLocationMode === 'perDay') {
            // Load dailyLocations and perDayDetailedLocation for PerDay mode
            const dailyLocs: Record<DayKey, LocationData | null> = createEmptyDailyLocations();
            const perDayDetailed: Record<DayKey, string> = {
              mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: ''
            };
            
            // Parse schedule to extract daily locations
            activity.schedule.forEach((scheduleItem: any) => {
              const scheduleDate = new Date(scheduleItem.date);
              const dayKey = getDayKeyFromDate(scheduleDate.toISOString().split('T')[0]);
              const activitiesText = scheduleItem.activities || '';
              
              // Extract daily location from schedule
              // Look for "Địa điểm map:" in any line
              const lines = activitiesText.split('\n');
              let foundLocation = false;
              
              lines.forEach((line: string) => {
                const mapLocationMatch = line.match(/Địa điểm map:\s*(.+?)(?:\s*\(|$)/);
                if (mapLocationMatch && !foundLocation) {
                  const address = mapLocationMatch[1].trim();
                  const coordsMatch = line.match(/\(([\d.]+),\s*([\d.]+)\)/);
                  const radiusMatch = line.match(/Bán kính:\s*(\d+)m/);
                  
                  if (coordsMatch) {
                    dailyLocs[dayKey] = {
                      lat: parseFloat(coordsMatch[1]),
                      lng: parseFloat(coordsMatch[2]),
                      address: address,
                      radius: radiusMatch ? parseInt(radiusMatch[1]) : 200
                    };
                    foundLocation = true;
                  }
                }
                
                // Extract detailed location
                const detailedMatch = line.match(/Địa điểm chi tiết:\s*(.+?)(?:\s*-\s*Địa điểm map|$)/);
                if (detailedMatch) {
                  perDayDetailed[dayKey] = detailedMatch[1].trim();
                }
              });
            });
            
            setDailyLocations(dailyLocs);
            setPerDayDetailedLocation(perDayDetailed);
          }
        }

        // Load day schedules (free text notes)
        if (activity.schedule && activity.schedule.length > 0) {
          const schedules: Record<string, string> = {};
          activity.schedule.forEach((scheduleItem: any) => {
            const dateStr = new Date(scheduleItem.date).toISOString().split('T')[0];
            // Extract free text (lines that don't match time slot patterns)
            const activitiesText = scheduleItem.activities || '';
            const lines = activitiesText.split('\n').filter((line: string) => {
              const trimmed = line.trim();
              return trimmed && 
                     !trimmed.includes('Buổi Sáng') && 
                     !trimmed.includes('Buổi Chiều') && 
                     !trimmed.includes('Buổi Tối') &&
                     !trimmed.includes('Địa điểm chi tiết:') &&
                     !trimmed.includes('Địa điểm map:');
            });
            schedules[dateStr] = lines.join('\n').trim();
          });
          setDaySchedules(schedules);
        }
      } else {
        console.error('API returned error:', result);
        setSubmitError(`Không thể tải dữ liệu hoạt động: ${result.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error loading activity:', error);
      setSubmitError(`Có lỗi xảy ra khi tải dữ liệu hoạt động: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  // Build schedule per day between startDate and endDate
  const datesInRange = useMemo(() => {
    if (!form.startDate || !form.endDate) return [];
    const start = new Date(`${form.startDate}T00:00:00.000Z`);
    const end = new Date(`${form.endDate}T00:00:00.000Z`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
    const days: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const y = cursor.getUTCFullYear();
      const m = String(cursor.getUTCMonth() + 1).padStart(2, '0');
      const d = String(cursor.getUTCDate()).padStart(2, '0');
      days.push(`${y}-${m}-${d}`);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return days;
  }, [form.startDate, form.endDate]);

  const [daySchedules, setDaySchedules] = useState<Record<string, string>>({});
  useEffect(() => {
    // Ensure schedule keys exist for all dates in range
    setDaySchedules(prev => {
      const next = { ...prev };
      datesInRange.forEach(d => {
        if (!(d in next)) next[d] = '';
      });
      // Remove dates no longer in range
      Object.keys(next).forEach(k => {
        if (!datesInRange.includes(k)) delete next[k];
      });
      return next;
    });
    // Initialize weeklyPlan for all dates in range
    setWeeklyPlan(prev => {
      const next = { ...prev };
      datesInRange.forEach(date => {
        if (!(date in next)) {
          next[date] = JSON.parse(JSON.stringify(defaultWeeklySlots));
        }
      });
      // Remove dates no longer in range
      Object.keys(next).forEach(k => {
        if (!datesInRange.includes(k)) delete next[k];
      });
      return next;
    });
  }, [datesInRange]);

  // Nhóm các ngày theo tuần
  const weeks = useMemo(() => {
    const result: Array<{ weekNumber: number; days: Array<{ date: string; dayIndex: number; dayKey: DayKey }> }> = [];
    datesInRange.forEach((date, idx) => {
      const weekNumber = Math.floor(idx / 7) + 1;
      const dayKey = getDayKeyFromDate(date);
      if (idx % 7 === 0) {
        result.push({ weekNumber, days: [] });
      }
      result[result.length - 1].days.push({ date, dayIndex: idx, dayKey });
    });
    return result;
  }, [datesInRange]);

  useEffect(() => {
    if (!isPerSlotMode) {
      setSelectedTimeSlotForLocation(null);
      return;
    }
    // Đồng bộ locationEditorDay với selectedDayKey khi selectedDayKey thay đổi
    setLocationEditorDay(selectedDayKey);
    const activeSlots = getActiveTimeSlotsForDay(selectedDayKey);
    setSelectedTimeSlotForLocation(prev => {
      if (prev && activeSlots.includes(prev)) return prev;
      return activeSlots[0] ?? null;
    });
  }, [isPerSlotMode, selectedDayKey, weeklyPlan]);

  // Reset currentWeekIndex khi khoảng ngày thay đổi
  useEffect(() => {
    setCurrentWeekIndex(0);
  }, [form.startDate, form.endDate]);

  // Tự động áp dụng địa điểm chung cho tất cả các buổi khi được chọn (chỉ trong PerSlot mode)
  useEffect(() => {
    if (!locationData || !isPerSlotMode) return;

    // PerSlot mode: tự động áp dụng cho tất cả các buổi đang bật
    // Kiểm tra xem có buổi nào chưa có địa điểm chung không
    const hasUnappliedSlots = datesInRange.some(date => {
      const slots = weeklyPlan[date] || [];
      const activeSlots = slots.filter(s => s.isActive);
      return activeSlots.some(slot => {
        const slotKey = slotIdToTimeSlotKey[slot.id];
        if (!slotKey) return false;
        const dayKey = getDayKeyFromDate(date);
        const slotLocation = (weeklySlotLocations[dayKey] || []).find(l => l.timeSlot === slotKey);
        return !slotLocation || 
               slotLocation.location.address !== locationData.address ||
               slotLocation.location.lat !== locationData.lat ||
               slotLocation.location.lng !== locationData.lng;
      });
    });

    if (hasUnappliedSlots) {
      applyLocationToSlots(locationData.address, 'all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationData?.address, locationData?.lat, locationData?.lng, isPerSlotMode]);

  // Helper function để format date
  const formatDateForDisplay = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

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

  const getTodayDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const selectedDaySummary = selectedDate ? getDaySummary(selectedDate) : { total: 3, active: 0 };
  const totalWeeklyActive = datesInRange.reduce((sum, date) => {
    const summary = getDaySummary(date);
    return sum + summary.active;
  }, 0);

  const formatDateLabel = (value?: string) => {
    if (!value) return null;
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return null;
    return `${day}/${month}/${year}`;
  };
  const startDateLabel = formatDateLabel(form.startDate);
  const endDateLabel = formatDateLabel(form.endDate);
  let durationDays: number | null = null;
  if (form.startDate && form.endDate) {
    const start = new Date(`${form.startDate}T00:00:00`);
    const end = new Date(`${form.endDate}T00:00:00`);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
      durationDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
  }
  const durationLabel = durationDays
    ? `${durationDays} ngày${durationDays >= 7 ? ` (${Math.ceil(durationDays / 7)} tuần)` : ''}`
    : 'Chưa xác định';

  const fieldLabelClass = `text-[10px] font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-300/90' : 'text-gray-500'}`;
  const fieldInputClass = `mt-1 w-full px-3 py-2 rounded-lg border-2 text-xs transition focus:outline-none ${
    isDarkMode
      ? 'bg-gray-900/60 border-gray-600/70 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/40 shadow-inner shadow-black/20'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-400/20'
  }`;
  const helperTextClass = `text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`;
  const chipBaseClass = `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border-2 transition ${isDarkMode ? 'bg-gray-900/50 border-gray-700/70 text-gray-200' : 'bg-white border-gray-300 text-gray-700 shadow-sm'}`;
  const fieldTileClass = `${isDarkMode ? 'bg-gray-900/70 border border-gray-600/60 shadow-lg shadow-black/25' : 'bg-white border-2 border-gray-300 shadow-lg'} rounded-xl p-3 transition hover:shadow-xl`;
  const fieldTitleClass = `text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`;
  const requiredMarkClass = `${isDarkMode ? 'text-red-300' : 'text-red-500'} text-xs ml-1 align-middle`;
  const formatCoordinate = (value?: number | null) => (typeof value === 'number' && !Number.isNaN(value) ? value.toFixed(6) : 'Chưa có');
  const quickLocationOptions = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_LOCATION_TEMPLATES.forEach((item) => set.add(item));
    if (locationData?.address) set.add(locationData.address);
    datesInRange.forEach((date) => {
      const slots = weeklyPlan[date] || [];
      slots.forEach((slot) => {
        if (slot.detailedLocation && slot.detailedLocation.trim().length > 0) {
          set.add(slot.detailedLocation.trim());
        }
        if (slot.locationAddress && slot.locationAddress.trim().length > 0) {
          set.add(slot.locationAddress.trim());
        }
      });
    });
    return Array.from(set);
  }, [locationData, weeklyPlan, datesInRange]);

  const renderLocationSummaryCard = () => {
    const wrapperClass = isDarkMode
      ? 'border-gray-700/60 bg-gray-900/80'
      : 'border-2 border-gray-300 bg-white';

    const summaryContent = () => {
      if (isGlobalMode) {
        if (!locationData) {
          return (
            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Chưa chọn địa điểm
            </div>
          );
        }
        return (
          <div className="text-xs">
            <div className={`rounded-lg px-2.5 py-1.5 mb-2 ${isDarkMode ? 'bg-green-900/20 text-green-100' : 'bg-green-50 text-green-700'}`}>
              {locationData.address}
            </div>
            <div className="flex gap-1.5 text-[10px]">
              <span className={`${chipBaseClass} px-2 py-0.5`}>Lat: {formatCoordinate(locationData.lat)}</span>
              <span className={`${chipBaseClass} px-2 py-0.5`}>Lng: {formatCoordinate(locationData.lng)}</span>
              <span className={`${chipBaseClass} px-2 py-0.5`}>{locationData.radius ?? 200}m</span>
            </div>
          </div>
        );
      }

      if (isPerDayMode) {
        const selectedDaysCount = dayKeyOrder.filter(day => !!dailyLocations[day]).length;
        return (
          <div className="text-xs">
            <div className={`rounded-lg px-2.5 py-1.5 mb-2 ${isDarkMode ? 'bg-purple-900/25 text-purple-100' : 'bg-purple-50 text-purple-700'}`}>
              Đã thiết lập {selectedDaysCount}/{dayKeyOrder.length} ngày
            </div>
            <div className="flex flex-wrap gap-1">
              {dayKeyOrder.map(day => {
                const hasLocation = !!dailyLocations[day];
                return (
                  <span key={`day-summary-${day}`} className={`px-2 py-0.5 rounded text-[10px] ${hasLocation ? (isDarkMode ? 'bg-green-500/30 text-green-200' : 'bg-green-100 text-green-700') : (isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                    {dayKeyToLabel[day]}: {hasLocation ? '✓' : '—'}
                  </span>
                );
              })}
            </div>
          </div>
        );
      }

      const slotLocationsCount = dayKeyOrder.reduce((sum, day) => sum + weeklySlotLocations[day].length, 0);
      return (
        <div className="text-xs">
          <div className={`rounded-lg px-2.5 py-1.5 ${isDarkMode ? 'bg-indigo-900/25 text-indigo-100' : 'bg-indigo-50 text-indigo-700'}`}>
            {slotLocationsCount > 0 ? `Đã gán ${slotLocationsCount}/${totalWeeklyActive} buổi` : 'Chưa gán địa điểm'}
          </div>
        </div>
      );
    };

    return (
      <div className={`rounded-xl border ${wrapperClass} p-3`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tổng quan</span>
        </div>
        {summaryContent()}
      </div>
    );
  };

  const renderGlobalModeContent = () => {
    if (!isGlobalMode) {
      return null;
    }

    return (
      <div className={`rounded-xl border-2 overflow-hidden ${isDarkMode ? 'border-blue-500/30 bg-gray-900/95' : 'border-gray-300 bg-white'} shadow-lg`}>
        <div className={`rounded-xl overflow-hidden ${isDarkMode ? 'border border-blue-500/30' : 'border-2 border-gray-300'}`} style={{ minHeight: '350px' }}>
          <OpenStreetMapPicker
            onLocationChange={handleLocationChange}
            initialLocation={locationData || undefined}
            isDarkMode={isDarkMode}
            enforceActiveTimeSlots={false}
            locationContext="global"
          />
        </div>

        {locationData && (
          <div className={`px-4 py-3 border-t-2 ${isDarkMode ? 'border-gray-700/50' : 'border-gray-300'}`}>
            <div className="grid gap-3 lg:grid-cols-[1fr_200px]">
              <div className={`rounded-xl p-3 bg-white ${isDarkMode ? 'border border-green-500/40 text-green-100' : 'border-2 border-gray-300 text-green-700'}`}>
                <div className="text-[11px] leading-relaxed mb-2 break-words">{locationData.address}</div>
                <div className="flex gap-1.5 text-[10px]">
                  <span className={`px-2 py-0.5 rounded ${isDarkMode ? 'bg-black/40 text-gray-100' : 'bg-white text-gray-700'}`}>
                    Lat: {formatCoordinate(locationData.lat)}
                  </span>
                  <span className={`px-2 py-0.5 rounded ${isDarkMode ? 'bg-black/40 text-gray-100' : 'bg-white text-gray-700'}`}>
                    Lng: {formatCoordinate(locationData.lng)}
                  </span>
                  <span className={`px-2 py-0.5 rounded ${isDarkMode ? 'bg-black/40 text-gray-100' : 'bg-white text-gray-700'}`}>
                    {locationData.radius ?? 200}m
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => applyLocationToSlots(locationData.address, 'all')}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition ${isDarkMode ? 'bg-blue-500/30 text-blue-50 border border-blue-500/50 hover:bg-blue-500/40' : 'bg-blue-500 text-white border border-blue-500 hover:bg-blue-600'}`}
                >
                  Áp dụng tất cả
                </button>
                <button
                  type="button"
                  onClick={() => applyLocationToSlots(locationData.address, selectedDayKey)}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition ${isDarkMode ? 'bg-purple-500/25 text-purple-100 border border-purple-500/50 hover:bg-purple-500/35' : 'bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200'}`}
                >
                  Áp dụng {dayKeyToLabel[selectedDayKey]}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPerDayModeContent = () => {
    if (!isPerDayMode) {
      return null;
    }

    // Get first date with this dayKey for summary
    const firstDateWithDayKey = datesInRange.find(d => getDayKeyFromDate(d) === dayLocationEditor);
    const selectedDaySummary = firstDateWithDayKey ? getDaySummary(firstDateWithDayKey) : { total: 3, active: 0 };
    const hasLocation = !!dailyLocations[dayLocationEditor];

    return (
      <div className="space-y-4">
        {/* Địa điểm theo ngày */}
      <div className={`rounded-xl border-2 overflow-hidden ${isDarkMode ? 'border-purple-500/30 bg-gray-900/95' : 'border-gray-300 bg-white'} shadow-lg`}>
        {/* Compact Header with Day Selector */}
        <div className={`px-4 py-3 border-b-2 ${isDarkMode ? 'border-gray-700/50' : 'border-gray-300'}`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Địa điểm theo ngày</span>
              {hasLocation && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${isDarkMode ? 'bg-green-500/30 text-green-200' : 'bg-green-100 text-green-700'}`}>
                  ✓ {dayKeyToLabel[dayLocationEditor]}
                </span>
              )}
            </div>
            {hasLocation && (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyDayLocationToAll(dayLocationEditor)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition flex items-center gap-1 ${isDarkMode ? 'bg-blue-500/25 text-blue-100 hover:bg-blue-500/35' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                >
                  <FileText size={12} strokeWidth={1.5} />
                  Sao chép
                </button>
                <button
                  type="button"
                  onClick={() => handleClearDayLocation(dayLocationEditor)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition ${isDarkMode ? 'bg-red-500/25 text-red-100 hover:bg-red-500/35' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                >
                  <XCircle size={12} strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dayKeyOrder.map((day) => {
              // Get first date with this dayKey for summary
              const firstDateWithDayKey = datesInRange.find(d => getDayKeyFromDate(d) === day);
              const summary = firstDateWithDayKey ? getDaySummary(firstDateWithDayKey) : { total: 3, active: 0 };
              const isSelected = dayLocationEditor === day;
              const hasDayLocation = !!dailyLocations[day];
              return (
                <button
                  key={`day-mode-${day}`}
                  type="button"
                  onClick={() => setDayLocationEditor(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition ${
                    isSelected
                      ? isDarkMode
                        ? 'bg-purple-600 text-white border-transparent'
                        : 'bg-purple-500 text-white border-transparent'
                      : isDarkMode
                        ? 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-purple-500/50'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{dayKeyToLabel[day]}</span>
                    {hasDayLocation && (
                      <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`}></span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      summary.active > 0
                        ? isSelected ? 'bg-white/20' : isDarkMode ? 'bg-green-500/30' : 'bg-green-100'
                        : isSelected ? 'bg-white/10' : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      {summary.active}/{summary.total}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Map and Info Side by Side */}
        <div className="grid lg:grid-cols-[1fr_280px] gap-4 p-4">
          {/* Map */}
          <div className={`rounded-xl overflow-hidden ${isDarkMode ? 'border border-purple-500/30' : 'border-2 border-gray-300'}`} style={{ minHeight: '350px' }}>
            <OpenStreetMapPicker
              key={`perday-map-${dayLocationEditor}-${dailyLocations[dayLocationEditor]?.address || 'none'}-${dailyLocations[dayLocationEditor]?.lat || '0'}-${dailyLocations[dayLocationEditor]?.lng || '0'}`}
              onLocationChange={(location) => {
                if (location && location.address) {
                  handleDayLocationSelect(dayLocationEditor, location);
                }
              }}
              initialLocation={dailyLocations[dayLocationEditor] || undefined}
              isDarkMode={isDarkMode}
              enforceActiveTimeSlots={false}
              locationContext="perDay"
              dayLabel={dayKeyToLabel[dayLocationEditor]}
            />
          </div>

          {/* Location Info - Compact */}
          <div className="space-y-3">
            {hasLocation ? (
              <div className={`rounded-xl p-3 bg-white ${isDarkMode ? 'border border-green-500/40 text-green-100' : 'border-2 border-gray-300 text-green-700'}`}>
                <div className="text-[11px] leading-relaxed mb-2 break-words font-semibold">{dailyLocations[dayLocationEditor]?.address}</div>
                <div className="space-y-1">
                  <div className={`rounded px-2 py-1 text-[10px] ${isDarkMode ? 'bg-black/40 text-gray-100' : 'bg-white text-gray-700'}`}>
                    Lat: {formatCoordinate(dailyLocations[dayLocationEditor]?.lat)}
                  </div>
                  <div className={`rounded px-2 py-1 text-[10px] ${isDarkMode ? 'bg-black/40 text-gray-100' : 'bg-white text-gray-700'}`}>
                    Lng: {formatCoordinate(dailyLocations[dayLocationEditor]?.lng)}
                  </div>
                  <div className={`rounded px-2 py-1 text-[10px] ${isDarkMode ? 'bg-black/40 text-gray-100' : 'bg-white text-gray-700'}`}>
                    {dailyLocations[dayLocationEditor]?.radius ?? 200}m
                  </div>
                </div>
              </div>
            ) : (
              <div className={`rounded-xl p-3 text-center border-2 bg-white ${isDarkMode ? 'border-gray-700/50 text-gray-400' : 'border-gray-300 text-gray-500'}`}>
                <div className="text-xs">Chưa chọn</div>
              </div>
            )}
            
            {/* Nút áp dụng cho tất cả các ngày */}
            {hasLocation && (
              <button
                type="button"
                onClick={() => handleCopyDayLocationToAll(dayLocationEditor)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 ${isDarkMode ? 'bg-blue-500/30 text-blue-50 border border-blue-500/50 hover:bg-blue-500/40' : 'bg-blue-500 text-white border border-blue-500 hover:bg-blue-600'}`}
              >
                <FileText size={14} strokeWidth={2} />
                <span>Áp dụng tất cả các ngày</span>
              </button>
            )}
          </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPerSlotModeContent = () => {
    if (!isPerSlotMode) {
      return null;
    }

    return (
      <div className="space-y-4">
        <div id="session-map-section" className={`rounded-xl border-2 ${isDarkMode ? 'border-gray-700/60 bg-gray-900/70' : 'border-gray-300 bg-white'} p-4 shadow-lg`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h3 className={`text-sm font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Địa điểm theo buổi</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Chọn địa điểm riêng cho từng buổi (Sáng/Chiều/Tối) của từng ngày trong tuần.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-5">
            <div className={`rounded-xl border-2 ${isDarkMode ? 'border-gray-700/60 bg-gray-900/60' : 'border-gray-300 bg-white'} p-4`}>
              {(() => {
                // Tìm date string cho locationEditorDay
                const currentWeekDays = weekInfo.currentWeek?.days || [];
                const editorDate = currentWeekDays.find(d => d.dayKey === locationEditorDay)?.date;
                const activeSlots = editorDate ? getActiveTimeSlotsForDay(editorDate) : [];
                return activeSlots.length === 0;
              })() ? (
                <div className={`text-center py-10 rounded-xl border-2 border-dashed ${isDarkMode ? 'border-gray-700 text-gray-400 bg-gray-900/50' : 'border-gray-300 text-gray-500 bg-white'}`}>
                  <div className="mb-3 flex justify-center">
                    <Clock size={32} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={1.5} />
                  </div>
                  <div className="text-xs font-medium">Chưa có buổi nào được kích hoạt trong {dayKeyToLabel[locationEditorDay]}.</div>
                  <div className="text-[10px] mt-1">Hãy bật buổi Sáng/Chiều/Tối trong phần &quot;Lịch tuần&quot; trước.</div>
                </div>
              ) : (() => {
                // Tìm date string cho locationEditorDay
                const currentWeekDays = weekInfo.currentWeek?.days || [];
                const editorDate = currentWeekDays.find(d => d.dayKey === locationEditorDay)?.date || datesInRange.find(d => getDayKeyFromDate(d) === locationEditorDay) || datesInRange[0];
                const activeSlots = editorDate ? getActiveTimeSlotsForDay(editorDate) : [];
                
                if (activeSlots.length === 0) {
                  return (
                    <div className={`text-center py-10 rounded-xl border-2 border-dashed ${isDarkMode ? 'border-gray-700 text-gray-400 bg-gray-900/50' : 'border-gray-300 text-gray-500 bg-white'}`}>
                      <div className="mb-3 flex justify-center">
                        <Clock size={32} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={1.5} />
                      </div>
                      <div className="text-xs font-medium">Chưa có buổi nào được kích hoạt trong {dayKeyToLabel[locationEditorDay]}.</div>
                      <div className="text-[10px] mt-1">Hãy bật buổi Sáng/Chiều/Tối trong phần &quot;Lịch tuần&quot; trước.</div>
                    </div>
                  );
                }
                
                return (
                <div className="space-y-4">
                  {/* Map picker cho buổi đã chọn */}
                  {selectedTimeSlotForLocation && (() => {
                    const timeSlotLabels: Record<TimeSlotKey, string> = {
                      morning: 'Buổi Sáng',
                      afternoon: 'Buổi Chiều',
                      evening: 'Buổi Tối',
                    };
                    const currentSlotLocation = weeklySlotLocations[locationEditorDay]?.find(l => l.timeSlot === selectedTimeSlotForLocation);
                    return (
                      <div>
                        <div className={`flex items-center justify-center gap-2 mb-3 py-3 px-4 rounded-lg ${
                          isDarkMode 
                            ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/40' 
                            : 'bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200'
                        }`}>
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                            isDarkMode 
                              ? 'bg-orange-500/30 border-2 border-orange-400/50' 
                              : 'bg-orange-100 border-2 border-orange-300'
                          }`}>
                            <Globe size={20} strokeWidth={2.5} className={isDarkMode ? 'text-orange-300' : 'text-orange-600'} />
                          </div>
                          <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Địa điểm {timeSlotLabels[selectedTimeSlotForLocation]} - {dayKeyToLabel[locationEditorDay]}
                          </span>
                        </div>
                        <div className={`rounded border overflow-hidden mb-1 ${isDarkMode ? 'border-orange-500/30' : 'border-gray-300'}`} style={{ minHeight: '180px' }}>
                          <OpenStreetMapPicker
                            key={`perslot-map-${locationEditorDay}-${selectedTimeSlotForLocation}-${currentSlotLocation?.location.address || 'none'}-${currentSlotLocation?.location.lat || '0'}-${currentSlotLocation?.location.lng || '0'}`}
                            onLocationChange={(location) => {
                              // Chỉ lưu địa điểm khi có địa chỉ đầy đủ (không chỉ là tọa độ)
                              // Điều này đảm bảo chỉ lưu sau khi người dùng nhấn "Chọn" trong modal xác nhận
                              if (location && location.address && selectedTimeSlotForLocation) {
                                // Địa chỉ đầy đủ sẽ có chữ cái (tên địa điểm), còn tọa độ chỉ có số
                                // Chỉ lưu nếu địa chỉ có chữ cái (địa chỉ đầy đủ)
                                const hasLetters = /[a-zA-ZÀ-ỹ]/.test(location.address.trim());
                                if (hasLetters) {
                                  handleSlotLocationSelect(locationEditorDay, selectedTimeSlotForLocation, location);
                                }
                              }
                            }}
                            initialLocation={currentSlotLocation ? {
                              lat: currentSlotLocation.location.lat,
                              lng: currentSlotLocation.location.lng,
                              address: currentSlotLocation.location.address,
                              radius: currentSlotLocation.radius || 200,
                            } : undefined}
                            isDarkMode={isDarkMode}
                            enforceActiveTimeSlots={false}
                            locationContext="perSlot"
                            slotLabel={timeSlotLabels[selectedTimeSlotForLocation]}
                          />
                        </div>
                        {currentSlotLocation && (
                          <div className="space-y-1 mt-2">
                            <div className={`rounded border px-1.5 py-1 text-[10px] ${isDarkMode ? 'border-green-500/30 bg-green-500/10 text-green-200' : 'border-green-300 bg-green-50 text-green-700'}`}>
                              <div className="font-semibold flex items-center gap-0.5 mb-0.5">
                                <MapPin size={9} strokeWidth={2} />
                                <span className="truncate">{currentSlotLocation.location.address}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[9px] opacity-80">
                                <span>{formatCoordinate(currentSlotLocation.location.lat)}, {formatCoordinate(currentSlotLocation.location.lng)}</span>
                                <span>•</span>
                                <span>{currentSlotLocation.radius ?? 200}m</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const slotId = timeSlotKeyToSlotId[selectedTimeSlotForLocation];
                                if (slotId) {
                                  handleClearSlotLocation(locationEditorDay, slotId);
                                }
                              }}
                              className={`w-full px-2 py-1 rounded text-[10px] font-semibold transition flex items-center justify-center gap-1 ${
                                isDarkMode 
                                  ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30' 
                                  : 'bg-red-50 text-red-600 hover:bg-red-100'
                              }`}
                            >
                              <XCircle size={10} strokeWidth={2} />
                              <span>Xóa địa điểm</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsLoading(true);
    try {
      if (!form.name.trim()) throw new Error('Tên hoạt động là bắt buộc');
      if (!form.description.trim()) throw new Error('Mô tả hoạt động là bắt buộc');
      if (!form.startDate) throw new Error('Ngày bắt đầu là bắt buộc');
      if (!form.endDate) throw new Error('Ngày kết thúc là bắt buộc');
      const start = new Date(`${form.startDate}T00:00:00.000Z`);
      const end = new Date(`${form.endDate}T00:00:00.000Z`);
      if (start > end) throw new Error('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
      if (datesInRange.length === 0) throw new Error('Khoảng ngày không hợp lệ');
      
      // Validate registrationThreshold: must be between 0 and 100
      if (form.registrationThreshold && form.registrationThreshold.trim() !== '') {
        const thresholdValue = parseInt(form.registrationThreshold);
        if (isNaN(thresholdValue) || thresholdValue < 0 || thresholdValue > 100) {
          throw new Error('Ngưỡng đăng ký tối thiểu phải từ 0 đến 100%');
        }
      }
      
      // Validate địa điểm theo từng mode
      if (isGlobalMode) {
        if (!locationData && !form.location.trim()) {
          throw new Error('Vui lòng chọn địa điểm trên bản đồ');
        }
      } else if (isPerDayMode) {
        // Chỉ kiểm tra các ngày có buổi active
        const daysWithActiveSessions = datesInRange.filter(date => 
          (weeklyPlan[date] || []).some(s => s.isActive)
        );
        const hasDayLocation = daysWithActiveSessions.some(date => {
          const dayKey = getDayKeyFromDate(date);
          const dayLocation = dailyLocations[dayKey];
          return dayLocation && dayLocation.address && dayLocation.address.trim() !== '';
        });
        if (daysWithActiveSessions.length > 0 && !hasDayLocation) {
          throw new Error('Vui lòng chọn địa điểm cho ít nhất một ngày có buổi hoạt động');
        }
      } else if (isPerSlotMode) {
        // Chỉ kiểm tra các buổi active
        const hasSlotLocation = datesInRange.some(date => {
          const slots = weeklyPlan[date] || [];
          const activeSlotIds = slots
            .filter(s => s.isActive)
            .map(s => s.id);
          if (activeSlotIds.length === 0) return false;
          
          const dayKey = getDayKeyFromDate(date);
          const slotLocations = weeklySlotLocations[dayKey] || [];
          // Kiểm tra xem có ít nhất một buổi active có địa điểm không
          return activeSlotIds.some(slotId => {
            const slotKey = slotIdToTimeSlotKey[slotId];
            if (!slotKey) return false;
            const slotLocation = slotLocations.find(sl => sl.timeSlot === slotKey);
            return slotLocation && 
                   slotLocation.location && 
                   slotLocation.location.address && 
                   slotLocation.location.address.trim() !== '';
          });
        });
        if (!hasSlotLocation) {
          throw new Error('Vui lòng chọn địa điểm cho ít nhất một buổi đã kích hoạt');
        }
      }
      
      // Validation for responsiblePerson is done later in the code before creating activityData

      // Validate weekly sessions: at least one active slot and time validity for active slots
      const hasAnyActiveSession = datesInRange.some((date) => (weeklyPlan[date] || []).some((s) => s.isActive));
      if (!hasAnyActiveSession) {
        throw new Error('Vui lòng bật ít nhất một buổi trong tuần (Sáng/Chiều/Tối)');
      }
      // Validate time ranges for active slots (end > start)
      const invalidTimeErrors: string[] = [];
      datesInRange.forEach((date) => {
        const slots = weeklyPlan[date] || [];
        slots.forEach((s) => {
          if (s.isActive && s.startTime && s.endTime) {
            const st = new Date(`2000-01-01T${s.startTime}`);
            const et = new Date(`2000-01-01T${s.endTime}`);
            if (!(st instanceof Date) || isNaN(st.getTime()) || !(et instanceof Date) || isNaN(et.getTime())) {
              invalidTimeErrors.push(`${formatDateForDisplay(date)} • ${s.name}: Thời gian không hợp lệ`);
            } else if (et <= st) {
              invalidTimeErrors.push(`${formatDateForDisplay(date)} • ${s.name}: Giờ kết thúc phải sau giờ bắt đầu`);
            }
          }
        });
      });
      if (invalidTimeErrors.length > 0) {
        throw new Error(`Kiểm tra thời gian các buổi:\n- ${invalidTimeErrors.join('\n- ')}`);
      }

      // Upload image if selected
      let imageUrl = form.imageUrl;
      if (selectedImage) {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        const fd = new FormData();
        fd.append('activityImage', selectedImage);
        const uploadRes = await fetch('/api/upload/activity-image', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd
        });
        if (!uploadRes.ok) {
          throw new Error('Lỗi khi tải ảnh lên Cloudinary');
        }
        const uploadJson = await uploadRes.json();
        imageUrl = uploadJson.url;
      }

      // Build schedule payload using weekly sessions (Mon-Sun) + free text
      // First, validate activities length for each day
      const scheduleValidationErrors: Array<{ date: string; length: number; maxLength: number }> = [];
      datesInRange.forEach((d) => {
        const slots = weeklyPlan[d] || [];
        const activeLines = slots
          .filter(s => s && s.isActive)
          .map(s => {
            const parts: string[] = [];
            parts.push(`${s.name} (${s.startTime}-${s.endTime})`);
            if (s.activities && s.activities.trim()) {
              parts.push(`- ${s.activities.trim()}`);
            }
            if (s.detailedLocation && s.detailedLocation.trim()) {
              parts.push(`- Địa điểm chi tiết: ${s.detailedLocation.trim()}`);
            }
            if (s.locationAddress) {
              const coords =
                typeof s.locationLat === 'number' && typeof s.locationLng === 'number'
                  ? ` (${s.locationLat.toFixed(5)}, ${s.locationLng.toFixed(5)})`
                  : '';
              const radiusText =
                typeof s.locationRadius === 'number' ? ` - Bán kính: ${s.locationRadius}m` : '';
              parts.push(`- Địa điểm map: ${s.locationAddress}${coords}${radiusText}`);
            }
            return parts.join(' ');
          });
        
        // Add location information based on mode
        const dayLocationLines: string[] = [];
        
        if (isPerDayMode) {
          const dayKey = getDayKeyFromDate(d);
          const dayLocation = dailyLocations[dayKey];
          const dayDetailedLocation = perDayDetailedLocation[dayKey];
          
          if (dayLocation && dayLocation.address) {
            const coords = dayLocation.lat && dayLocation.lng
              ? ` (${dayLocation.lat.toFixed(5)}, ${dayLocation.lng.toFixed(5)})`
              : '';
            const radiusText = dayLocation.radius ? ` - Bán kính: ${dayLocation.radius}m` : '';
            dayLocationLines.push(`Địa điểm map: ${dayLocation.address}${coords}${radiusText}`);
          }
          if (dayDetailedLocation && dayDetailedLocation.trim()) {
            dayLocationLines.push(`Địa điểm chi tiết: ${dayDetailedLocation.trim()}`);
          }
        } else if (isPerSlotMode) {
          const dayKey = getDayKeyFromDate(d);
          const slotLocations = weeklySlotLocations[dayKey] || [];
          slotLocations.forEach(slotLoc => {
            if (slotLoc.location && slotLoc.location.address) {
              const coords = slotLoc.location.lat && slotLoc.location.lng
                ? ` (${slotLoc.location.lat.toFixed(5)}, ${slotLoc.location.lng.toFixed(5)})`
                : '';
              const radiusText = slotLoc.radius ? ` - Bán kính: ${slotLoc.radius}m` : '';
              dayLocationLines.push(`${slotLoc.timeSlot === 'morning' ? 'Buổi Sáng' : slotLoc.timeSlot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối'}: Địa điểm map: ${slotLoc.location.address}${coords}${radiusText}`);
            }
          });
        }
        
        // Also include freeText from daySchedules (if exists)
        const freeText = daySchedules[d] || '';
        const allLines = [...activeLines, ...dayLocationLines, freeText].filter(Boolean);
        const activitiesText = allLines.join('\n');
        const activitiesLength = activitiesText.length;
        const maxLength = 1000;
        
        if (activitiesLength > maxLength) {
          scheduleValidationErrors.push({
            date: d,
            length: activitiesLength,
            maxLength: maxLength
          });
        }
      });
      
      // If there are validation errors, show them and prevent submit
      if (scheduleValidationErrors.length > 0) {
        const errorMessages = scheduleValidationErrors.map(err => {
          const dateObj = new Date(err.date);
          const formattedDate = dateObj.toLocaleDateString('vi-VN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          return `${formattedDate} (${err.length}/${err.maxLength} ký tự)`;
        });
        throw new Error(`Mô tả hoạt động vượt quá ${scheduleValidationErrors[0].maxLength} ký tự ở các ngày sau:\n${errorMessages.map(msg => `• ${msg}`).join('\n')}\n\nVui lòng rút ngắn nội dung hoặc chia nhỏ thông tin.`);
      }
      
      const schedule: Array<{ day: number; date: string | Date; activities: string }> = datesInRange.map((d, idx) => {
        const slots = weeklyPlan[d] || [];
        const activeLines = slots
          .filter(s => s && s.isActive)
          .map(s => {
            const parts: string[] = [];
            parts.push(`${s.name} (${s.startTime}-${s.endTime})`);
            if (s.activities && s.activities.trim()) {
              parts.push(`- ${s.activities.trim()}`);
            }
            if (s.detailedLocation && s.detailedLocation.trim()) {
              parts.push(`- Địa điểm chi tiết: ${s.detailedLocation.trim()}`);
            }
            if (s.locationAddress) {
              const coords =
                typeof s.locationLat === 'number' && typeof s.locationLng === 'number'
                  ? ` (${s.locationLat.toFixed(5)}, ${s.locationLng.toFixed(5)})`
                  : '';
              const radiusText =
                typeof s.locationRadius === 'number' ? ` - Bán kính: ${s.locationRadius}m` : '';
              parts.push(`- Địa điểm map: ${s.locationAddress}${coords}${radiusText}`);
            }
            return parts.join(' ');
          });
        
        // Add location information based on mode
        const dayLocationLines: string[] = [];
        
        if (isPerDayMode) {
          // PerDay mode: Add location for this specific day
          const dayKey = getDayKeyFromDate(d);
          const dayLocation = dailyLocations[dayKey];
          const dayDetailedLocation = perDayDetailedLocation[dayKey];
          
          // Add detailed location for the day if exists
          if (dayDetailedLocation && dayDetailedLocation.trim()) {
            dayLocationLines.push(`Địa điểm chi tiết: ${dayDetailedLocation.trim()}`);
          }
          
          // Add map location for the day if exists
          if (dayLocation && dayLocation.address) {
            const coords =
              typeof dayLocation.lat === 'number' && typeof dayLocation.lng === 'number'
                ? ` (${dayLocation.lat.toFixed(5)}, ${dayLocation.lng.toFixed(5)})`
                : '';
            const radiusText =
              typeof dayLocation.radius === 'number' ? ` - Bán kính: ${dayLocation.radius}m` : '';
            dayLocationLines.push(`Địa điểm map: ${dayLocation.address}${coords}${radiusText}`);
          }
        } else if (isGlobalMode) {
          // Global mode: Add global detailed location if exists
          if (globalDetailedLocation && globalDetailedLocation.trim()) {
            dayLocationLines.push(`Địa điểm chi tiết: ${globalDetailedLocation.trim()}`);
          }
        }
        
        const freeText = daySchedules[d] || '';
        const allLines = [...activeLines, ...dayLocationLines, freeText].filter(Boolean);
        const activities = allLines.join('\n');
        // Format date as ISO string to ensure proper serialization
        const dateObj = new Date(`${d}T00:00:00.000Z`);
        return {
          day: idx + 1,
          date: dateObj.toISOString(),
          activities
        };
      });

      // Validation for activities length is already done above (before building schedule)
      // No need to validate again here

      const locationLabel = isPerSlotMode
        ? 'Địa điểm theo buổi'
        : isPerDayMode
          ? 'Địa điểm theo ngày'
          : (form.location && form.location.trim())
            ? form.location
            : (locationData ? locationData.address : '');

      // Parse registrationThreshold - handle empty string, null, undefined, but allow 0
      // Ensure value is between 0 and 100
      let registrationThresholdValue = 80;
      const thresholdStr = form.registrationThreshold?.toString().trim() || '';
      
      if (thresholdStr !== '') {
        const parsedValue = parseInt(thresholdStr, 10);
        
        if (!isNaN(parsedValue)) {
          registrationThresholdValue = Math.max(0, Math.min(100, parsedValue)); // Clamp between 0 and 100
        }
      }

      // Ensure responsiblePerson is valid array with at least one item
      if (!form.responsiblePerson || !Array.isArray(form.responsiblePerson) || form.responsiblePerson.length === 0) {
        throw new Error('Vui lòng chọn ít nhất một người phụ trách');
      }

      // Filter out empty strings and validate again
      const filteredResponsiblePerson = form.responsiblePerson.filter(id => id && typeof id === 'string' && id.trim() !== '');
      if (filteredResponsiblePerson.length === 0) {
        throw new Error('Vui lòng chọn ít nhất một người phụ trách hợp lệ');
      }

      const activityData = {
        name: form.name.trim(),
        description: form.description.trim(),
        location: locationLabel,
        locationData: isGlobalMode && locationData ? {
          lat: locationData.lat,
          lng: locationData.lng,
          address: locationData.address,
          radius: locationData.radius
        } : undefined,
        maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants) : undefined,
        registrationThreshold: registrationThresholdValue,
        visibility: form.visibility,
        responsiblePerson: filteredResponsiblePerson, // Use filtered array
        status: form.status,
        type: 'multiple_days' as const,
        imageUrl: imageUrl || undefined,
        overview: form.overview ? form.overview.trim() : undefined,
        startDate: form.startDate ? `${form.startDate}T00:00:00.000Z` : undefined, // ISO string format
        endDate: form.endDate ? `${form.endDate}T00:00:00.000Z` : undefined, // ISO string format
        schedule
      };

      const token = localStorage.getItem('token');
      if (!token) throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');

      // Submit to API - use PUT for edit, POST for create
      const url = isEditMode ? `/api/activities/${activityId}` : '/api/activities';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(activityData)
      });
      
      if (!res.ok) {
        let responseText = '';
        try {
          responseText = await res.text();
          const errJson = responseText ? JSON.parse(responseText) : null;
          if (errJson?.details && Array.isArray(errJson.details)) {
            // Loại bỏ các lỗi trùng lặp
            const uniqueErrors = Array.from(new Set(errJson.details));
            throw new Error(`Dữ liệu không hợp lệ: ${uniqueErrors.join(', ')}`);
          }
          throw new Error(errJson?.error || errJson?.message || `Failed to ${isEditMode ? 'update' : 'create'} activity`);
        } catch (parseErr: any) {
          if (parseErr.message && parseErr.message.includes('Dữ liệu không hợp lệ')) {
            throw parseErr;
          }
          throw new Error(`HTTP ${res.status}: ${res.statusText}. Response: ${responseText.substring(0, 200)}`);
        }
      }
      
      const result = await res.json();
      
      setSuccessMessage(`Hoạt động nhiều ngày đã được ${isEditMode ? 'cập nhật' : 'tạo'} thành công!`);
      setShowSuccessModal(true);
      
      // Reload activity data after successful update to reflect changes
      if (isEditMode && activityId) {
        await loadActivityData(activityId);
      }

      // Only reset form if creating new activity
      if (!isEditMode) {
      setForm({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        location: '',
        maxParticipants: '',
        registrationThreshold: '80',
        visibility: 'public',
        responsiblePerson: [],
        status: 'draft',
        imageUrl: '',
        overview: ''
      });
      setLocationData(null);
      setSelectedImage(null);
      setImagePreview('');
      setDaySchedules({});
      setWeeklyPlan({});
      setWeeklySlotLocations(createEmptyLocationState());
      setDailyLocations(createEmptyDailyLocations());
      setLocationMode('global');
      setLocationEditorDay('mon');
      setDayLocationEditor('mon');
      setSelectedTimeSlotForLocation(null);
      } else {
        // In edit mode, update form.imageUrl with new image URL if uploaded
        if (selectedImage && imageUrl) {
          setForm(prev => ({
            ...prev,
            imageUrl: imageUrl
          }));
          setImagePreview(imageUrl);
        }
        // Reset selectedImage after successful upload in edit mode
        setSelectedImage(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Có lỗi xảy ra khi ${isEditMode ? 'cập nhật' : 'tạo'} hoạt động nhiều ngày`;
      setSubmitError(msg);
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner when loading activity data in edit mode
  if (isLoadingActivity) {
    return (
      <ProtectedRoute requiredRole="CLUB_LEADER">
        <div 
          className={`min-h-screen flex flex-col overflow-x-hidden ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900'}`}
          style={{
            '--sidebar-width': isSidebarOpen ? '288px' : '80px'
          } as React.CSSProperties}
        >
          <AdminNav />
          <main 
            className="flex-1 flex items-center justify-center transition-all duration-300 overflow-x-hidden min-w-0"
            style={{
              marginLeft: isDesktop ? (isSidebarOpen ? '288px' : '80px') : '0',
              width: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%',
              maxWidth: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%'
            }}
          >
            <div className="text-center">
              <LoadingSpinner />
              <p className={`mt-4 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Đang tải dữ liệu hoạt động...
              </p>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="CLUB_LEADER">
      <div
        className={`min-h-screen flex flex-col overflow-x-hidden ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900'}`}
        style={{
          '--sidebar-width': isSidebarOpen ? '288px' : '80px'
        } as React.CSSProperties}
      >
        <AdminNav />
        <main
          className="flex-1 transition-all duration-300 overflow-x-hidden min-w-0"
          style={{
            marginLeft: isDesktop ? (isSidebarOpen ? '288px' : '80px') : '0',
            width: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%',
            maxWidth: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%'
          }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="text-center mb-4">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full mb-2 bg-white ${isDarkMode ? 'border border-blue-500/30' : 'border-2 border-gray-300'}`}>
                <Calendar size={20} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={1.5} />
              </div>
              <h1 className={`text-xl font-bold mb-1.5 bg-gradient-to-r ${isDarkMode ? 'from-blue-400 to-purple-400' : 'from-blue-600 to-purple-600'} bg-clip-text text-transparent`}>
                {isEditMode ? 'Chỉnh Sửa Hoạt Động Nhiều Ngày' : 'Tạo Hoạt Động Nhiều Ngày'}
              </h1>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {isEditMode ? 'Chỉnh sửa thông tin hoạt động nhiều ngày' : 'Thiết lập khoảng ngày, lịch trình từng ngày và địa điểm'}
              </p>
            </div>

            {submitError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-800">{submitError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Ảnh mô tả hoạt động */}
              <div className={`p-4 rounded-xl bg-white ${isDarkMode ? 'border border-gray-700/50' : 'border-2 border-gray-300'} shadow-lg`}>
                <div className="mb-3">
                  <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>1. Ảnh mô tả hoạt động</h2>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Chọn ảnh đại diện (tùy chọn)</p>
                </div>
                <div className={`relative overflow-hidden rounded-xl bg-white ${isDarkMode ? 'border border-gray-600/50' : 'border-2 border-gray-300'}`}>
                  {!selectedImage && !form.imageUrl ? (
                    <>
                      <input type="file" accept="image/*" onChange={handleImageSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <div className="p-6 text-center flex flex-col items-center gap-2">
                        <ImageUp size={48} strokeWidth={1.5} className={isDarkMode ? 'text-gray-400' : 'text-gray-400'} />
                        <div className="text-xs">Kéo & thả ảnh vào đây hoặc click để chọn file (≤10MB)</div>
                      </div>
                    </>
                  ) : (
                    <div className="relative">
                      {!!(imagePreview || form.imageUrl) && (
                        <div className="relative group">
                          <img 
                            src={imagePreview || form.imageUrl} 
                            alt="Preview" 
                            className="w-full object-cover transition-all duration-300"
                            style={{ height: `${imageHeight}px` }}
                          />
                          {/* Control panel - Đơn giản */}
                          <div className={`absolute bottom-3 right-3 p-2 rounded-lg shadow-lg z-20 ${
                            isDarkMode 
                              ? 'bg-gray-900/90 backdrop-blur-sm' 
                              : 'bg-white/90 backdrop-blur-sm'
                          }`}>
                            <div className="flex items-center gap-2 min-w-[150px]">
                              <ZoomIn size={14} strokeWidth={2} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                              <input
                                type="range"
                                min="100"
                                max="600"
                                step="10"
                                value={imageHeight}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setImageHeight(Number(e.target.value));
                                }}
                                className={`flex-1 h-1.5 rounded-lg appearance-none cursor-pointer ${
                                  isDarkMode 
                                    ? 'bg-gray-700 accent-blue-500' 
                                    : 'bg-gray-200 accent-blue-600'
                                }`}
                              />
                              <span className={`text-[10px] font-medium min-w-[3rem] text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {imageHeight}px
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className={`p-3 flex items-center justify-between relative z-20 border-t ${
                        isDarkMode ? 'border-gray-700/50 bg-gray-800/30' : 'border-gray-200 bg-gray-50/50'
                      }`}>
                        <div className="flex items-center gap-2">
                          <ImageIcon size={14} strokeWidth={2} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                          <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {selectedImage ? selectedImage.name : 'Ảnh hiện tại'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowCropModal(true);
                              setCrop({ x: 0, y: 0 });
                              setZoom(1);
                              setCroppedAreaPixels(null);
                            }} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                              isDarkMode 
                                ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30' 
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                            }`}
                          >
                            <Scissors size={14} strokeWidth={2} />
                            <span>Cắt ảnh</span>
                          </button>
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage();
                            }} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                              isDarkMode 
                                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30' 
                                : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                            }`}
                          >
                            <XCircle size={14} strokeWidth={2} />
                            <span>Xóa ảnh</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Thông tin cơ bản */}
              <div className={`p-4 rounded-xl bg-white ${isDarkMode ? 'border border-gray-700/60' : 'border-2 border-gray-300'} shadow-lg`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                  <div>
                    <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>2. Thông tin cơ bản</h2>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-300/90' : 'text-gray-600'}`}>Thiết lập tên, phạm vi và thời gian hoạt động.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`${chipBaseClass} ${isDarkMode ? 'border-blue-500/40 bg-blue-500/15 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-600'}`}>Ngày bắt đầu: {startDateLabel ?? 'Chưa chọn'}</span>
                    <span className={`${chipBaseClass} ${isDarkMode ? 'border-purple-500/40 bg-purple-500/15 text-purple-200' : 'border-purple-200 bg-purple-50 text-purple-600'}`}>Ngày kết thúc: {endDateLabel ?? 'Chưa chọn'}</span>
                    <span className={`${chipBaseClass} ${isDarkMode ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-600'}`}>Thời lượng: {durationLabel}</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <div className={`${fieldTileClass} md:col-span-2 xl:col-span-3`}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={1.5} />
                      <span className={fieldTitleClass}>
                        Tên hoạt động
                        <span className={requiredMarkClass}>*</span>
                      </span>
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className={fieldInputClass}
                      placeholder="VD: Chuỗi hoạt động thiện nguyện mùa hè"
                    />
                    <p className={`mt-1.5 ${helperTextClass}`}>Tên hiển thị trên trang chi tiết và thông báo.</p>
                  </div>

                  <div className={fieldTileClass}>
                    <div className="flex items-center gap-2 mb-2">
                      <Users size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={1.5} />
                      <span className={fieldTitleClass}>Số lượng tối đa</span>
                    </div>
                    <input
                      type="number"
                      name="maxParticipants"
                      value={form.maxParticipants}
                      onChange={handleChange}
                      min="1"
                      max="1000"
                      className={fieldInputClass}
                      placeholder="VD: 120"
                    />
                    <p className={`mt-2 ${helperTextClass}`}>Để trống nếu không giới hạn số lượng tham gia.</p>
                  </div>

                  <div className={`${fieldTileClass} ${isDarkMode ? 'bg-gradient-to-br from-orange-900/20 to-amber-900/10 border-orange-500/30' : 'bg-gradient-to-br from-orange-50/80 to-amber-50/60 border-orange-200/50'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                          <Target size={16} className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} strokeWidth={2} />
                        </div>
                        <span className={`${fieldTitleClass} font-bold ${isDarkMode ? 'text-orange-200' : 'text-orange-700'}`}>Ngưỡng đăng ký tối thiểu</span>
                      </div>
                      {form.registrationThreshold && (
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          parseInt(form.registrationThreshold) >= 80
                            ? isDarkMode ? 'bg-green-500/30 text-green-200 border border-green-500/50' : 'bg-green-100 text-green-700 border border-green-300'
                            : isDarkMode ? 'bg-yellow-500/30 text-yellow-200 border border-yellow-500/50' : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                        }`}>
                          {form.registrationThreshold}%
                        </div>
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-200'}`}>
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            parseInt(form.registrationThreshold || '0') >= 80
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                              : parseInt(form.registrationThreshold || '0') >= 50
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                              : 'bg-gradient-to-r from-red-500 to-pink-500'
                          }`}
                          style={{ width: `${Math.min(parseInt(form.registrationThreshold || '0'), 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Input và Quick Select */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="registrationThreshold"
                          value={form.registrationThreshold}
                          onChange={handleChange}
                          min="0"
                          max="100"
                          className={`flex-1 px-3 py-2.5 rounded-lg border-2 text-sm font-semibold text-center ${
                            isDarkMode 
                              ? 'bg-gray-800/60 border-orange-500/50 text-white placeholder-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/30' 
                              : 'bg-white border-orange-300 text-gray-900 placeholder-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20'
                          } focus:outline-none transition-all duration-300`}
                          placeholder="80"
                        />
                        <span className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>%</span>
                      </div>

                      {/* Quick Select Buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-medium mr-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chọn nhanh:</span>
                        {[50, 70, 80, 90, 100].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, registrationThreshold: value.toString() }))}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all duration-200 ${
                              form.registrationThreshold === value.toString()
                                ? isDarkMode
                                  ? 'bg-orange-500 text-white shadow-md scale-105'
                                  : 'bg-orange-500 text-white shadow-md scale-105'
                                : isDarkMode
                                ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600/50'
                                : 'bg-white text-gray-600 hover:bg-orange-50 border border-gray-300'
                            }`}
                          >
                            {value}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Info Text */}
                    <div className={`mt-3 p-2.5 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                      <div className="flex items-start gap-2">
                        <Info size={14} className={`mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`} strokeWidth={2} />
                        <p className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                          Sinh viên phải đăng ký <strong>≥{form.registrationThreshold || '80'}%</strong> tổng số buổi mới được tham gia hoạt động này.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={fieldTileClass}>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={1.5} />
                      <span className={fieldTitleClass}>
                        Ngày bắt đầu
                        <span className={requiredMarkClass}>*</span>
                      </span>
                    </div>
                    <input
                      type="date"
                      name="startDate"
                      value={form.startDate}
                      onChange={handleChange}
                      required
                      min={getTodayDate()}
                      className={fieldInputClass}
                    />
                    <p className={`mt-1.5 ${helperTextClass}`}>Lịch tuần dựa trên khoảng ngày này.</p>
                  </div>

                  <div className={fieldTileClass}>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={1.5} />
                      <span className={fieldTitleClass}>
                        Ngày kết thúc
                        <span className={requiredMarkClass}>*</span>
                      </span>
                    </div>
                    <input
                      type="date"
                      name="endDate"
                      value={form.endDate}
                      onChange={handleChange}
                      required
                      min={form.startDate || getTodayDate()}
                      className={fieldInputClass}
                    />
                    <p className={`mt-1.5 ${helperTextClass}`}>Không được trước ngày bắt đầu.</p>
                  </div>

                  <div className={fieldTileClass}>
                    <div className="flex items-center gap-2 mb-2">
                      <Users size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={1.5} />
                      <span className={fieldTitleClass}>
                        Quyền truy cập
                        <span className={requiredMarkClass}>*</span>
                      </span>
                    </div>
                    <select
                      name="visibility"
                      value={form.visibility}
                      onChange={handleChange}
                      required
                      className={fieldInputClass}
                    >
                      <option value="public">Public - Tất cả đều xem được</option>
                      <option value="private">Private - Chỉ thành viên CLB</option>
                    </select>
                    <p className={`mt-1.5 ${helperTextClass}`}>Quy định ai có thể thấy hoạt động.</p>
                  </div>

                  <div className={fieldTileClass}>
                    <div className="flex items-center gap-2 mb-2">
                      <Info size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={1.5} />
                      <span className={fieldTitleClass}>
                        Trạng thái
                        <span className={requiredMarkClass}>*</span>
                      </span>
                    </div>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      required
                      className={fieldInputClass}
                    >
                      <option value="draft">Nháp</option>
                      <option value="published">Đã xuất bản</option>
                      {isEditMode && (
                        <>
                          <option value="ongoing">Đang diễn ra</option>
                          <option value="completed">Đã hoàn thành</option>
                          <option value="cancelled">Đã hủy</option>
                          <option value="postponed">Hoãn lại</option>
                        </>
                      )}
                    </select>
                    <p className={`mt-1.5 ${helperTextClass}`}>
                      {isEditMode 
                        ? 'Chọn trạng thái phù hợp với tình trạng hiện tại của hoạt động.'
                        : 'Chọn Nháp để lưu tạm, Đã xuất bản để công bố ngay.'}
                    </p>
                  </div>

                  <div className={`${fieldTileClass} md:col-span-2 xl:col-span-3`}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={1.5} />
                      <span className={fieldTitleClass}>
                        Mô tả hoạt động
                        <span className={requiredMarkClass}>*</span>
                      </span>
                    </div>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      required
                      rows={4}
                      className={`${fieldInputClass} min-h-[110px] resize-y`}
                      placeholder="Tóm tắt mục tiêu, đối tượng và nội dung chính cho hoạt động..."
                    />
                    <p className={`mt-2 ${helperTextClass}`}>Nên mô tả 2-3 câu để rõ phạm vi hoạt động.</p>
                  </div>
                </div>
              </div>

              {/* 3. Lịch theo tuần - Layout compact */}
              <div className={`p-3 rounded-lg bg-white ${isDarkMode ? 'border border-gray-700/60' : 'border-2 border-gray-300'} shadow-lg`}>
                {/* Header compact */}
                <div className={`mb-3 flex items-center justify-between flex-wrap gap-2`}>
                  <div>
                    <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>3. Lịch tuần đa buổi & Địa điểm</h2>
                    <p className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Quản lý buổi Sáng • Chiều • Tối</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${isDarkMode ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-50 text-blue-700'}`}>
                    <CheckCircle2 size={12} strokeWidth={2} />
                    <span>{totalWeeklyActive} buổi</span>
                  </div>
                </div>

                {/* Location Mode Selector - Compact */}
                <div className={`mb-3 rounded-lg border ${isDarkMode ? 'border-gray-700/60 bg-gray-900/50' : 'border-gray-300 bg-gray-50'} p-2`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <MapPin size={14} strokeWidth={2} className={isDarkMode ? 'text-purple-300' : 'text-purple-600'} />
                    <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Chế độ địa điểm</span>
                  </div>
                  <div className={`rounded ${isDarkMode ? 'bg-gray-800/50' : 'bg-white border border-gray-200'} p-1`}>
                    <div className="grid grid-cols-3 gap-1">
                      {locationModeOptions.map(option => {
                        const isActive = option.value === locationMode;
                        return (
                            <button
                            key={option.value}
                              type="button"
                            onClick={() => setLocationMode(option.value)}
                            className={`relative rounded px-2 py-1.5 text-left transition-all ${
                              isActive
                                ? isDarkMode
                                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md'
                                  : 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-sm'
                                : isDarkMode
                                  ? 'bg-transparent text-gray-300 hover:bg-gray-700/50'
                                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              {getLocationModeIcon(option.value)}
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-[11px]">{option.label}</div>
                              </div>
                            </div>
                            {isActive && (
                              <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${isDarkMode ? 'bg-blue-400' : 'bg-blue-300'}`}></div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Horizontal Day Tabs - Compact với Week Navigation */}
                <div className={`mb-3 rounded-lg border ${isDarkMode ? 'border-gray-700/60 bg-gray-900/50' : 'border-gray-300 bg-gray-50'} p-2`}>
                  {/* Week Navigation - Luôn hiển thị */}
                  {datesInRange.length > 0 && (
                    <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700/50">
                      {/* Nút Previous */}
                      <button
                        type="button"
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
                        type="button"
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
                  )}
                  
                  {/* Day Tabs - Hiển thị đầy đủ từ Thứ 2 đến Chủ nhật */}
                  <div className="flex justify-center overflow-x-auto gap-1.5 no-scrollbar">
                        {dayKeyOrder.map((dayKey) => {
                          // Tìm ngày tương ứng với dayKey trong tuần hiện tại hoặc tuần đầu tiên
                          const currentWeekDays = weekInfo.currentWeek?.days || weeks[0]?.days || [];
                          const dayDate = currentWeekDays.find(d => d.dayKey === dayKey)?.date;
                          const { active, total } = dayDate ? getDaySummary(dayDate) : { total: 3, active: 0 };
                          const isSelected = selectedDayKey === dayKey;
                      const dayDateShort = dayDate ? (() => {
                        const date = new Date(dayDate);
                        const day = date.getDate();
                        const month = date.getMonth() + 1;
                        return `${day}/${month}`;
                      })() : null;
                      
                      // Kiểm tra xem ngày này có trong tuần hiện tại không
                      const isInCurrentWeek = !!dayDate;
                      
                      // Kiểm tra xem ngày có buổi active nhưng chưa có địa điểm không
                      const hasActiveSlots = active > 0;
                      let hasLocation = false;
                      if (isPerDayMode) {
                        // PerDay mode: kiểm tra dailyLocations
                        hasLocation = !!dailyLocations[dayKey];
                      } else if (isPerSlotMode) {
                        // PerSlot mode: kiểm tra xem tất cả slot active đều có địa điểm
                        const slots = dayDate ? (weeklyPlan[dayDate] || []) : [];
                        const activeSlots = slots.filter(s => s.isActive);
                        hasLocation = activeSlots.length > 0 && activeSlots.every(slot => 
                          slot.locationAddress && typeof slot.locationLat === 'number' && typeof slot.locationLng === 'number'
                        );
                      } else if (isGlobalMode) {
                        // Global mode: kiểm tra locationData
                        hasLocation = !!locationData;
                      }
                      const needsLocation = hasActiveSlots && !hasLocation;
                      
                          return (
                            <button
                              key={`tab-${dayKey}`}
                              type="button"
                              onClick={() => {
                                setSelectedDayKey(dayKey);
                                // Set selectedDate immediately
                                const currentWeekDays = weekInfo.currentWeek?.days || weeks[0]?.days || [];
                                const dayDate = currentWeekDays.find(d => d.dayKey === dayKey)?.date;
                                if (dayDate) {
                                  setSelectedDate(dayDate);
                                } else {
                                  // If not in current week, find first date with this dayKey
                                  const firstDate = datesInRange.find(d => getDayKeyFromDate(d) === dayKey);
                                  if (firstDate) {
                                    setSelectedDate(firstDate);
                                  } else if (datesInRange.length > 0) {
                                    setSelectedDate(datesInRange[0]);
                                  }
                                }
                                // Nếu ở PerSlot mode, cập nhật locationEditorDay và selectedTimeSlotForLocation
                                if (isPerSlotMode) {
                                  setLocationEditorDay(dayKey);
                                  const activeSlots = getActiveTimeSlotsForDay(dayKey);
                                  setSelectedTimeSlotForLocation(prev => (prev && activeSlots.includes(prev) ? prev : activeSlots[0] ?? null));
                                }
                              }}
                          className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all relative border-2 ${
                                isSelected
                                  ? isDarkMode
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border-blue-400'
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm border-blue-300'
                                  : isInCurrentWeek
                                    ? isDarkMode
                                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-600'
                                      : 'bg-white text-gray-600 hover:bg-gray-100 border-gray-300'
                                    : isDarkMode
                                      ? 'bg-gray-800/40 text-gray-400 opacity-60 border-gray-700/50'
                                      : 'bg-gray-50 text-gray-400 opacity-60 border-gray-200'
                              }`}
                            >
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold">{dayKeyToLabel[dayKey]}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                  active > 0
                                  ? isSelected
                                    ? isDarkMode ? 'bg-white/20 text-white' : 'bg-white/30 text-white'
                                    : isDarkMode ? 'bg-green-500/40 text-green-100' : 'bg-green-100 text-green-700'
                                  : isSelected
                                    ? isDarkMode ? 'bg-white/10 text-white/70' : 'bg-white/20 text-white/80'
                                    : isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
                                }`}>{active}/{total}</span>
                              {/* Indicator cho ngày đã mở nhưng chưa có địa điểm */}
                              {needsLocation && (
                                <span title="Đã mở buổi nhưng chưa có địa điểm">
                                  <AlertCircle 
                                    size={12} 
                                    strokeWidth={2.5}
                                    className={isSelected 
                                      ? isDarkMode ? 'text-red-300' : 'text-red-400'
                                      : isDarkMode ? 'text-red-400' : 'text-red-600'
                                    }
                                  />
                                </span>
                              )}
                            </div>
                            {dayDateShort ? (
                              <span className={`text-[10px] font-medium ${
                                isSelected
                                  ? isDarkMode ? 'text-white/90' : 'text-white'
                                  : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                {dayDateShort}
                              </span>
                            ) : (
                              <span className={`text-[9px] italic ${
                                isDarkMode ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                Ngoài phạm vi
                              </span>
                            )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                {/* Main Content Area - Compact */}
                <div className={`rounded-lg border ${isDarkMode ? 'border-gray-700/60 bg-gray-900/55' : 'border-gray-300 bg-white'} p-3`}>
                  {/* Day Header */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700/50">
                        <div>
                      <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {dayKeyToLabel[selectedDayKey]}
                          </h3>
                      <p className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {selectedDaySummary.active}/{selectedDaySummary.total} buổi đang bật
                      </p>
                        </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => copyDayToTarget('mon', selectedDayKey)}
                        disabled={selectedDayKey === 'mon'}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                          selectedDayKey === 'mon'
                            ? isDarkMode ? 'bg-gray-800/60 text-gray-500 opacity-50 cursor-not-allowed' : 'bg-gray-200 text-gray-400 opacity-50 cursor-not-allowed'
                            : isDarkMode ? 'bg-blue-500/20 text-blue-200 hover:bg-blue-500/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        <FileEdit size={11} strokeWidth={2} />
                        <span>Sao chép T2</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copyDayToAll(selectedDayKey)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${isDarkMode ? 'bg-purple-500/20 text-purple-200 hover:bg-purple-500/30' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                      >
                        <Users size={11} strokeWidth={2} />
                        <span>Áp dụng</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => resetDayPlan(selectedDayKey)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${isDarkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        <XCircle size={11} strokeWidth={2} />
                        <span>Đặt lại</span>
                      </button>
                        </div>
                      </div>

                  {/* Time Slots Grid - Compact */}
                  <div className="grid md:grid-cols-3 gap-3">
                        {(() => {
                          // Get slots for selected date, or use default if not available
                          // But ensure we always use slots from state, not defaultWeeklySlots directly
                          let slots: WeeklySlot[];
                          if (selectedDate && weeklyPlan[selectedDate]) {
                            slots = weeklyPlan[selectedDate];
                          } else {
                            // If no slots for selectedDate, use default but ensure they're in state
                            slots = defaultWeeklySlots;
                            // Initialize in state if not exists
                            if (selectedDate && !weeklyPlan[selectedDate]) {
                              setWeeklyPlan(prev => {
                                if (!prev[selectedDate]) {
                                  return {
                                    ...prev,
                                    [selectedDate]: JSON.parse(JSON.stringify(defaultWeeklySlots))
                                  };
                                }
                                return prev;
                              });
                            }
                          }
                          return (
                            <>
                              {slots.map((slot) => {
                          const isActive = slot.isActive;
                          return (
                        <div
                          key={`slot-${selectedDayKey}-${slot.id}`}
                          onClick={(e) => {
                            // Nếu click vào input, button, label, hoặc textarea thì không làm gì
                            const target = e.target as HTMLElement;
                            if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'LABEL' || target.tagName === 'TEXTAREA' || target.closest('label') || target.closest('button')) {
                              return;
                            }
                            // Nếu ở PerSlot mode và buổi đang active, chọn buổi này để chỉnh địa điểm
                            if (isPerSlotMode && isActive) {
                              const slotKey = slotIdToTimeSlotKey[slot.id];
                              if (slotKey) {
                                setSelectedTimeSlotForLocation(slotKey);
                                setLocationEditorDay(selectedDayKey);
                                // Scroll đến phần map picker
                                requestAnimationFrame(() => {
                                  const section = document.getElementById('session-map-section');
                                  if (section) {
                                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }
                                });
                              }
                            }
                          }}
                          className={`rounded-lg border-2 p-3 transition-all ${
                            isActive
                              ? isDarkMode
                                ? 'border-blue-500/60 bg-gradient-to-br from-blue-900/30 to-indigo-900/20 shadow-md'
                                : 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm'
                              : isDarkMode
                                ? 'border-gray-700 bg-gray-800/40 opacity-60'
                                : 'border-gray-300 bg-gray-50 opacity-70'
                          } ${
                            isPerSlotMode && isActive && selectedTimeSlotForLocation === slotIdToTimeSlotKey[slot.id]
                              ? 'ring-2 ring-orange-400 ring-offset-2'
                              : ''
                          } ${isPerSlotMode && isActive ? 'cursor-pointer' : ''}`}
                        >
                          {/* Slot Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                isActive
                                  ? isDarkMode ? 'bg-blue-500/30 text-blue-200' : 'bg-blue-100 text-blue-600'
                                  : isDarkMode ? 'bg-gray-700/50 text-gray-500' : 'bg-gray-200 text-gray-400'
                              }`}>
                                {timeSlotIcon[slot.name] ?? <Clock size={16} strokeWidth={2} />}
                                  </div>
                                  <div>
                                <p className={`text-xs font-bold ${isActive ? (isDarkMode ? 'text-white' : 'text-gray-900') : (isDarkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                                  {slot.name}
                                </p>
                                <p className={`text-[11px] ${isActive ? (isDarkMode ? 'text-blue-200' : 'text-blue-600') : (isDarkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                                  {slot.startTime} - {slot.endTime}
                                </p>
                                  </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => {
                                      if (selectedDate) {
                                        updateWeeklySlot(selectedDate, slot.id, 'isActive', e.target.checked);
                                      } else if (datesInRange.length > 0) {
                                        // Fallback: use first date in range if selectedDate not set
                                        const firstDate = datesInRange.find(d => getDayKeyFromDate(d) === selectedDayKey) || datesInRange[0];
                                        setSelectedDate(firstDate);
                                        updateWeeklySlot(firstDate, slot.id, 'isActive', e.target.checked);
                                      }
                                    }}
                                    className="sr-only peer"
                                  />
                              <div className={`relative w-10 h-5 rounded-full transition-all ${isActive ? 'bg-blue-500' : 'bg-gray-400'} peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:rounded-full after:bg-white after:shadow-sm after:transition-all`}></div>
                                </label>
                              </div>

                          {/* Slot Content */}
                          {isActive && (
                            <div className={`space-y-2 pt-2 border-t ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200'}`}>
                              <div className="grid grid-cols-2 gap-1.5">
                                  <div>
                                  <label className={`block mb-0.5 text-[11px] font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Bắt đầu</label>
                                    <input
                                      type="time"
                                      value={slot.startTime}
                                      onChange={(e) => selectedDate && updateWeeklySlot(selectedDate, slot.id, 'startTime', e.target.value)}
                                    className={`w-full px-2 py-1.5 rounded border text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    />
                                  </div>
                                  <div>
                                  <label className={`block mb-0.5 text-[11px] font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Kết thúc</label>
                                    <input
                                      type="time"
                                      value={slot.endTime}
                                      onChange={(e) => selectedDate && updateWeeklySlot(selectedDate, slot.id, 'endTime', e.target.value)}
                                    className={`w-full px-2 py-1.5 rounded border text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    />
                                  </div>
                                </div>
                                <div>
                                <label className={`block mb-0.5 text-[11px] font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Mô tả hoạt động</label>
                                  <textarea
                                    value={slot.activities}
                                    onChange={(e) => selectedDate && updateWeeklySlot(selectedDate, slot.id, 'activities', e.target.value)}
                                    rows={2}
                                  className={`w-full px-2 py-1.5 rounded border text-xs resize-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                  placeholder="Nhập nội dung..."
                                  />
                                </div>
                              {/* Địa điểm chi tiết (text) - Luôn hiển thị khi buổi bật */}
                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <label className={`text-[11px] font-semibold flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <FileText size={10} strokeWidth={2} />
                                    <span>Địa điểm chi tiết</span>
                                  </label>
                                  {isGlobalMode && globalDetailedLocation && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        selectedDate && updateWeeklySlot(selectedDate, slot.id, 'detailedLocation', globalDetailedLocation);
                                      }}
                                      className={`text-[10px] px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 ${
                                        isDarkMode 
                                          ? 'text-blue-300 hover:text-blue-200 hover:bg-blue-500/20' 
                                          : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                                      }`}
                                      title="Áp dụng địa điểm chung"
                                    >
                                      <Users size={9} strokeWidth={2} />
                                      <span>Dùng chung</span>
                                    </button>
                                  )}
                                  {isPerDayMode && perDayDetailedLocation[selectedDayKey] && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        selectedDate && updateWeeklySlot(selectedDate, slot.id, 'detailedLocation', perDayDetailedLocation[selectedDayKey]);
                                      }}
                                      className={`text-[10px] px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 ${
                                        isDarkMode 
                                          ? 'text-purple-300 hover:text-purple-200 hover:bg-purple-500/20' 
                                          : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                                      }`}
                                      title="Áp dụng địa điểm theo ngày"
                                    >
                                      <Users size={9} strokeWidth={2} />
                                      <span>Dùng theo ngày</span>
                                    </button>
                                  )}
                                  {isPerSlotMode && perSlotDetailedLocation && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        selectedDate && updateWeeklySlot(selectedDate, slot.id, 'detailedLocation', perSlotDetailedLocation);
                                      }}
                                      className={`text-[10px] px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 ${
                                        isDarkMode 
                                          ? 'text-orange-300 hover:text-orange-200 hover:bg-orange-500/20' 
                                          : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                                      }`}
                                      title="Áp dụng địa điểm theo buổi"
                                    >
                                      <Users size={9} strokeWidth={2} />
                                      <span>Dùng theo buổi</span>
                                    </button>
                                  )}
                                </div>
                                  <input
                                    type="text"
                                  value={slot.detailedLocation || ''}
                                    onChange={(e) => selectedDate && updateWeeklySlot(selectedDate, slot.id, 'detailedLocation', e.target.value)}
                                  className={`w-full px-2 py-1.5 rounded border text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                  placeholder={
                                    isGlobalMode && globalDetailedLocation 
                                      ? globalDetailedLocation 
                                      : isPerDayMode && perDayDetailedLocation[selectedDayKey]
                                        ? perDayDetailedLocation[selectedDayKey]
                                        : isPerSlotMode && perSlotDetailedLocation
                                          ? perSlotDetailedLocation
                                          : "VD: Dãy A, Phòng 101..."
                                  }
                                />
                                <p className={`mt-0.5 text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {isGlobalMode && globalDetailedLocation 
                                    ? 'Có thể chỉnh sửa riêng hoặc nhấn "Dùng chung" để áp dụng địa điểm chung'
                                    : isPerDayMode && perDayDetailedLocation[selectedDayKey]
                                      ? 'Có thể chỉnh sửa riêng hoặc nhấn "Dùng theo ngày" để áp dụng địa điểm theo ngày'
                                      : isPerSlotMode && perSlotDetailedLocation
                                        ? 'Có thể chỉnh sửa riêng hoặc nhấn "Dùng theo buổi" để áp dụng địa điểm theo buổi'
                                        : 'Mô tả địa điểm bằng văn bản (tùy chọn)'}
                                </p>
                                  </div>
                              
                              {/* Địa điểm trên bản đồ - Chỉ hiển thị khi buổi đã bật */}
                              {/* Global Mode: Hiển thị địa điểm chung */}
                              {isGlobalMode && locationData && (
                                <div>
                                  <label className={`block mb-0.5 text-[11px] font-semibold flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <Globe size={10} strokeWidth={2} />
                                    <span>Địa điểm chung (từ bản đồ)</span>
                                  </label>
                                  <div className={`rounded border px-2 py-1.5 text-[11px] ${isDarkMode ? 'border-green-500/30 bg-green-500/10 text-green-200' : 'border-green-300 bg-green-50 text-green-700'}`}>
                                    <div className="font-semibold flex items-center gap-1 mb-0.5">
                                      <MapPin size={11} strokeWidth={2} />
                                      <span className="truncate">{locationData.address}</span>
                                            </div>
                                    <div className="text-[10px] opacity-80">
                                      {formatCoordinate(locationData.lat)}, {formatCoordinate(locationData.lng)} • {locationData.radius ?? 200}m
                                              </div>
                                  </div>
                                              </div>
                                            )}

                              {/* PerDay Mode: Hiển thị địa điểm theo ngày */}
                              {isPerDayMode && dailyLocations[selectedDayKey] && (
                                <div>
                                  <label className={`block mb-0.5 text-[11px] font-semibold flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <Globe size={10} strokeWidth={2} />
                                    <span>Địa điểm {dayKeyToLabel[selectedDayKey]} (từ bản đồ)</span>
                                  </label>
                                  <div className={`rounded border px-2 py-1.5 text-[11px] ${isDarkMode ? 'border-green-500/30 bg-green-500/10 text-green-200' : 'border-green-300 bg-green-50 text-green-700'}`}>
                                    <div className="font-semibold flex items-center gap-1 mb-0.5">
                                      <MapPin size={11} strokeWidth={2} />
                                      <span className="truncate">{dailyLocations[selectedDayKey]?.address}</span>
                                          </div>
                                    <div className="text-[10px] opacity-80">
                                      {formatCoordinate(dailyLocations[selectedDayKey]?.lat)}, {formatCoordinate(dailyLocations[selectedDayKey]?.lng)} • {dailyLocations[selectedDayKey]?.radius ?? 200}m
                                    </div>
                                  </div>
                                          </div>
                                        )}

                              {/* PerSlot Mode: Chọn địa điểm riêng cho từng buổi */}
                              {isPerSlotMode && (
                                <div>
                                  <label className={`block mb-0.5 text-[11px] font-semibold flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <Globe size={10} strokeWidth={2} />
                                    <span>Địa điểm trên bản đồ (cho buổi này)</span>
                                  </label>
                                  <p className={`mb-1.5 text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Chọn vị trí trên bản đồ để điểm danh (tùy chọn)
                                  </p>
                                  {slot.locationAddress ? (
                                    <div className="space-y-1.5">
                                      <div className={`rounded border px-2 py-1.5 text-[11px] ${isDarkMode ? 'border-green-500/30 bg-green-500/10 text-green-200' : 'border-green-300 bg-green-50 text-green-700'}`}>
                                        <div className="font-semibold flex items-center gap-1 mb-0.5">
                                          <MapPin size={11} strokeWidth={2} />
                                          <span className="truncate">{slot.locationAddress}</span>
                                      </div>
                                        <div className="text-[10px] opacity-80">
                                          {typeof slot.locationLat === 'number' && typeof slot.locationLng === 'number' && (
                                            <span>{slot.locationLat.toFixed(4)}, {slot.locationLng.toFixed(4)}</span>
                                          )}
                                          {typeof slot.locationRadius === 'number' && (
                                            <span> • {slot.locationRadius}m</span>
                                          )}
                                        </div>
                                      </div>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenSlotLocationPicker(selectedDayKey, slot.id)}
                                        className={`w-full px-2 py-1 rounded text-[11px] font-semibold transition flex items-center justify-center gap-1 ${isDarkMode ? 'bg-blue-500/20 text-blue-200 hover:bg-blue-500/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                        >
                                        <MapPin size={10} strokeWidth={2} />
                                        <span>Thay đổi địa điểm</span>
                                        </button>
                                          <button
                                            type="button"
                                            onClick={() => handleClearSlotLocation(selectedDayKey, slot.id)}
                                        className={`w-full px-2 py-1 rounded text-[11px] font-semibold transition flex items-center justify-center gap-1 ${isDarkMode ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                                      >
                                        <XCircle size={10} strokeWidth={2} />
                                        <span>Xóa địa điểm</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSlotLocationPicker(selectedDayKey, slot.id)}
                                      className={`w-full px-2 py-1 rounded text-[11px] font-semibold transition flex items-center justify-center gap-1 ${isDarkMode ? 'bg-purple-500/20 text-purple-100 hover:bg-purple-500/30' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                                    >
                                      <MapPin size={10} strokeWidth={2} />
                                      <span>Chọn địa điểm trên bản đồ</span>
                                          </button>
                                        )}
                                      </div>
                              )}
                                    </div>
                                  )}
                            </div>
                          );
                        })}
                            </>
                          );
                        })()}
                      </div>

                  {/* Ghi chú và Địa điểm chung - Cùng một hàng */}
                  <div className={`mt-3 rounded-lg border ${isDarkMode ? 'border-gray-700/60 bg-gray-900/55' : 'border-gray-300 bg-white'} p-2`}>
                    <div className={`grid gap-2 items-stretch ${isGlobalMode ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {/* Ghi chú theo ngày */}
                      <div className="flex flex-col gap-1 h-full">
                        <div className="flex items-center gap-1.5">
                          <StickyNote size={14} strokeWidth={2} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                          <label className={`text-xs font-semibold whitespace-nowrap ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            Ghi chú:
                          </label>
                        </div>
                        <textarea
                          value={(() => {
                            // Lấy ghi chú của ngày đầu tiên có cùng dayKey với selectedDayKey
                            const firstDateWithSameDayKey = datesInRange.find(d => getDayKeyFromDate(d) === selectedDayKey);
                            return firstDateWithSameDayKey ? (daySchedules[firstDateWithSameDayKey] || '') : '';
                          })()}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Cập nhật ghi chú cho tất cả các ngày có cùng dayKey
                            setDaySchedules(prev => {
                              const next = { ...prev };
                              datesInRange.forEach(date => {
                                if (getDayKeyFromDate(date) === selectedDayKey) {
                                  next[date] = value;
                                }
                              });
                              return next;
                            });
                          }}
                          rows={2}
                          className={`w-full flex-1 px-2 py-1.5 rounded border text-xs resize-none ${isDarkMode ? 'bg-gray-700/50 border-gray-600/50 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                          placeholder={`Ghi chú ${dayKeyToLabel[selectedDayKey]}...`}
                        />
                      </div>

                      {/* Global Mode: Input địa điểm chi tiết chung */}
                      {isGlobalMode && (
                        <div className="flex flex-col gap-1 h-full">
                          <div className="flex items-center gap-1.5">
                            <FileText size={14} strokeWidth={2} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                            <label className={`text-xs font-semibold whitespace-nowrap ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              Địa điểm chung:
                            </label>
                          </div>
                          <div className="flex gap-1 flex-1 items-start">
                            <input
                              type="text"
                              value={globalDetailedLocation}
                              onChange={(e) => setGlobalDetailedLocation(e.target.value)}
                              className={`flex-1 px-2 py-1.5 rounded border text-xs h-full ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                              placeholder="VD: Dãy A, Phòng 101..."
                            />
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  // Áp dụng địa điểm chi tiết chung cho tất cả các buổi đang bật
                                  setWeeklyPlan(prev => {
                                    const next = { ...prev };
                                    datesInRange.forEach(date => {
                                      if (!next[date]) {
                                        next[date] = JSON.parse(JSON.stringify(defaultWeeklySlots));
                                      }
                                      next[date] = next[date].map(slot => 
                                        slot.isActive 
                                          ? { ...slot, detailedLocation: globalDetailedLocation }
                                          : slot
                                      );
                                    });
                                    return next;
                                  });
                                }}
                                disabled={!globalDetailedLocation.trim()}
                                className={`px-1.5 py-1.5 rounded text-[10px] font-semibold transition-all flex items-center gap-0.5 whitespace-nowrap ${
                                  globalDetailedLocation.trim()
                                  ? isDarkMode
                                      ? 'bg-green-500/20 text-green-200 hover:bg-green-500/30' 
                                      : 'bg-green-500 text-white hover:bg-green-600'
                                  : isDarkMode
                                      ? 'bg-gray-800/30 text-gray-500 opacity-50 cursor-not-allowed'
                                      : 'bg-gray-200 text-gray-400 opacity-50 cursor-not-allowed'
                                }`}
                              >
                                <Users size={10} strokeWidth={2} />
                                <span>Áp dụng</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  // Xóa tất cả địa điểm chi tiết từ các buổi đang bật
                                  setWeeklyPlan(prev => {
                                    const next = { ...prev };
                                    datesInRange.forEach(date => {
                                      if (!next[date]) {
                                        next[date] = JSON.parse(JSON.stringify(defaultWeeklySlots));
                                      }
                                      next[date] = next[date].map(slot => 
                                        slot.isActive 
                                          ? { ...slot, detailedLocation: '' }
                                          : slot
                                      );
                                    });
                                    return next;
                                  });
                                  // Xóa cả địa điểm chi tiết chung
                                  setGlobalDetailedLocation('');
                                }}
                                className={`px-1.5 py-1.5 rounded text-[10px] font-semibold transition-all flex items-center justify-center whitespace-nowrap ${
                                  isDarkMode 
                                    ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30' 
                                    : 'bg-red-500 text-white hover:bg-red-600'
                                }`}
                                title="Xóa tất cả"
                              >
                                <XCircle size={10} strokeWidth={2} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Global Map Picker - Hiển thị khi có buổi active */}
                  {isGlobalMode && totalWeeklyActive > 0 && (
                    <div className={`mt-3 rounded-lg border ${isDarkMode ? 'border-blue-500/30 bg-gray-900/50' : 'border-gray-300 bg-white'} p-1.5`}>
                      <div className="flex items-center gap-1 mb-1">
                        <Globe size={12} strokeWidth={2} className={isDarkMode ? 'text-blue-300' : 'text-blue-600'} />
                        <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Chọn địa điểm trên bản đồ</span>
                      </div>
                      {/* Thông báo nếu chưa chọn buổi */}
                      {totalWeeklyActive === 0 ? (
                        <div className={`mb-3 p-2.5 rounded-lg border-2 flex items-start gap-2 ${
                          isDarkMode 
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200' 
                            : 'bg-yellow-50 border-yellow-300 text-yellow-800'
                        }`}>
                          <AlertCircle size={16} strokeWidth={2} className={`flex-shrink-0 mt-0.5 ${
                            isDarkMode ? 'text-yellow-300' : 'text-yellow-600'
                          }`} />
                          <div className="flex-1">
                            <p className={`text-xs font-semibold mb-0.5 ${isDarkMode ? 'text-yellow-200' : 'text-yellow-900'}`}>
                              Vui lòng chọn buổi trước khi chọn địa điểm
                            </p>
                            <p className={`text-[10px] ${isDarkMode ? 'text-yellow-300/80' : 'text-yellow-700'}`}>
                              Hãy bật ít nhất một buổi (Sáng/Chiều/Tối) trong tuần trước khi chọn địa điểm chung.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className={`rounded border overflow-hidden mb-1 ${isDarkMode ? 'border-blue-500/30' : 'border-gray-300'}`} style={{ minHeight: '180px' }}>
                          <OpenStreetMapPicker
                            onLocationChange={(location) => {
                              if (location && location.address) {
                                handleLocationChange(location);
                              }
                            }}
                            initialLocation={locationData || undefined}
                            isDarkMode={isDarkMode}
                            enforceActiveTimeSlots={false}
                            locationContext="global"
                          />
                        </div>
                      )}
                      {locationData && (
                        <div className="space-y-1">
                          <div className={`rounded border px-1.5 py-1 text-[10px] ${isDarkMode ? 'border-green-500/30 bg-green-500/10 text-green-200' : 'border-green-300 bg-green-50 text-green-700'}`}>
                            <div className="font-semibold flex items-center gap-0.5 mb-0.5">
                              <MapPin size={9} strokeWidth={2} />
                              <span className="truncate">{locationData.address}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] opacity-80">
                              <span>{formatCoordinate(locationData.lat)}, {formatCoordinate(locationData.lng)}</span>
                              <span>•</span>
                              <span>{locationData.radius ?? 200}m</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setLocationData(null);
                            }}
                            className={`w-full px-2 py-1 rounded text-[10px] font-semibold transition flex items-center justify-center gap-1 ${
                              isDarkMode 
                                ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30' 
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                          >
                            <XCircle size={10} strokeWidth={2} />
                            <span>Xóa địa điểm</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PerDay Mode: Input địa điểm chi tiết theo ngày - Collapsible */}
                  {isPerDayMode && (
                    <div className={`mt-4 rounded-lg border ${isDarkMode ? 'border-purple-500/30 bg-purple-900/10' : 'border-purple-200 bg-purple-50/50'}`}>
                      {/* Header với nút collapse/expand */}
                      <button
                        type="button"
                        onClick={() => setShowPerDayLocationSection(prev => ({
                          ...prev,
                          [selectedDayKey]: !prev[selectedDayKey]
                        }))}
                        className={`w-full flex items-center justify-between p-3 rounded-t-lg transition-all ${
                          showPerDayLocationSection[selectedDayKey]
                            ? isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                            : isDarkMode ? 'hover:bg-purple-500/10' : 'hover:bg-purple-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={16} strokeWidth={2} className={isDarkMode ? 'text-purple-300' : 'text-purple-600'} />
                          <div className="text-left">
                            <div className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              Địa điểm chi tiết {dayKeyToLabel[selectedDayKey]}
                            </div>
                            <div className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Nhập địa điểm chung cho {dayKeyToLabel[selectedDayKey]} để áp dụng nhanh cho các buổi
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {perDayDetailedLocation[selectedDayKey] && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              isDarkMode ? 'bg-green-500/20 text-green-200' : 'bg-green-100 text-green-700'
                            }`}>
                              Đã nhập
                            </span>
                          )}
                          {showPerDayLocationSection[selectedDayKey] ? (
                            <ChevronUp size={18} strokeWidth={2} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                          ) : (
                            <ChevronDown size={18} strokeWidth={2} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                          )}
                        </div>
                      </button>

                      {/* Content - Collapsible */}
                      {showPerDayLocationSection[selectedDayKey] && (
                        <div className="p-3 pt-0 space-y-3">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={perDayDetailedLocation[selectedDayKey] || ''}
                              onChange={(e) => setPerDayDetailedLocation(prev => ({
                                ...prev,
                                [selectedDayKey]: e.target.value
                              }))}
                              className={`flex-1 px-3 py-2 rounded border text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                              placeholder="VD: Dãy A, Sân trường, Phòng 101, Hội trường..."
                            />
                            <button
                              type="button"
                              onClick={() => {
                                // Áp dụng địa điểm chi tiết cho tất cả các buổi đang bật của ngày này
                                setWeeklyPlan(prev => {
                                  const next = { ...prev };
                                  // Tìm tất cả các date có cùng selectedDayKey
                                  const dayDates = datesInRange.filter(d => getDayKeyFromDate(d) === selectedDayKey);
                                  dayDates.forEach(date => {
                                    if (!next[date]) {
                                      next[date] = JSON.parse(JSON.stringify(defaultWeeklySlots));
                                    }
                                    next[date] = next[date].map(slot => 
                                      slot.isActive 
                                        ? { ...slot, detailedLocation: perDayDetailedLocation[selectedDayKey] }
                                        : slot
                                    );
                                  });
                                  return next;
                                });
                              }}
                              disabled={!perDayDetailedLocation[selectedDayKey]?.trim()}
                              className={`px-3 py-2 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                perDayDetailedLocation[selectedDayKey]?.trim()
                                  ? isDarkMode 
                                    ? 'bg-green-500/20 text-green-200 hover:bg-green-500/30' 
                                    : 'bg-green-500 text-white hover:bg-green-600'
                                  : isDarkMode
                                    ? 'bg-gray-800/30 text-gray-500 opacity-50 cursor-not-allowed'
                                    : 'bg-gray-200 text-gray-400 opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <Users size={12} strokeWidth={2} />
                              <span>Áp dụng tất cả</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                // Xóa tất cả địa điểm chi tiết từ các buổi đang bật của ngày này
                                setWeeklyPlan(prev => {
                                  const next = { ...prev };
                                  // Tìm tất cả các date có cùng selectedDayKey
                                  const dayDates = datesInRange.filter(d => getDayKeyFromDate(d) === selectedDayKey);
                                  dayDates.forEach(date => {
                                    if (!next[date]) {
                                      next[date] = JSON.parse(JSON.stringify(defaultWeeklySlots));
                                    }
                                    next[date] = next[date].map(slot => 
                                      slot.isActive 
                                        ? { ...slot, detailedLocation: '' }
                                        : slot
                                    );
                                  });
                                  return next;
                                });
                                // Xóa cả địa điểm chi tiết của ngày này
                                setPerDayDetailedLocation(prev => ({
                                  ...prev,
                                  [selectedDayKey]: ''
                                }));
                              }}
                              className={`px-3 py-2 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                isDarkMode 
                                  ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30' 
                                  : 'bg-red-500 text-white hover:bg-red-600'
                              }`}
                              title="Xóa tất cả địa điểm chi tiết"
                            >
                              <XCircle size={12} strokeWidth={2} />
                              <span>Xóa tất cả</span>
                            </button>
                          </div>
                          
                          <p className={`text-center text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Nhập địa điểm chi tiết cho {dayKeyToLabel[selectedDayKey]}, sau đó nhấn "Áp dụng tất cả" để áp dụng nhanh cho các buổi đang bật. Bạn vẫn có thể chỉnh sửa riêng cho từng buổi.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PerDay Map Picker */}
                  {isPerDayMode && (
                    <div className={`mt-4 rounded-lg border ${isDarkMode ? 'border-purple-500/30 bg-gray-900/50' : 'border-gray-300 bg-white'} p-1.5`}>
                      <div className={`flex items-center justify-center gap-2 mb-3 py-3 px-4 rounded-lg ${
                        isDarkMode 
                          ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/40' 
                          : 'bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200'
                      }`}>
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                          isDarkMode 
                            ? 'bg-purple-500/30 border-2 border-purple-400/50' 
                            : 'bg-purple-100 border-2 border-purple-300'
                        }`}>
                          <Globe size={20} strokeWidth={2.5} className={isDarkMode ? 'text-purple-300' : 'text-purple-600'} />
                        </div>
                        <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Địa điểm {dayKeyToLabel[selectedDayKey]}
                        </span>
                      </div>
                      {/* Thông báo nếu chưa chọn buổi */}
                      {selectedDaySummary.active === 0 ? (
                        <div className={`mb-3 p-2.5 rounded-lg border-2 flex items-start gap-2 ${
                          isDarkMode 
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200' 
                            : 'bg-yellow-50 border-yellow-300 text-yellow-800'
                        }`}>
                          <AlertCircle size={16} strokeWidth={2} className={`flex-shrink-0 mt-0.5 ${
                            isDarkMode ? 'text-yellow-300' : 'text-yellow-600'
                          }`} />
                          <div className="flex-1">
                            <p className={`text-xs font-semibold mb-0.5 ${isDarkMode ? 'text-yellow-200' : 'text-yellow-900'}`}>
                              Vui lòng chọn buổi trước khi chọn địa điểm
                            </p>
                            <p className={`text-[10px] ${isDarkMode ? 'text-yellow-300/80' : 'text-yellow-700'}`}>
                              Hãy bật ít nhất một buổi (Sáng/Chiều/Tối) cho {dayKeyToLabel[selectedDayKey]} trước khi chọn địa điểm.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className={`rounded border overflow-hidden mb-1 ${isDarkMode ? 'border-purple-500/30' : 'border-gray-300'}`} style={{ minHeight: '180px' }}>
                          <OpenStreetMapPicker
                            key={`perday-map-${selectedDayKey}-${dailyLocations[selectedDayKey]?.address || 'none'}-${dailyLocations[selectedDayKey]?.lat || '0'}-${dailyLocations[selectedDayKey]?.lng || '0'}`}
                            onLocationChange={(location) => {
                              if (location && location.address) {
                                handleDayLocationSelect(selectedDayKey, location);
                              }
                            }}
                            initialLocation={dailyLocations[selectedDayKey] || undefined}
                            isDarkMode={isDarkMode}
                            enforceActiveTimeSlots={false}
                            locationContext="perDay"
                            dayLabel={dayKeyToLabel[selectedDayKey]}
                          />
                        </div>
                      )}
                      {dailyLocations[selectedDayKey] ? (
                        <div className="space-y-1">
                          <div className={`rounded border px-1.5 py-1 text-[10px] ${isDarkMode ? 'border-green-500/30 bg-green-500/10 text-green-200' : 'border-green-300 bg-green-50 text-green-700'}`}>
                            <div className="font-semibold flex items-center gap-0.5 mb-0.5">
                              <MapPin size={9} strokeWidth={2} />
                              <span className="truncate">{dailyLocations[selectedDayKey]?.address}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] opacity-80">
                              <span>{formatCoordinate(dailyLocations[selectedDayKey]?.lat)}, {formatCoordinate(dailyLocations[selectedDayKey]?.lng)}</span>
                              <span>•</span>
                              <span>{dailyLocations[selectedDayKey]?.radius ?? 200}m</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleClearDayLocation(selectedDayKey)}
                            className={`w-full px-2 py-1 rounded text-[10px] font-semibold transition flex items-center justify-center gap-1 ${
                              isDarkMode 
                                ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30' 
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                          >
                            <XCircle size={10} strokeWidth={2} />
                            <span>Xóa địa điểm</span>
                          </button>
                        </div>
                      ) : (
                        <div className={`rounded border px-1.5 py-1 text-[10px] text-center ${isDarkMode ? 'border-gray-700 bg-gray-800/50 text-gray-400' : 'border-gray-300 bg-gray-50 text-gray-500'}`}>
                          Chưa chọn địa điểm. Hãy chọn trên bản đồ phía trên.
                        </div>
                      )}
                    </div>
                  )}

                  {/* PerSlot Mode: Map picker cho từng buổi */}
                  {isPerSlotMode && totalWeeklyActive > 0 && (
                    <div className="mt-4">
                      {renderPerSlotModeContent()}
                    </div>
                  )}
                            </div>
              </div>

              {/* 4. Người phụ trách */}
              <div className={`p-4 rounded-xl bg-white ${isDarkMode ? 'border border-gray-700/50' : 'border-2 border-gray-300'} shadow-lg`}>
                <div className="mb-3">
                  <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>4. Người phụ trách</h2>
                </div>
                
                {/* Chọn người phụ trách */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Người phụ trách
                    </label>
                    {form.responsiblePerson.length > 0 && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
                        Đã chọn {form.responsiblePerson.length} người
                      </span>
                    )}
                  </div>

                  {/* Dropdown chọn người */}
                  <div className="relative mb-3">
                    <div className="relative">
                      <select
                        value={selectedPersonId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          if (selectedId && !form.responsiblePerson.includes(selectedId)) {
                            handleToggleResponsiblePerson(selectedId);
                            setSelectedPersonId('');
                          }
                        }}
                        disabled={loadingResponsiblePersons}
                        className={`w-full px-3 py-2.5 rounded-lg border-2 text-sm appearance-none cursor-pointer ${
                          isDarkMode
                            ? 'bg-gray-600/50 border-gray-500/50 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                      >
                        <option value="">
                          {loadingResponsiblePersons ? 'Đang tải...' : 'Chọn người phụ trách...'}
                        </option>
                        {!loadingResponsiblePersons && responsiblePersons
                          .filter(p => !form.responsiblePerson.includes(p._id))
                          .map((person) => (
                            <option key={person._id} value={person._id}>
                              {person.name} ({getRoleDisplayName(person.role)})
                              {person.studentId && ` - ${person.studentId}`}
                            </option>
                          ))}
                      </select>
                      <ChevronDown 
                        size={18} 
                        className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`} 
                        strokeWidth={2} 
                      />
                    </div>
                  </div>

                  {/* Card chứa người đã chọn */}
                  {form.responsiblePerson.length > 0 ? (
                    <div className={`space-y-2 p-3 rounded-lg border-2 ${isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-50'}`}>
                      {form.responsiblePerson.map((personId) => {
                        const person = responsiblePersons.find(p => p._id === personId);
                        if (!person) return null;
                        return (
                          <div
                            key={personId}
                            className={`flex items-center justify-between p-2.5 rounded-lg border-2 ${
                              isDarkMode
                                ? 'bg-gray-800/50 border-gray-700/50'
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 ${
                                isDarkMode ? 'border-gray-600' : 'border-gray-300'
                              }`}>
                                {(person.avatarUrl || person.imageUrl) && !imageErrors.has(personId) ? (
                                  <img
                                    src={person.avatarUrl || person.imageUrl}
                                    alt={person.name}
                                    className="w-full h-full object-cover"
                                    onError={() => {
                                      setImageErrors(prev => new Set(prev).add(personId));
                                    }}
                                  />
                                ) : (
                                  <div className={`w-full h-full flex items-center justify-center ${
                                    isDarkMode ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-600'
                                  }`}>
                                    <User size={20} strokeWidth={2} />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-xs font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {person.name}
                                </div>
                                <div className={`text-[10px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {getRoleDisplayName(person.role)} • {getStatusDisplayName(person.status)}
                                  {person.studentId && ` • ${person.studentId}`}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleResponsiblePerson(personId)}
                              className={`p-1.5 rounded transition ${
                                isDarkMode
                                  ? 'text-red-300 hover:bg-red-500/20'
                                  : 'text-red-600 hover:bg-red-50'
                              }`}
                              title="Xóa"
                            >
                              <X size={16} strokeWidth={2.5} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={`p-4 rounded-lg border-2 border-dashed text-center ${isDarkMode ? 'border-gray-700 text-gray-400 bg-gray-800/30' : 'border-gray-300 text-gray-500 bg-gray-50'}`}>
                      <User size={24} className={`mx-auto mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} strokeWidth={1.5} />
                      <p className="text-xs">Chưa chọn người phụ trách</p>
                    </div>
                  )}

                  {form.responsiblePerson.length === 0 && !loadingResponsiblePersons && (
                    <p className={`text-[10px] mt-2 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
                      <AlertCircle size={12} className="inline mr-1" strokeWidth={2} />
                      Vui lòng chọn ít nhất một người phụ trách
                    </p>
                  )}
                </div>

                {/* Danh sách người đăng ký */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Danh sách người đăng ký
                      </label>
                      <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Hiển thị những người đã đăng ký tham gia hoạt động
                      </p>
                    </div>
                    {loadingParticipants ? (
                      <Loader size={16} className="animate-spin" />
                    ) : (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
                        {activityMembers.length} người đăng ký
                      </span>
                    )}
                  </div>

                  {/* Danh sách người đã đăng ký */}
                  {loadingParticipants ? (
                    <div className={`text-center py-8 rounded-lg border-2 border-dashed ${isDarkMode ? 'border-gray-700 text-gray-400 bg-gray-800/30' : 'border-gray-300 text-gray-500 bg-gray-50'}`}>
                      <Loader size={24} className={`mx-auto mb-2 animate-spin ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <p className="text-xs">Đang tải danh sách người đăng ký...</p>
                    </div>
                  ) : activityMembers.length > 0 ? (
                    <div className="space-y-2">
                      {activityMembers.map((member) => {
                        // Map role từ database format sang display format
                        const getRoleDisplay = (role: MemberRole) => {
                          const roleMap: Record<MemberRole, { label: string; icon: React.ReactNode; color: string }> = {
                            leader: {
                              label: 'Trưởng nhóm',
                              icon: <Crown size={14} strokeWidth={2} />,
                              color: isDarkMode ? 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40' : 'bg-yellow-100 text-yellow-700 border-yellow-300'
                            },
                            deputy: {
                              label: 'Phó trưởng nhóm',
                              icon: <UserCheck size={14} strokeWidth={2} />,
                              color: isDarkMode ? 'bg-blue-500/20 text-blue-200 border-blue-500/40' : 'bg-blue-100 text-blue-700 border-blue-300'
                            },
                            member: {
                              label: 'Thành viên tham gia',
                              icon: <User size={14} strokeWidth={2} />,
                              color: isDarkMode ? 'bg-gray-500/20 text-gray-200 border-gray-500/40' : 'bg-gray-100 text-gray-700 border-gray-300'
                            }
                          };
                          return roleMap[role] || roleMap.member;
                        };
                        const roleInfo = getRoleDisplay(member.role);
                        return (
                          <div
                            key={member.userId}
                            className={`flex items-center justify-between p-2.5 rounded-lg border-2 ${isDarkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200'}`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${roleInfo.color}`}>
                                {roleInfo.icon}
                                <span className="text-[10px] font-semibold">{roleInfo.label}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-xs font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {member.name}
                                </div>
                                <div className={`text-[10px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {member.studentId ? `${member.studentId} • ` : ''}{member.email}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {member.approvalStatus && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                  member.approvalStatus === 'approved'
                                    ? isDarkMode ? 'bg-green-500/20 text-green-200' : 'bg-green-100 text-green-700'
                                    : member.approvalStatus === 'rejected'
                                    ? isDarkMode ? 'bg-red-500/20 text-red-200' : 'bg-red-100 text-red-700'
                                    : isDarkMode ? 'bg-yellow-500/20 text-yellow-200' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {member.approvalStatus === 'approved' ? 'Đã duyệt' : member.approvalStatus === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={`text-center py-8 rounded-lg border-2 border-dashed ${isDarkMode ? 'border-gray-700 text-gray-400 bg-gray-800/30' : 'border-gray-300 text-gray-500 bg-gray-50'}`}>
                      <Users size={32} className={`mx-auto mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} strokeWidth={1.5} />
                      <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {isEditMode ? 'Chưa có người đăng ký tham gia' : 'Chưa có người đăng ký'}
                      </p>
                      <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {isEditMode 
                          ? 'Danh sách sẽ hiển thị khi có người đăng ký tham gia hoạt động này'
                          : 'Sau khi tạo hoạt động và có người đăng ký, danh sách sẽ hiển thị tại đây'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Ghi chú tổng quan */}
              <div className={`p-4 rounded-xl bg-white ${isDarkMode ? 'border border-gray-700/50' : 'border-2 border-gray-300'} shadow-lg`}>
                <div className="mb-3">
                  <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>5. Ghi chú tổng quan</h2>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Thông tin tổng quan, yêu cầu đặc biệt hoặc ghi chú chung cho toàn bộ hoạt động.</p>
                </div>
                <textarea name="overview" value={form.overview} onChange={handleChange} rows={4} className={`w-full px-3 py-2 rounded-lg border-2 text-xs ${isDarkMode ? 'bg-gray-600/50 border-gray-500/50 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="Thông tin chi tiết hoặc yêu cầu đặc biệt..." />
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl'} ${
                    isDarkMode
                      ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white'
                      : 'bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 text-white'
                  }`}
                >
                  {isLoading 
                    ? (isEditMode ? 'Đang cập nhật hoạt động...' : 'Đang tạo hoạt động...') 
                    : (isEditMode ? 'Cập nhật hoạt động nhiều ngày' : 'Tạo hoạt động nhiều ngày')}
                </button>
              </div>
            </form>
          </div>
        </main>
        <Footer />
      </div>

      {/* Modal Crop Ảnh */}
      {showCropModal && imagePreview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className={`relative w-full max-w-3xl rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            {/* Crop Area */}
            <div className="relative w-full" style={{ height: '400px' }}>
              <Cropper
                image={imagePreview}
                crop={crop}
                zoom={zoom}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="rect"
                style={{
                  containerStyle: {
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                  },
                }}
              />
            </div>

            {/* Controls - Đơn giản */}
            <div className={`p-3 flex items-center justify-between border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.max(1, prev - 0.2))}
                  className={`p-2 rounded-lg transition ${
                    isDarkMode 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                  title="Thu nhỏ"
                >
                  <Minus size={18} strokeWidth={2} />
                </button>
                <span className={`text-xs font-medium min-w-[3rem] text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {zoom.toFixed(1)}x
                </span>
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
                  className={`p-2 rounded-lg transition ${
                    isDarkMode 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                  title="Phóng to"
                >
                  <Plus size={18} strokeWidth={2} />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCropModal(false);
                    setSelectedImage(null);
                    setImagePreview('');
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                    setCroppedAreaPixels(null);
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                    isDarkMode 
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Hủy
                </button>
                <button
                  onClick={handleCropComplete}
                  disabled={!croppedAreaPixels}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                    croppedAreaPixels
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`relative w-full max-w-sm rounded-xl shadow-2xl bg-white ${isDarkMode ? 'border-2 border-gray-600' : 'border-2 border-gray-300'}`}>
            <div className="flex items-center justify-center p-4 border-b-2 border-gray-300">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white border-2 border-gray-300">
                <CheckCircle2 size={24} className="text-green-600" strokeWidth={1.5} />
              </div>
            </div>
            <div className="p-4 text-center">
              <h3 className={`text-base font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Thành công!</h3>
              <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{successMessage}</p>
            </div>
            <div className="flex justify-center p-4 border-t-2 border-gray-300">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}



