'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';

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
  const { isDarkMode } = useDarkMode();
  const { user } = useAuth();

  const [isDesktop, setIsDesktop] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
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
    visibility: 'public' as ActivityVisibility,
    responsiblePerson: '',
    status: 'draft' as ActivityStatus,
    imageUrl: '',
    overview: ''
  });

  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [responsiblePersons, setResponsiblePersons] = useState<Array<{
    _id: string;
    name: string;
    email: string;
    role: string;
    studentId: string;
    status: string;
  }>>([]);
  const [loadingResponsiblePersons, setLoadingResponsiblePersons] = useState(false);

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

  type WeeklyPlan = Record<DayKey, WeeklySlot[]>;
  const defaultWeeklySlots: WeeklySlot[] = [
    { id: '1', name: 'Buổi Sáng', startTime: '07:00', endTime: '11:30', isActive: false, activities: '', detailedLocation: '' },
    { id: '2', name: 'Buổi Chiều', startTime: '12:30', endTime: '17:00', isActive: false, activities: '', detailedLocation: '' },
    { id: '3', name: 'Buổi Tối', startTime: '17:00', endTime: '22:00', isActive: false, activities: '', detailedLocation: '' }
  ];
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>({
    mon: JSON.parse(JSON.stringify(defaultWeeklySlots)),
    tue: JSON.parse(JSON.stringify(defaultWeeklySlots)),
    wed: JSON.parse(JSON.stringify(defaultWeeklySlots)),
    thu: JSON.parse(JSON.stringify(defaultWeeklySlots)),
    fri: JSON.parse(JSON.stringify(defaultWeeklySlots)),
    sat: JSON.parse(JSON.stringify(defaultWeeklySlots)),
    sun: JSON.parse(JSON.stringify(defaultWeeklySlots)),
  });
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
  const locationModeOptions: Array<{ value: LocationMode; label: string; icon: string; description: string }> = [
    { value: 'global', label: 'Địa điểm chung', icon: '📍', description: 'Áp dụng một địa điểm cho tất cả buổi đã bật' },
    { value: 'perDay', label: 'Theo ngày', icon: '🗓️', description: 'Chọn địa điểm riêng cho từng ngày trong tuần' },
    { value: 'perSlot', label: 'Theo buổi', icon: '🕒', description: 'Mỗi buổi Sáng/Chiều/Tối có thể đặt địa điểm riêng' },
  ];
  const [showPerDayNotes, setShowPerDayNotes] = useState(false);
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
  const timeSlotIcon: Record<string, string> = {
    'Buổi Sáng': '🌅',
    'Buổi Chiều': '☀️',
    'Buổi Tối': '🌙',
  };
  const getDaySummary = (day: DayKey) => {
    const slots = weeklyPlan[day];
    const active = slots.filter(s => s.isActive).length;
    return { total: slots.length, active };
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
  const updateWeeklySlot = (day: DayKey, slotId: string, field: keyof WeeklySlot, value: string | boolean) => {
    setWeeklyPlan(prev => {
      const next = { ...prev };
      next[day] = next[day].map(s => {
        if (s.id !== slotId) return s;
        const updated: WeeklySlot = { ...s, [field]: value };
        if (field === 'isActive' && value === false) {
          updated.locationAddress = undefined;
          updated.locationLat = undefined;
          updated.locationLng = undefined;
          updated.locationRadius = undefined;
        }
        if (field === 'isActive' && value === true) {
          const dayLocation = dailyLocations[day];
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
        setWeeklySlotLocations(prev => ({
          ...prev,
          [day]: prev[day].filter(item => item.timeSlot !== slotKey),
        }));
      }
    }
  };
  const copyDayToTarget = (source: DayKey, target: DayKey) => {
    if (source === target) return;
    setWeeklyPlan(prev => {
      const src = prev[source].map(s => ({ ...s }));
      return {
        ...prev,
        [target]: src.map(s => ({ ...s })),
      };
    });
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
  };
  const copyDayToAll = (source: DayKey) => {
    setWeeklyPlan(prev => {
      const src = prev[source].map(s => ({ ...s }));
      return {
        mon: src.map(s => ({ ...s })),
        tue: src.map(s => ({ ...s })),
        wed: src.map(s => ({ ...s })),
        thu: src.map(s => ({ ...s })),
        fri: src.map(s => ({ ...s })),
        sat: src.map(s => ({ ...s })),
        sun: src.map(s => ({ ...s })),
      };
    });
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
  };
  const resetDayPlan = (day: DayKey) => {
    setWeeklyPlan(prev => ({
      ...prev,
      [day]: defaultWeeklySlots.map(slot => ({ ...slot }))
    }));
    setWeeklySlotLocations(prev => ({
      ...prev,
      [day]: [],
    }));
  };

  const getActiveTimeSlotsForDay = (day: DayKey): TimeSlotKey[] => {
    return weeklyPlan[day]
      .filter((slot) => slot.isActive)
      .map((slot) => slotIdToTimeSlotKey[slot.id] ?? 'morning');
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
    setWeeklyPlan(prev => {
      const next = { ...prev };
      next[day] = next[day].map(slot => {
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
    setWeeklyPlan(prev => {
      const next = { ...prev };
      next[day] = next[day].map(slot => slot.id === slotId
        ? {
            ...slot,
            locationAddress: undefined,
            locationLat: undefined,
            locationLng: undefined,
            locationRadius: undefined,
          }
        : slot);
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
    setWeeklyPlan(prev => {
      const next = { ...prev };
      next[day] = next[day].map(slot => {
        if (!slot.isActive) return slot;
        return {
          ...slot,
          locationAddress: normalized.address,
          locationLat: normalized.lat,
          locationLng: normalized.lng,
          locationRadius: normalized.radius,
        };
      });
      return next;
    });
  };

  const handleClearDayLocation = (day: DayKey) => {
    setDailyLocations(prev => ({
      ...prev,
      [day]: null,
    }));
    setWeeklyPlan(prev => {
      const next = { ...prev };
      next[day] = next[day].map(slot => ({
        ...slot,
        locationAddress: undefined,
        locationLat: undefined,
        locationLng: undefined,
        locationRadius: undefined,
      }));
      return next;
    });
  };

  const handleCopyDayLocationToAll = (source: DayKey) => {
    const sourceLoc = dailyLocations[source];
    if (!sourceLoc) return;
    const baseRadius = Number.isFinite(sourceLoc.radius) ? sourceLoc.radius : 200;
    const payload: LocationData = {
      lat: sourceLoc.lat,
      lng: sourceLoc.lng,
      address: sourceLoc.address,
      radius: baseRadius,
    };
    setDailyLocations(() => {
      const next: Record<DayKey, LocationData | null> = {
        mon: { ...payload },
        tue: { ...payload },
        wed: { ...payload },
        thu: { ...payload },
        fri: { ...payload },
        sat: { ...payload },
        sun: { ...payload },
      };
      return next;
    });
    setWeeklyPlan(prev => {
      const next = { ...prev };
      dayKeyOrder.forEach(day => {
        next[day] = next[day].map(slot => slot.isActive ? {
          ...slot,
          locationAddress: payload.address,
          locationLat: payload.lat,
          locationLng: payload.lng,
          locationRadius: Number.isFinite(payload.radius) ? payload.radius : 200,
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
            setResponsiblePersons(data.responsiblePersons);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
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
    reader.onload = (evt) => setImagePreview(evt.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview('');
    setForm(prev => ({ ...prev, imageUrl: '' }));
  };

  const handleLocationChange = (location: LocationData) => {
    setLocationData(location);
    setForm(prev => ({ ...prev, location: location.address }));
  };

  const applyLocationToSlots = (address: string, scope: 'all' | DayKey) => {
    if (!address || !address.trim()) return;
    const targetDays = scope === 'all' ? dayKeyOrder : [scope];
    const activeSlotIdsByDay: Record<DayKey, string[]> = targetDays.reduce((acc, day) => {
      acc[day] = weeklyPlan[day]
        .filter(slot => slot.isActive)
        .map(slot => slot.id);
      return acc;
    }, {} as Record<DayKey, string[]>);

    setWeeklyPlan(prev => {
      const next = { ...prev };
      targetDays.forEach((day) => {
        next[day] = next[day].map((slot) => {
          if (!slot.isActive) return slot;
          const updated: WeeklySlot = {
            ...slot,
            detailedLocation: address,
          };
          if (isPerSlotMode && locationData && activeSlotIdsByDay[day].includes(slot.id)) {
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
        targetDays.forEach(day => {
          next[day] = { ...payload };
        });
        return next;
      });
    }

    if (isPerSlotMode && locationData) {
      const baseRadius = Number.isFinite(locationData.radius) ? locationData.radius : 200;
      setWeeklySlotLocations(prev => {
        const next = { ...prev };
        targetDays.forEach(day => {
          const activeSlotIds = activeSlotIdsByDay[day];
          const retained = prev[day].filter(item => !activeSlotIds.includes(timeSlotKeyToSlotId[item.timeSlot]));
          const replacements = activeSlotIds.map(slotId => {
            const slotKey = slotIdToTimeSlotKey[slotId] ?? 'morning';
            return {
              id: `${day}-${slotKey}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              timeSlot: slotKey,
              location: {
                lat: locationData.lat,
                lng: locationData.lng,
                address,
              },
              radius: baseRadius,
            };
          });
          next[day] = [...retained, ...replacements];
        });
        return next;
      });
    }
  };

  const applySuggestionToSlot = (day: DayKey, slotId: string, value: string) => {
    if (!value) return;
    updateWeeklySlot(day, slotId, 'detailedLocation', value);
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
  }, [datesInRange]);

  useEffect(() => {
    if (!isPerSlotMode) {
      setSelectedTimeSlotForLocation(null);
      return;
    }
    const activeSlots = getActiveTimeSlotsForDay(locationEditorDay);
    setSelectedTimeSlotForLocation(prev => {
      if (prev && activeSlots.includes(prev)) return prev;
      return activeSlots[0] ?? null;
    });
  }, [isPerSlotMode, locationEditorDay, weeklyPlan]);

  const getTodayDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const selectedDaySummary = getDaySummary(selectedDayKey);
  const totalWeeklyActive = dayKeyOrder.reduce((sum, key) => sum + getDaySummary(key).active, 0);

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

  const fieldLabelClass = `text-[11px] font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-300/90' : 'text-gray-500'}`;
  const fieldInputClass = `mt-1 w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:outline-none ${
    isDarkMode
      ? 'bg-gray-900/60 border-gray-600/70 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/40 shadow-inner shadow-black/20'
      : 'bg-white/95 border-blue-100 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 shadow-inner shadow-blue-200/40'
  }`;
  const helperTextClass = `text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`;
  const chipBaseClass = `inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition ${isDarkMode ? 'bg-gray-900/50 border-gray-700/70 text-gray-200' : 'bg-white/90 border-blue-100 text-gray-700 shadow-sm'}`;
  const fieldTileClass = `${isDarkMode ? 'bg-gradient-to-br from-gray-900/70 via-gray-800/70 to-gray-900/80 border border-gray-600/60 shadow-lg shadow-black/25' : 'bg-gradient-to-br from-white via-blue-50/40 to-purple-50/30 border border-blue-100/70 shadow-lg shadow-blue-200/40'} rounded-2xl p-4 transition hover:shadow-xl`;
  const fieldIconClass = `${isDarkMode ? 'bg-gradient-to-br from-blue-500/40 to-purple-500/30 text-white border border-blue-400/50' : 'bg-gradient-to-br from-blue-500/15 to-purple-500/10 text-blue-600 border border-blue-200/60'} w-9 h-9 rounded-xl flex items-center justify-center text-base`;
  const fieldTitleClass = `text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`;
  const requiredMarkClass = `${isDarkMode ? 'text-red-300' : 'text-red-500'} text-sm ml-1 align-middle`;
  const formatCoordinate = (value?: number | null) => (typeof value === 'number' && !Number.isNaN(value) ? value.toFixed(6) : 'Chưa có');
  const quickLocationOptions = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_LOCATION_TEMPLATES.forEach((item) => set.add(item));
    if (locationData?.address) set.add(locationData.address);
    dayKeyOrder.forEach((day) => {
      weeklyPlan[day].forEach((slot) => {
        if (slot.detailedLocation && slot.detailedLocation.trim().length > 0) {
          set.add(slot.detailedLocation.trim());
        }
        if (slot.locationAddress && slot.locationAddress.trim().length > 0) {
          set.add(slot.locationAddress.trim());
        }
      });
    });
    return Array.from(set);
  }, [locationData, weeklyPlan]);

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
      if (!locationData && !form.location.trim()) throw new Error('Vui lòng chọn địa điểm trên bản đồ');
      if (!form.responsiblePerson) throw new Error('Người phụ trách là bắt buộc');

      // Validate weekly sessions: at least one active slot and time validity for active slots
      const hasAnyActiveSession = dayKeyOrder.some((dk) => weeklyPlan[dk].some((s) => s.isActive));
      if (!hasAnyActiveSession) {
        throw new Error('Vui lòng bật ít nhất một buổi trong tuần (Sáng/Chiều/Tối)');
      }
      // Validate time ranges for active slots (end > start)
      const invalidTimeErrors: string[] = [];
      dayKeyOrder.forEach((dk) => {
        weeklyPlan[dk].forEach((s) => {
          if (s.isActive && s.startTime && s.endTime) {
            const st = new Date(`2000-01-01T${s.startTime}`);
            const et = new Date(`2000-01-01T${s.endTime}`);
            if (!(st instanceof Date) || isNaN(st.getTime()) || !(et instanceof Date) || isNaN(et.getTime())) {
              invalidTimeErrors.push(`${dayKeyToLabel[dk]} • ${s.name}: Thời gian không hợp lệ`);
            } else if (et <= st) {
              invalidTimeErrors.push(`${dayKeyToLabel[dk]} • ${s.name}: Giờ kết thúc phải sau giờ bắt đầu`);
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
      const schedule: Array<{ day: number; date: Date; activities: string }> = datesInRange.map((d, idx) => {
        const dayKey = getDayKeyFromDate(d);
        const slots = weeklyPlan[dayKey] || [];
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
        const freeText = daySchedules[d] || '';
        const activities = [...activeLines, freeText].filter(Boolean).join('\n');
        return {
          day: idx + 1,
          date: new Date(`${d}T00:00:00.000Z`),
          activities
        };
      });

      const locationLabel = isPerSlotMode
        ? 'Địa điểm theo buổi'
        : isPerDayMode
          ? 'Địa điểm theo ngày'
          : (form.location && form.location.trim())
            ? form.location
            : (locationData ? locationData.address : '');

      const activityData = {
        name: form.name,
        description: form.description,
        location: locationLabel,
        locationData: isGlobalMode && locationData ? {
          lat: locationData.lat,
          lng: locationData.lng,
          address: locationData.address,
          radius: locationData.radius
        } : undefined,
        maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants) : undefined,
        visibility: form.visibility,
        responsiblePerson: form.responsiblePerson,
        status: form.status,
        type: 'multiple_days' as const,
        imageUrl: imageUrl || undefined,
        overview: form.overview || undefined,
        startDate: new Date(`${form.startDate}T00:00:00.000Z`),
        endDate: new Date(`${form.endDate}T00:00:00.000Z`),
        schedule
      };

      const token = localStorage.getItem('token');
      if (!token) throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');

      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(activityData)
      });
      if (!res.ok) {
        let errText = await res.text();
        try {
          const errJson = errText ? JSON.parse(errText) : null;
          if (errJson?.details && Array.isArray(errJson.details)) {
            throw new Error(`Dữ liệu không hợp lệ: ${errJson.details.join(', ')}`);
          }
          throw new Error(errJson?.error || errJson?.message || 'Tạo hoạt động thất bại');
        } catch (parseErr) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
      }
      const result = await res.json();
      setSuccessMessage('Hoạt động nhiều ngày đã được tạo thành công!');
      setShowSuccessModal(true);

      // Reset form
      setForm({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        location: '',
        maxParticipants: '',
        visibility: 'public',
        responsiblePerson: '',
        status: 'draft',
        imageUrl: '',
        overview: ''
      });
      setLocationData(null);
      setSelectedImage(null);
      setImagePreview('');
      setDaySchedules({});
      setWeeklyPlan({
        mon: JSON.parse(JSON.stringify(defaultWeeklySlots)),
        tue: JSON.parse(JSON.stringify(defaultWeeklySlots)),
        wed: JSON.parse(JSON.stringify(defaultWeeklySlots)),
        thu: JSON.parse(JSON.stringify(defaultWeeklySlots)),
        fri: JSON.parse(JSON.stringify(defaultWeeklySlots)),
        sat: JSON.parse(JSON.stringify(defaultWeeklySlots)),
        sun: JSON.parse(JSON.stringify(defaultWeeklySlots)),
      });
      setWeeklySlotLocations(createEmptyLocationState());
      setDailyLocations(createEmptyDailyLocations());
      setLocationMode('global');
      setLocationEditorDay('mon');
      setDayLocationEditor('mon');
      setSelectedTimeSlotForLocation(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo hoạt động nhiều ngày';
      setSubmitError(msg);
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center mb-6">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${isDarkMode ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30' : 'bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200'}`}>
                <span className="text-xl">🗓️</span>
              </div>
              <h1 className={`text-2xl font-bold mb-2 bg-gradient-to-r ${isDarkMode ? 'from-blue-400 to-purple-400' : 'from-blue-600 to-purple-600'} bg-clip-text text-transparent`}>
                Tạo Hoạt Động Nhiều Ngày
              </h1>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Thiết lập khoảng ngày, lịch trình từng ngày và địa điểm
              </p>
            </div>

            {submitError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-800">{submitError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 1. Ảnh mô tả hoạt động */}
              <div className={`p-5 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-gray-700/50' : 'bg-gradient-to-br from-white/90 to-blue-50/50 backdrop-blur-xl border border-gray-200/50'} shadow-lg`}>
                <div className="flex items-center mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${isDarkMode ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/20' : 'bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200'}`}>
                    <span className="text-lg">🖼️</span>
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>1. Ảnh mô tả hoạt động</h2>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Chọn ảnh đại diện (tùy chọn)</p>
                  </div>
                </div>
                <div className={`relative overflow-hidden rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-700/50 to-gray-800/50 border border-gray-600/50' : 'bg-gradient-to-br from-white/80 to-gray-50/50 border border-gray-200/50'}`}>
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  {!selectedImage && !form.imageUrl ? (
                    <div className="p-8 text-center">
                      <div className="text-sm">Kéo & thả ảnh vào đây hoặc click để chọn file (≤10MB)</div>
                    </div>
                  ) : (
                    <div>
                      {!!(imagePreview || form.imageUrl) && (
                        <img src={imagePreview || form.imageUrl} alt="Preview" className="w-full h-64 object-cover" />
                      )}
                      <div className="p-3 flex items-center justify-between">
                        <div className="text-xs">{selectedImage ? selectedImage.name : 'Ảnh hiện tại'}</div>
                        <button type="button" onClick={handleRemoveImage} className={`${isDarkMode ? 'text-red-300' : 'text-red-600'} text-sm`}>
                          Xóa ảnh
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Thông tin cơ bản */}
              <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-820/85 via-gray-900/85 to-gray-950/85 border border-gray-700/60 backdrop-blur-xl' : 'bg-gradient-to-br from-white via-blue-50/35 to-purple-50/30 border border-blue-100/60'} shadow-lg`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isDarkMode ? 'bg-blue-600/25 border border-blue-500/40 text-blue-200' : 'bg-gradient-to-br from-blue-100 via-white to-purple-100 text-blue-600 border border-blue-200 shadow-sm'}`}>
                      📋
                      <span className={`absolute -top-2 -right-2 w-5 h-5 rounded-full text-[10px] font-semibold flex items-center justify-center ${isDarkMode ? 'bg-blue-500 text-white' : 'bg-blue-500 text-white shadow-sm'}`}>2</span>
                    </div>
                    <div>
                      <h2 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Thông tin cơ bản</h2>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-300/90' : 'text-gray-600'}`}>Thiết lập tên, phạm vi và thời gian hoạt động.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`${chipBaseClass} ${isDarkMode ? 'border-blue-500/40 bg-blue-500/15 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-600'}`}>Ngày bắt đầu: {startDateLabel ?? 'Chưa chọn'}</span>
                    <span className={`${chipBaseClass} ${isDarkMode ? 'border-purple-500/40 bg-purple-500/15 text-purple-200' : 'border-purple-200 bg-purple-50 text-purple-600'}`}>Ngày kết thúc: {endDateLabel ?? 'Chưa chọn'}</span>
                    <span className={`${chipBaseClass} ${isDarkMode ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-600'}`}>Thời lượng: {durationLabel}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <div className={`${fieldTileClass} md:col-span-2 xl:col-span-3`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={fieldIconClass}>🏷️</span>
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
                    <p className={`mt-2 ${helperTextClass}`}>Tên hiển thị trên trang chi tiết và thông báo.</p>
                  </div>

                  <div className={fieldTileClass}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={fieldIconClass}>👥</span>
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

                  <div className={fieldTileClass}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={fieldIconClass}>🗓️</span>
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
                    <p className={`mt-2 ${helperTextClass}`}>Lịch tuần dựa trên khoảng ngày này.</p>
                  </div>

                  <div className={fieldTileClass}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={fieldIconClass}>⏱️</span>
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
                    <p className={`mt-2 ${helperTextClass}`}>Không được trước ngày bắt đầu.</p>
                  </div>

                  <div className={fieldTileClass}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={fieldIconClass}>🌐</span>
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
                      <option value="public">🌍 Public - Tất cả đều xem được</option>
                      <option value="private">🔒 Private - Chỉ thành viên CLB</option>
                    </select>
                    <p className={`mt-2 ${helperTextClass}`}>Quy định ai có thể thấy hoạt động.</p>
                  </div>

                  <div className={fieldTileClass}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={fieldIconClass}>📌</span>
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
                      <option value="draft">📝 Nháp</option>
                      <option value="published">✅ Đã xuất bản</option>
                    </select>
                    <p className={`mt-2 ${helperTextClass}`}>Chọn Nháp để lưu tạm, Đã xuất bản để công bố ngay.</p>
                  </div>

                  <div className={`${fieldTileClass} md:col-span-2 xl:col-span-3`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={fieldIconClass}>📝</span>
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

              {/* 3. Lịch theo tuần */}
              <div className={`p-6 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/85 via-gray-820/80 to-gray-900/85 border border-gray-700/60' : 'bg-gradient-to-br from-blue-50/90 via-white to-purple-50/80 border border-blue-100/70'} shadow-lg backdrop-blur`}
              >
                <div className="flex flex-col gap-6">
                  <div className={`rounded-2xl border ${isDarkMode ? 'border-gray-700/60 bg-gray-900/85' : 'border-blue-100/60 bg-white/95'} px-6 py-5 shadow-lg`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className={`relative flex items-center justify-center w-14 h-14 rounded-3xl text-3xl font-semibold ${isDarkMode ? 'bg-blue-600/15 border border-blue-500/40 text-blue-200' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-white text-blue-500 border border-blue-200 shadow-sm'}`}>
                          🗓️
                          <span className={`absolute -right-2 -bottom-2 w-8 h-8 rounded-full text-sm flex items-center justify-center ${isDarkMode ? 'bg-blue-500 text-white shadow-blue-900/50' : 'bg-blue-500 text-white shadow-md'}`}>{totalWeeklyActive}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-col gap-1">
                            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Lịch tuần đa buổi</h2>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className={`${isDarkMode ? 'text-blue-300' : 'text-blue-600'} font-semibold`}>Thứ 2 → Chủ nhật</span>
                              <span className={`${isDarkMode ? 'text-gray-300/80' : 'text-gray-600'}`}>Quản lý nhanh buổi Sáng • Chiều • Tối cho từng ngày.</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 text-xs font-semibold max-w-xs">
                            <span className={`px-3.5 py-2 rounded-xl text-center ${isDarkMode ? 'bg-blue-500/20 text-blue-200 border border-blue-500/40' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>Tổng buổi bật: {totalWeeklyActive}</span>
                            <span className={`px-3.5 py-2 rounded-xl text-center ${isDarkMode ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>{dayKeyToLabel[selectedDayKey]}: {selectedDaySummary.active}/{selectedDaySummary.total}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full lg:w-auto">
                        <div className={`rounded-2xl border ${isDarkMode ? 'border-gray-700 bg-gray-900/70' : 'border-blue-100 bg-blue-50/80'} p-3 shadow-inner`}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => copyDayToTarget('mon', selectedDayKey)}
                              disabled={selectedDayKey === 'mon'}
                              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                                selectedDayKey === 'mon'
                                  ? isDarkMode ? 'bg-gray-900/60 text-blue-300/60 border border-blue-500/30 cursor-not-allowed' : 'bg-white text-blue-400 border border-blue-200/80 cursor-not-allowed'
                                  : isDarkMode ? 'bg-gray-900 text-blue-200 border border-blue-500/40 hover:bg-blue-600/30' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-100'
                              }`}
                            >Sao chép từ Thứ 2</button>
                            <button
                              type="button"
                              onClick={() => copyDayToAll(selectedDayKey)}
                              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${isDarkMode ? 'bg-gray-900 text-purple-200 border border-purple-500/40 hover:bg-purple-600/30' : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-100'}`}
                            >Áp dụng ngày này</button>
                            <button
                              type="button"
                              onClick={() => resetDayPlan(selectedDayKey)}
                              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${isDarkMode ? 'bg-gray-900 text-gray-200 border border-gray-600 hover:bg-gray-800' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                            >Đặt lại</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col xl:flex-row gap-6 items-stretch">
                    <div className="xl:w-60">
                      <div className={`h-full rounded-2xl border ${isDarkMode ? 'border-gray-700/60 bg-gray-900/45' : 'border-gray-200 bg-white/90'} px-3 py-4 shadow-inner flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar`}
                      >
                        {dayKeyOrder.map((dayKey) => {
                          const { active, total } = getDaySummary(dayKey);
                          const isSelected = selectedDayKey === dayKey;
                          return (
                            <button
                              key={`tab-${dayKey}`}
                              type="button"
                              onClick={() => setSelectedDayKey(dayKey)}
                              className={`flex-1 min-w-[110px] px-4 py-2 rounded-2xl border text-sm font-medium transition-all duration-200 text-left shadow-sm ${
                                isSelected
                                  ? isDarkMode
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-blue-500/40 shadow-lg'
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow-md shadow-blue-200'
                                  : isDarkMode
                                    ? 'bg-gray-800 border-gray-700 text-gray-200 hover:text-white hover:bg-blue-600/40 hover:border-blue-400'
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{dayKeyToLabel[dayKey]}</span>
                                <span className={`ml-2 inline-flex items-center justify-center min-w-[30px] px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  active > 0
                                    ? isDarkMode ? 'bg-green-500/40 text-green-100' : 'bg-green-100 text-green-700'
                                    : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                                }`}>{active}/{total}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className={`flex-1 rounded-2xl border ${isDarkMode ? 'border-gray-700/60 bg-gray-900/55' : 'border-gray-200 bg-white/95'} p-5 shadow-xl`}>
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                        <div>
                          <h3 className={`text-base font-semibold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Cấu hình cho <span className={`${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>{dayKeyToLabel[selectedDayKey]}</span>
                          </h3>x
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>Buổi đang bật: {selectedDaySummary.active}</span>
                          <span className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>Tổng buổi: {selectedDaySummary.total}</span>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        {weeklyPlan[selectedDayKey].map((slot) => {
                          const isActive = slot.isActive;
                          const cardClass = isActive
                            ? isDarkMode ? 'border-blue-500/60 bg-blue-900/20' : 'border-blue-300 bg-blue-50'
                            : isDarkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-white';
                          return (
                            <div key={`slot-${selectedDayKey}-${slot.id}`} className={`rounded-2xl border ${cardClass} p-4 flex flex-col gap-3 transition-shadow hover:shadow-lg`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${isActive ? 'bg-blue-500/20 text-blue-500' : isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                    {timeSlotIcon[slot.name] ?? '🕒'}
                                  </div>
                                  <div>
                                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{slot.name}</p>
                                    <p className={`text-xs ${isDarkMode ? 'text-blue-200' : 'text-blue-600'}`}>{slot.startTime} - {slot.endTime}</p>
                                  </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => updateWeeklySlot(selectedDayKey, slot.id, 'isActive', e.target.checked)}
                                    className="sr-only peer"
                                  />
                                  <div className={`relative w-11 h-6 rounded-full transition ${isActive ? 'bg-blue-500' : 'bg-gray-400'} peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-5 after:h-5 after:rounded-full after:bg-white after:transition`}></div>
                                </label>
                              </div>

                              <div className="grid gap-3 text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className={`block mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Bắt đầu</label>
                                    <input
                                      type="time"
                                      value={slot.startTime}
                                      onChange={(e) => updateWeeklySlot(selectedDayKey, slot.id, 'startTime', e.target.value)}
                                      className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    />
                                  </div>
                                  <div>
                                    <label className={`block mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Kết thúc</label>
                                    <input
                                      type="time"
                                      value={slot.endTime}
                                      onChange={(e) => updateWeeklySlot(selectedDayKey, slot.id, 'endTime', e.target.value)}
                                      className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className={`block mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Mô tả hoạt động</label>
                                  <textarea
                                    value={slot.activities}
                                    onChange={(e) => updateWeeklySlot(selectedDayKey, slot.id, 'activities', e.target.value)}
                                    rows={2}
                                    className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    placeholder="Nội dung dự kiến của buổi..."
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className={`block mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Địa điểm chi tiết</label>
                                  <input
                                    type="text"
                                    value={slot.detailedLocation}
                                    onChange={(e) => updateWeeklySlot(selectedDayKey, slot.id, 'detailedLocation', e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    placeholder="VD: Hội trường A1, phòng 101..."
                                  />
                                  <div className="flex flex-wrap items-center gap-2">
                                    {locationData?.address ? (
                                      <button
                                        type="button"
                                        onClick={() => handleApplyMainLocationToSlot(selectedDayKey, slot.id)}
                                        className={`${isDarkMode ? 'bg-blue-500/20 text-blue-100 border border-blue-500/40 hover:bg-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'} px-3 py-1.5 rounded-lg text-xs font-semibold transition`}
                                      >Dùng địa điểm chung</button>
                                    ) : null}
                                    {quickLocationOptions.length > 0 && (
                                      <select
                                        value=""
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          if (value) {
                                            applySuggestionToSlot(selectedDayKey, slot.id, value);
                                          }
                                        }}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-700'}`}
                                      >
                                        <option value="">Chọn nhanh địa điểm</option>
                                        {quickLocationOptions.map((opt) => (
                                          <option key={`${slot.id}-${opt}`} value={opt}>{opt}</option>
                                        ))}
                                      </select>
                                    )}
                                  </div>
                                  {isPerSlotMode && (
                                    <div className="space-y-2">
                                      <div className={`rounded-xl border px-3 py-2 text-xs ${slot.locationAddress ? (isDarkMode ? 'bg-green-900/20 border-green-500/30 text-green-200' : 'bg-green-50 border-green-200 text-green-700') : (isDarkMode ? 'bg-gray-800/80 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600')}`}>
                                        {slot.locationAddress ? (
                                          <div className="space-y-1">
                                            <div className="font-semibold flex items-center gap-2">
                                              <span>📍</span>
                                              <span>{slot.locationAddress}</span>
                                            </div>
                                            {(typeof slot.locationLat === 'number' && typeof slot.locationLng === 'number') && (
                                              <div className="flex items-center gap-2 font-mono">
                                                <span>🎯</span>
                                                <span>{slot.locationLat.toFixed(6)}, {slot.locationLng.toFixed(6)}</span>
                                              </div>
                                            )}
                                            {typeof slot.locationRadius === 'number' && (
                                              <div className="flex items-center gap-2">
                                                <span>📏</span>
                                                <span>Bán kính: {slot.locationRadius}m</span>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <span>ℹ️</span>
                                            <span>Chưa chọn địa điểm trên bản đồ cho buổi này.</span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenSlotLocationPicker(selectedDayKey, slot.id)}
                                          disabled={!slot.isActive}
                                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${!slot.isActive
                                            ? isDarkMode ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed' : 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed'
                                            : isDarkMode ? 'bg-purple-500/20 text-purple-100 border border-purple-500/40 hover:bg-purple-500/30' : 'bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100'}`}
                                        >
                                          Chọn trên bản đồ
                                        </button>
                                        {slot.locationAddress && (
                                          <button
                                            type="button"
                                            onClick={() => handleClearSlotLocation(selectedDayKey, slot.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isDarkMode ? 'bg-red-500/20 text-red-200 border border-red-500/40 hover:bg-red-500/30' : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'}`}
                                          >
                                            Xóa địa điểm
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Địa điểm hoạt động */}
              <div className={`p-5 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/90 via-gray-800/80 to-gray-900/90 border border-gray-700/50' : 'bg-gradient-to-br from-white/95 via-blue-50/30 to-purple-50/30 border border-gray-200/50'} shadow-lg`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30' : 'bg-gradient-to-br from-blue-100 to-purple-100 border border-blue-200/60'}`}>
                      <span className="text-lg">📍</span>
                    </div>
                    <div>
                      <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>4. Địa điểm hoạt động</h2>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-300/90' : 'text-gray-600'}`}>{locationModeSubtitles[locationMode]}</p>
                    </div>
                  </div>
                  {locationData ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className={`${chipBaseClass} ${isDarkMode ? 'border-green-500/40 bg-green-500/10 text-green-200' : 'border-green-200 bg-green-50 text-green-700'}`}>Đang dùng địa điểm chung</span>
                      <span className={`${chipBaseClass}`}>Lat: {formatCoordinate(locationData.lat)}</span>
                      <span className={`${chipBaseClass}`}>Lng: {formatCoordinate(locationData.lng)}</span>
                      <span className={`${chipBaseClass}`}>Bán kính: {locationData.radius ?? 200}m</span>
                    </div>
                  ) : (
                    <div className={`${chipBaseClass} ${isDarkMode ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200' : 'border-yellow-200 bg-yellow-50 text-yellow-700'}`}>Chưa chọn vị trí</div>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                  {locationModeOptions.map(option => {
                    const isActive = option.value === locationMode;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setLocationMode(option.value)}
                        className={`relative rounded-2xl border px-4 py-3 text-left transition ${isActive
                          ? isDarkMode ? 'border-blue-500/50 bg-blue-500/15 text-blue-100 shadow-lg shadow-blue-500/20' : 'border-blue-400 bg-blue-50 text-blue-700 shadow-md shadow-blue-200/60'
                          : isDarkMode ? 'border-gray-700 bg-gray-900/70 text-gray-300 hover:border-blue-500/40 hover:text-blue-200' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isActive ? (isDarkMode ? 'bg-blue-500/30 text-blue-100' : 'bg-blue-100 text-blue-600') : (isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-500')}`}>
                            {option.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">{option.label}</span>
                              {isActive && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDarkMode ? 'bg-blue-500/30 text-blue-100' : 'bg-blue-100 text-blue-600'}`}>Đang chọn</span>
                              )}
                            </div>
                            <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-gray-400/90' : 'text-gray-500'}`}>
                              {option.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {isGlobalMode && (
                  <div className="space-y-4">
                    <div className={`rounded-3xl border overflow-hidden ${isDarkMode ? 'border-blue-500/20 bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900' : 'border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-purple-50/30'} shadow-xl`}>
                      <div className="px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${isDarkMode ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30' : 'bg-blue-100 text-blue-600 border border-blue-200'}`}>
                            🗺️
                          </div>
                          <div>
                            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Chọn địa điểm chung trên bản đồ</h3>
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Kéo bản đồ hoặc dùng ô tìm kiếm để định vị. Click trực tiếp để thả marker, giữ và kéo để điều chỉnh.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className={`${chipBaseClass} ${isDarkMode ? 'border-blue-500/40 bg-blue-500/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-600'}`}>Bước 1: Tìm kiếm hoặc click bản đồ</span>
                              <span className={`${chipBaseClass} ${isDarkMode ? 'border-purple-500/40 bg-purple-500/10 text-purple-200' : 'border-purple-200 bg-purple-50 text-purple-600'}`}>Bước 2: Áp dụng nhanh cho các buổi</span>
                            </div>
                          </div>
                        </div>
                        {!locationData && (
                          <div className={`rounded-2xl px-4 py-3 text-xs ${isDarkMode ? 'bg-gray-800/70 border border-gray-700 text-gray-300' : 'bg-white/80 border border-gray-200 text-gray-600'} shadow-inner`}>
                            <div className="flex items-start gap-2">
                              <span>💡</span>
                              <span>Chưa có địa điểm. Hãy chọn vị trí để hiển thị chi tiết và áp dụng cho các buổi.</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <div className="absolute top-4 left-4 z-10">
                          <div className={`px-3 py-2 rounded-xl text-xs font-semibold ${isDarkMode ? 'bg-black/50 text-blue-200 border border-blue-500/30 backdrop-blur' : 'bg-white/80 text-blue-600 border border-blue-200 backdrop-blur'}`}>
                            🔍 Tìm kiếm địa chỉ hoặc bấm trực tiếp trên bản đồ để chọn nhanh
                          </div>
                        </div>
                        <div className={`rounded-t-3xl overflow-hidden border-t border-dashed ${isDarkMode ? 'border-blue-500/30' : 'border-blue-200/80'}`}>
                          <OpenStreetMapPicker
                            onLocationChange={handleLocationChange}
                            initialLocation={locationData || undefined}
                            isDarkMode={isDarkMode}
                            enforceActiveTimeSlots={false}
                          />
                        </div>
                      </div>

                      <div className="px-6 pb-6 pt-4 border-t border-white/5">
                        {locationData ? (
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className={`rounded-2xl px-4 py-3 ${isDarkMode ? 'bg-green-900/20 border border-green-500/30 text-green-100' : 'bg-green-50/90 border border-green-200/60 text-green-700'}`}>
                              <div className="flex items-start gap-2">
                                <span className="text-lg">📍</span>
                                <div>
                                  <p className="text-sm font-semibold mb-1">Địa chỉ đã chọn</p>
                                  <p className="text-xs leading-relaxed">{locationData.address}</p>
                                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-semibold">
                                    <span className={`${isDarkMode ? 'bg-black/40 text-gray-100' : 'bg-white/70 text-gray-700'} rounded-lg px-2 py-1 border border-white/10`}>Lat: {formatCoordinate(locationData.lat)}</span>
                                    <span className={`${isDarkMode ? 'bg-black/40 text-gray-100' : 'bg-white/70 text-gray-700'} rounded-lg px-2 py-1 border border-white/10`}>Lng: {formatCoordinate(locationData.lng)}</span>
                                    <span className={`${isDarkMode ? 'bg-black/40 text-gray-100' : 'bg-white/70 text-gray-700'} rounded-lg px-2 py-1 border border-white/10`}>Bán kính: {locationData.radius ?? 200}m</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className={`rounded-2xl px-4 py-3 ${isDarkMode ? 'bg-blue-900/20 border border-blue-500/30 text-blue-100' : 'bg-blue-50/90 border border-blue-200/60 text-blue-700'}`}>
                              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <span>⚙️</span>Hành động nhanh
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => applyLocationToSlots(locationData.address, 'all')}
                                  className={`${isDarkMode ? 'bg-blue-500/25 text-blue-50 border border-blue-500/40 hover:bg-blue-500/35' : 'bg-blue-500 text-white border border-blue-500 hover:bg-blue-600'} px-3.5 py-2 rounded-xl text-xs font-semibold transition`}
                                >
                                  Áp dụng cho mọi buổi đang bật
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyLocationToSlots(locationData.address, selectedDayKey)}
                                  className={`${isDarkMode ? 'bg-purple-500/20 text-purple-100 border border-purple-500/40 hover:bg-purple-500/30' : 'bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200'} px-3.5 py-2 rounded-xl text-xs font-semibold transition`}
                                >
                                  Áp dụng cho {dayKeyToLabel[selectedDayKey]}
                                </button>
                              </div>
                              <p className={`text-[11px] mt-2 ${isDarkMode ? 'text-blue-200/70' : 'text-blue-600/80'}`}>
                                Bạn có thể chỉnh sửa địa điểm chi tiết từng buổi ở phần &quot;Lịch tuần&quot; bên trên.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className={`rounded-2xl px-4 py-4 text-sm text-center border-2 border-dashed ${isDarkMode ? 'border-gray-700 text-gray-300 bg-gray-900/40' : 'border-gray-200 text-gray-600 bg-gray-50/70'}`}>
                            Chưa có địa điểm. Hãy tìm kiếm hoặc click trực tiếp trên bản đồ để thả marker.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {isPerDayMode && (
                  <div className="mt-5 space-y-4">
                    <div className={`rounded-2xl px-5 py-4 border ${isDarkMode ? 'border-purple-500/30 bg-purple-900/20 text-purple-100' : 'border-purple-200 bg-purple-50 text-purple-700'}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-xl">🗓️</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">Chọn địa điểm riêng từng ngày</p>
                          <p className="text-xs mt-1 leading-relaxed">
                            Mỗi ngày có thể đặt một địa điểm chung cho các buổi đã bật. Bạn vẫn có thể chỉnh thêm địa điểm chi tiết theo buổi nếu cần.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dayKeyOrder.map((day) => {
                        const summary = getDaySummary(day);
                        const isSelected = dayLocationEditor === day;
                        return (
                          <button
                            key={`day-mode-${day}`}
                            type="button"
                            onClick={() => setDayLocationEditor(day)}
                            className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition ${isSelected
                              ? isDarkMode ? 'bg-purple-500/30 border-purple-400 text-purple-100 shadow-lg' : 'bg-purple-100 border-purple-400 text-purple-700 shadow'
                              : isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-purple-400 hover:text-purple-200' : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-600'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{dayKeyToLabel[day]}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${summary.active > 0
                                ? isDarkMode ? 'bg-green-500/30 text-green-200' : 'bg-green-100 text-green-700'
                                : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                {summary.active}/{summary.total}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className={`rounded-3xl border overflow-hidden ${isDarkMode ? 'border-purple-500/20 bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900' : 'border-purple-200 bg-gradient-to-br from-white via-purple-50/30 to-blue-50/30'} shadow-xl`}>
                      <div className="px-6 py-5 flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Đang chọn: {dayKeyToLabel[dayLocationEditor]}</span>
                              {dailyLocations[dayLocationEditor] && (
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${isDarkMode ? 'bg-green-500/30 text-green-100' : 'bg-green-100 text-green-700'}`}>Đã có địa điểm</span>
                              )}
                            </div>
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Chọn địa điểm trên bản đồ dưới đây. Địa điểm sẽ áp dụng cho tất cả buổi đã bật trong ngày này.
                            </p>
                          </div>
                          {dailyLocations[dayLocationEditor] && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopyDayLocationToAll(dayLocationEditor)}
                                className={`${isDarkMode ? 'bg-blue-500/20 text-blue-100 border border-blue-500/40 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200'} px-3 py-1.5 rounded-lg text-xs font-semibold transition`}
                              >
                                Sao chép cho toàn tuần
                              </button>
                              <button
                                type="button"
                                onClick={() => handleClearDayLocation(dayLocationEditor)}
                                className={`${isDarkMode ? 'bg-red-500/20 text-red-200 border border-red-500/40 hover:bg-red-500/30' : 'bg-red-100 text-red-600 border border-red-200 hover:bg-red-200'} px-3 py-1.5 rounded-lg text-xs font-semibold transition`}
                              >
                                Xóa địa điểm
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="relative rounded-2xl border border-dashed border-white/10 overflow-hidden">
                          <OpenStreetMapPicker
                            key={`day-map-${dayLocationEditor}-${dailyLocations[dayLocationEditor]?.lat ?? 'empty'}-${dailyLocations[dayLocationEditor]?.lng ?? 'empty'}`}
                            onLocationChange={(location) => handleDayLocationSelect(dayLocationEditor, location)}
                            initialLocation={dailyLocations[dayLocationEditor] || undefined}
                            isDarkMode={isDarkMode}
                            enforceActiveTimeSlots={false}
                          />
                        </div>
                        {dailyLocations[dayLocationEditor] ? (
                          <div className={`rounded-2xl px-4 py-3 ${isDarkMode ? 'bg-green-900/20 border border-green-500/30 text-green-100' : 'bg-green-50/90 border border-green-200/60 text-green-700'}`}>
                            <div className="text-xs leading-relaxed">
                              <div className="font-semibold mb-1">Địa điểm ngày {dayKeyToLabel[dayLocationEditor]}</div>
                              <div>{dailyLocations[dayLocationEditor]?.address}</div>
                              <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] font-semibold">
                                <span className={`${isDarkMode ? 'bg-black/40 text-gray-100' : 'bg-white/70 text-gray-700'} rounded-lg px-2 py-1 border border-white/10`}>Lat: {formatCoordinate(dailyLocations[dayLocationEditor]?.lat)}</span>
                                <span className={`${isDarkMode ? 'bg-black/40 text-gray-100' : 'bg-white/70 text-gray-700'} rounded-lg px-2 py-1 border border-white/10`}>Lng: {formatCoordinate(dailyLocations[dayLocationEditor]?.lng)}</span>
                                <span className={`${isDarkMode ? 'bg-black/40 text-gray-100' : 'bg-white/70 text-gray-700'} rounded-lg px-2 py-1 border border-white/10`}>Bán kính: {dailyLocations[dayLocationEditor]?.radius ?? 200}m</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className={`rounded-2xl px-4 py-3 text-sm text-center border-2 border-dashed ${isDarkMode ? 'border-gray-700 text-gray-300 bg-gray-900/40' : 'border-gray-200 text-gray-600 bg-gray-50/70'}`}>
                            Chưa có địa điểm cho ngày này. Hãy chọn trên bản đồ.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {isPerSlotMode && (
                  <div className="mt-4 space-y-3">
                    <div className={`rounded-xl px-4 py-3 text-sm border ${isDarkMode ? 'border-purple-500/30 bg-purple-900/20 text-purple-200' : 'border-purple-200 bg-purple-50 text-purple-700'}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-lg">🗺️</span>
                        <div>
                          <p className="font-semibold">Đang sử dụng chế độ địa điểm theo buổi</p>
                          <p className="text-xs mt-1">
                            Bản đồ chung được ẩn để tránh trùng lặp. Nếu cần chọn địa điểm chung, tạm tắt công tắc &quot;Kích hoạt&quot; bên dưới, chọn địa điểm rồi bật lại.
                          </p>
                        </div>
                      </div>
                    </div>
                    {locationData ? (
                      <div className={`rounded-xl px-4 py-3 text-xs leading-relaxed border ${isDarkMode ? 'border-green-500/30 bg-green-900/20 text-green-100' : 'border-green-200 bg-green-50 text-green-700'}`}>
                        <div className="font-semibold mb-1">Địa điểm chung hiện tại</div>
                        <div>{locationData.address}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => applyLocationToSlots(locationData.address, 'all')}
                            className={`${isDarkMode ? 'bg-blue-500/25 text-blue-100 border border-blue-500/40 hover:bg-blue-500/35' : 'bg-blue-500 text-white border border-blue-500 hover:bg-blue-600'} px-3.5 py-2 rounded-xl transition`}
                          >Áp dụng cho mọi buổi đang bật</button>
                          <button
                            type="button"
                            onClick={() => applyLocationToSlots(locationData.address, selectedDayKey)}
                            className={`${isDarkMode ? 'bg-purple-500/20 text-purple-100 border border-purple-500/40 hover:bg-purple-500/30' : 'bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200'} px-3.5 py-2 rounded-xl transition`}
                          >Áp dụng cho {dayKeyToLabel[selectedDayKey]}</button>
                        </div>
                      </div>
                    ) : (
                      <div className={`rounded-xl px-4 py-3 text-xs border ${isDarkMode ? 'border-gray-700 bg-gray-800/60 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                        Chưa có địa điểm chung. Bạn vẫn có thể chọn địa điểm riêng cho từng buổi ở phần bên dưới.
                      </div>
                    )}
                  </div>
                )}
                {isPerSlotMode && (
                <div id="session-map-section" className="mt-6">
                  <div className={`rounded-2xl border ${isDarkMode ? 'border-gray-700/60 bg-gray-900/70' : 'border-blue-100/70 bg-white/95'} p-5 shadow-lg`}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      <div>
                        <h3 className={`text-sm font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Địa điểm theo buổi</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Chọn địa điểm riêng cho từng buổi (Sáng/Chiều/Tối) của từng ngày trong tuần.
                        </p>
                      </div>
                    </div>

                    {isPerSlotMode && (
                      <div className="mt-5 space-y-5">
                        <div className="space-y-3">
                          <div className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Chọn ngày để chỉnh địa điểm
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {dayKeyOrder.map((day) => {
                              const summary = getDaySummary(day);
                              const isSelected = locationEditorDay === day;
                              return (
                                <button
                                  key={`location-day-${day}`}
                                  type="button"
                                  onClick={() => {
                                    setLocationEditorDay(day);
                                    const activeSlots = getActiveTimeSlotsForDay(day);
                                    setSelectedTimeSlotForLocation(prev => (prev && activeSlots.includes(prev) ? prev : activeSlots[0] ?? null));
                                  }}
                                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border ${isSelected
                                    ? isDarkMode ? 'bg-blue-500/30 border-blue-400 text-blue-100 shadow-lg' : 'bg-blue-100 border-blue-400 text-blue-700 shadow'
                                    : isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-blue-400 hover:text-blue-200' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600'}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{dayKeyToLabel[day]}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${summary.active > 0
                                      ? isDarkMode ? 'bg-green-500/30 text-green-200' : 'bg-green-100 text-green-700'
                                      : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                      {summary.active}/{summary.total}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className={`rounded-2xl border ${isDarkMode ? 'border-gray-700/60 bg-gray-900/60' : 'border-gray-200 bg-white'} p-4`}>
                          {getActiveTimeSlotsForDay(locationEditorDay).length === 0 ? (
                            <div className={`text-center py-10 rounded-xl border-2 border-dashed ${isDarkMode ? 'border-gray-700 text-gray-400 bg-gray-900/50' : 'border-gray-300 text-gray-500 bg-gray-50/70'}`}>
                              <div className="text-4xl mb-3">⏳</div>
                              <div className="text-sm font-medium">Chưa có buổi nào được kích hoạt trong {dayKeyToLabel[locationEditorDay]}.</div>
                              <div className="text-xs mt-1">Hãy bật buổi Sáng/Chiều/Tối trong phần &quot;Lịch tuần&quot; trước.</div>
                            </div>
                          ) : (
                            <MultiTimeLocationPicker
                              onLocationsChange={(locations) => handleDayLocationsChange(locationEditorDay, locations)}
                              initialLocations={weeklySlotLocations[locationEditorDay]}
                              isDarkMode={isDarkMode}
                              selectedTimeSlot={selectedTimeSlotForLocation}
                              onTimeSlotSelect={(slot) => setSelectedTimeSlotForLocation(slot)}
                              activeTimeSlots={getActiveTimeSlotsForDay(locationEditorDay)}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                )}
              </div>

              {/* 5. Người phụ trách */}
              <div className={`p-5 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-gray-700/50' : 'bg-gradient-to-br from-white/90 to-blue-50/50 backdrop-blur-xl border border-gray-200/50'} shadow-lg`}>
                <div className="flex items-center mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${isDarkMode ? 'bg-gradient-to-br from-green-500/30 to-emerald-500/30 border border-green-500/20' : 'bg-gradient-to-br from-green-100 to-emerald-100 border border-green-200'}`}>
                    <span className="text-lg">👤</span>
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>5. Người phụ trách</h2>
                  </div>
                </div>
                <select name="responsiblePerson" value={form.responsiblePerson} onChange={handleChange} required className={`w-full px-3 py-2.5 rounded-lg border text-base ${isDarkMode ? 'bg-gray-600/50 border-gray-500/50 text-white' : 'bg-white/90 border-gray-300/50 text-gray-900'}`}>
                  <option value="">{loadingResponsiblePersons ? '⏳ Đang tải...' : 'Chọn người phụ trách...'}</option>
                  {!loadingResponsiblePersons && responsiblePersons.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({getRoleDisplayName(p.role)}) - {getStatusDisplayName(p.status)}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. Lịch trình theo ngày */}
              <div className={`p-5 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-gray-700/50' : 'bg-gradient-to-br from-white/90 to-blue-50/50 backdrop-blur-xl border border-gray-200/50'} shadow-lg`}>
                <div className="flex items-center mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${isDarkMode ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/20' : 'bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200'}`}>
                    <span className="text-lg">🗂️</span>
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>6. Lịch trình theo ngày</h2>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Ghi chú bổ sung theo ngày (tùy chọn). Mặc định ẩn để giao diện gọn.</p>
                  </div>
                </div>
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => setShowPerDayNotes(v => !v)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}
                  >
                    {showPerDayNotes ? 'Ẩn ghi chú theo ngày' : 'Hiện ghi chú theo ngày'}
                  </button>
                </div>
                {!showPerDayNotes ? null : datesInRange.length === 0 ? (
                  <div className={`text-center py-8 rounded-2xl border-2 border-dashed ${isDarkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50/50'}`}>
                    <div className="text-sm">Chọn ngày bắt đầu và ngày kết thúc để tạo lịch trình</div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-auto pr-1">
                    {datesInRange.map((d, idx) => (
                      <div key={d} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-gray-700/30 border-gray-600/50' : 'bg-gray-50/50 border-gray-200/50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-sm">{`Ngày ${idx + 1} — ${new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}`}</div>
                        </div>
                        <textarea
                          value={daySchedules[d] || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDaySchedules(prev => ({ ...prev, [d]: value }));
                          }}
                          rows={2}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-gray-700/50 border-gray-600/50 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                          placeholder="Mô tả hoạt động trong ngày..."
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 7. Ghi chú bổ sung */}
              <div className={`p-5 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-gray-700/50' : 'bg-gradient-to-br from-white/90 to-blue-50/50 backdrop-blur-xl border border-gray-200/50'} shadow-lg`}>
                <div className="flex items-center mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${isDarkMode ? 'bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border border-blue-500/20' : 'bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200'}`}>
                    <span className="text-lg">📝</span>
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>7. Ghi chú bổ sung</h2>
                  </div>
                </div>
                <textarea name="overview" value={form.overview} onChange={handleChange} rows={4} className={`w-full px-3 py-2.5 rounded-lg border text-sm ${isDarkMode ? 'bg-gray-600/50 border-gray-500/50 text-white' : 'bg-white/80 border-gray-300/50 text-gray-900'}`} placeholder="Thông tin chi tiết hoặc yêu cầu đặc biệt..." />
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-8 py-3 rounded-2xl text-base font-bold transition-all duration-300 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl'} ${
                    isDarkMode
                      ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white'
                      : 'bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 text-white'
                  }`}
                >
                  {isLoading ? 'Đang tạo hoạt động...' : 'Tạo hoạt động nhiều ngày'}
                </button>
              </div>
            </form>
          </div>
        </main>
        <Footer />
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`relative w-full max-w-sm rounded-2xl shadow-2xl ${isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-center p-6 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="p-6 text-center">
              <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Thành công!</h3>
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{successMessage}</p>
            </div>
            <div className="flex justify-center p-6 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-8 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 hover:scale-105"
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



