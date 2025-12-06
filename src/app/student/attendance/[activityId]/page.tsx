'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import StudentNav from '@/components/student/StudentNav';
import Footer from '@/components/common/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Camera,
  X,
  User,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Download,
  Trash2,
  Loader,
  Map,
  Navigation,
  Image as ImageIcon,
  FileText,
  UserCircle,
  Timer,
  Sun,
  Sunset,
  Moon,
  PlayCircle,
  Square,
  Eye,
  PauseCircle,
  Building2,
  Target,
  Zap,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  Sunrise,
  XCircle,
  Award,
  TrendingUp,
  Activity
} from 'lucide-react';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);

const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// Component to fit bounds - improved version with better error handling
const FitBounds = dynamic(
  () => import('react-leaflet').then((mod) => {
    const { useMap } = mod;
    return function FitBounds({ bounds }: { bounds: [number, number][] }) {
      const map = useMap();
      const [isMapReady, setIsMapReady] = React.useState(false);
      const hasFittedRef = React.useRef(false);
      
      React.useEffect(() => {
        // Set map as ready when it's initialized
        if (map) {
          const checkMapReady = () => {
            try {
              const container = map.getContainer();
              if (!container) {
                return false;
              }
              
              // Check if map panes are initialized
              const panes = (map as any)._panes;
              if (!panes || !panes.mapPane) {
                return false;
              }
              
              // Check if mapPane has position
              const mapPane = panes.mapPane;
              const mapPaneElement = mapPane as HTMLElement;
              if (!mapPaneElement || !mapPaneElement.style) {
                return false;
              }
              
              return true;
            } catch (e) {
              return false;
            }
          };
          
          map.whenReady(() => {
            // Poll until map panes are ready
            let attempts = 0;
            const maxAttempts = 20;
            
            const checkReady = () => {
              if (checkMapReady()) {
                setIsMapReady(true);
              } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkReady, 50);
              }
            };
            
            checkReady();
          });
        }
      }, [map]);
      
      React.useEffect(() => {
        if (!isMapReady || bounds.length === 0 || typeof window === 'undefined' || !map || hasFittedRef.current) {
          return;
        }
        
        try {
          const container = map.getContainer();
          if (!container) {
            return;
          }
          
          // Double check panes are ready
          const panes = (map as any)._panes;
          if (!panes || !panes.mapPane) {
            return;
          }
          
          const L = require('leaflet');
          const latlngs = bounds.map(([lat, lng]) => {
            if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
              return L.latLng(lat, lng);
            }
            return null;
          }).filter(Boolean) as any[];
          
          if (latlngs.length > 0) {
            const boundsObj = L.latLngBounds(latlngs);
            
            // Use multiple requestAnimationFrame calls to ensure DOM is fully ready
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                try {
                  if (map && map.getContainer()) {
                    const panes = (map as any)._panes;
                    if (panes && panes.mapPane) {
                      // Disable animation to avoid zoom transition issues
                      map.fitBounds(boundsObj, { 
                        padding: [50, 50], 
                        maxZoom: 16, 
                        animate: false,
                        duration: 0
                      });
                      hasFittedRef.current = true;
                    }
                  }
                } catch (fitError) {
                  console.log('Error fitting bounds:', fitError);
                }
              });
            });
          }
        } catch (error) {
          console.log('Error in FitBounds:', error);
        }
      }, [bounds, map, isMapReady]);
      
      return null;
    };
  }),
  { ssr: false }
);

interface TimeSlot {
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  activities?: string;
  detailedLocation?: string;
}

interface DaySchedule {
  day: number;
  date: string; // ISO date string
  activities: string;
}

interface LocationData {
  lat: number;
  lng: number;
  address: string;
  radius: number;
}

interface Activity {
  _id: string;
  name: string;
  date: string; // For single_day
  startDate?: string; // For multiple_days
  endDate?: string; // For multiple_days
  location: string;
  timeSlots: TimeSlot[];
  schedule?: DaySchedule[]; // For multiple_days
  type: 'single_day' | 'multiple_days';
  locationData?: LocationData;
  multiTimeLocations?: Array<{
    timeSlot: 'morning' | 'afternoon' | 'evening';
    location: {
      lat: number;
      lng: number;
      address?: string;
    };
    radius: number;
  }>;
  // Location data for multiple days
  dailyLocations?: { [day: number]: LocationData };
  perDayDetailedLocation?: { [day: number]: string };
  weeklySlotLocations?: { [day: number]: { [slot: string]: LocationData } };
}

export default function StudentAttendancePage() {
  const { activityId } = useParams();
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isDarkMode } = useDarkMode();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Helper function to get verifier name
  const getVerifierName = (verifiedBy: any, verifiedByName?: string | null): string => {
    // Priority 1: Use verifiedByName if available (manual check-in)
    if (verifiedByName && typeof verifiedByName === 'string' && verifiedByName.trim().length > 0) {
      return verifiedByName.trim();
    }
    
    if (!verifiedBy) {
      return 'Người quản trị';
    }
    
    if (typeof verifiedBy === 'object') {
      // Check name field first (most common)
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
      
      // Use email as last resort if available
      if (verifiedBy.email && typeof verifiedBy.email === 'string' && verifiedBy.email.trim().length > 0) {
        return verifiedBy.email.trim();
      }
      
      return 'Người quản trị';
    }
    
    return 'Người quản trị';
  };

  // Helper function to check if attendance is manual check-in
  const isManualCheckInRecord = (record: any): boolean => {
    if (!record) return false;
    // Check if verificationNote contains "thủ công" or "officer"
    if (record.verificationNote && typeof record.verificationNote === 'string') {
      const note = record.verificationNote.toLowerCase();
      return note.includes('thủ công') || note.includes('officer') || note.includes('điểm danh thủ công');
    }
    // Check if verifiedByName exists (manual check-in always has this)
    return !!(record.verifiedByName);
  };
  
  // Attendance state for each time slot and check-in type
  type TimeSlotName = 'Buổi Sáng' | 'Buổi Chiều' | 'Buổi Tối';
  type CheckInType = 'start' | 'end';
  const [attendanceStatus, setAttendanceStatus] = useState<Record<TimeSlotName, { start: boolean; end: boolean }>>({
    'Buổi Sáng': { start: false, end: false },
    'Buổi Chiều': { start: false, end: false },
    'Buổi Tối': { start: false, end: false }
  });
  
  // Attendance records with full details (photos, location, etc.)
  const [attendanceRecords, setAttendanceRecords] = useState<Array<{
    _id: string;
    timeSlot: string;
    checkInType: string;
    checkInTime: string;
    location: { lat: number; lng: number; address?: string };
    photoUrl?: string;
    status: string;
    verifiedBy?: any;
    verifiedByName?: string | null;
    verifiedByEmail?: string | null;
    verifiedAt?: string;
    verificationNote?: string;
    cancelReason?: string;
    lateReason?: string;
  }>>([]);
  
  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Map states
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.7325, 106.6992]); // Default TDMU
  const mapRef = useRef<any>(null);
  const [locationStatus, setLocationStatus] = useState<{ valid: boolean; distance?: number; message?: string } | null>(null);
  const [locationAddress, setLocationAddress] = useState<string | null>(null);

  // Late/Early check-in states
  const [showLateModal, setShowLateModal] = useState(false);
  const [lateInfo, setLateInfo] = useState<{ minutes: number; slotName: string; checkInType: string; isEarly?: boolean } | null>(null);
  const [lateReason, setLateReason] = useState('');
  const [pendingCheckInData, setPendingCheckInData] = useState<{ photoDataUrl: string | null; slotName?: string; checkInType?: string; checkInTime?: Date } | null>(null);

  // Image viewer modal states
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // Multiple days states
  const [selectedDaySlot, setSelectedDaySlot] = useState<{ day: number; slot: 'morning' | 'afternoon' | 'evening' } | null>(null);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [registeredDaySlots, setRegisteredDaySlots] = useState<Array<{ day: number; slot: 'morning' | 'afternoon' | 'evening' }>>([]);
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

  // Handle ESC key to close image modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showImageModal) {
        setShowImageModal(false);
        setSelectedImageUrl(null);
      }
    };

    if (showImageModal) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [showImageModal]);


  useEffect(() => {
    const fetchActivity = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      if (!isAuthenticated || !token || !activityId || !user) {
        setError('Bạn cần đăng nhập để điểm danh');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/activities/${activityId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Không thể tải thông tin hoạt động');
        }

        const responseData = await response.json();
        const rawActivity = responseData.data.activity;

        if (!rawActivity) {
          throw new Error('Không tìm thấy hoạt động');
        }

        // Check if user is registered and approved
        const userParticipant = rawActivity.participants.find(
          (p: any) => {
            const participantUserId = typeof p.userId === 'object' && p.userId !== null
              ? (p.userId._id || p.userId.$oid || String(p.userId))
              : (p.userId?.$oid || p.userId || String(p.userId));
            return participantUserId === user._id;
          }
        );

        if (!userParticipant) {
          setError('Bạn chưa đăng ký tham gia hoạt động này');
          setLoading(false);
          return;
        }

        if (userParticipant.approvalStatus !== 'approved') {
          setError('Bạn chưa được duyệt tham gia hoạt động này');
          setLoading(false);
          return;
        }

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

        setActivity({
          _id: rawActivity._id,
          name: rawActivity.name,
          date: isMultipleDays ? '' : (rawActivity.date?.$date 
            ? new Date(rawActivity.date.$date).toLocaleDateString('vi-VN')
            : new Date(rawActivity.date).toLocaleDateString('vi-VN')),
          startDate: isMultipleDays && rawActivity.startDate ? (rawActivity.startDate?.$date ? new Date(rawActivity.startDate.$date).toLocaleDateString('vi-VN') : new Date(rawActivity.startDate).toLocaleDateString('vi-VN')) : undefined,
          endDate: isMultipleDays && rawActivity.endDate ? (rawActivity.endDate?.$date ? new Date(rawActivity.endDate.$date).toLocaleDateString('vi-VN') : new Date(rawActivity.endDate).toLocaleDateString('vi-VN')) : undefined,
          location: rawActivity.location,
          timeSlots: rawActivity.timeSlots?.filter((slot: any) => slot.isActive).map((slot: any) => ({
            name: slot.name,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isActive: slot.isActive,
            activities: slot.activities || '',
            detailedLocation: slot.detailedLocation || ''
          })) || [],
          schedule: schedule.length > 0 ? schedule : undefined,
          type: rawActivity.type || 'single_day',
          locationData: rawActivity.locationData,
          multiTimeLocations: rawActivity.multiTimeLocations,
          dailyLocations,
          perDayDetailedLocation,
          weeklySlotLocations
        });

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
          
          // Save registeredDaySlots
          const userRegisteredDaySlots = userParticipant.registeredDaySlots && Array.isArray(userParticipant.registeredDaySlots)
            ? userParticipant.registeredDaySlots
            : [];
          setRegisteredDaySlots(userRegisteredDaySlots);
          
          setParsedScheduleData(parsedData);
        }

        // Set map center based on activity location (for single day)
        if (!isMultipleDays) {
          if (rawActivity.locationData && 
            typeof rawActivity.locationData.lat === 'number' && 
            typeof rawActivity.locationData.lng === 'number' &&
            !isNaN(rawActivity.locationData.lat) && 
            !isNaN(rawActivity.locationData.lng)) {
            setMapCenter([rawActivity.locationData.lat, rawActivity.locationData.lng]);
          } else if (rawActivity.multiTimeLocations && rawActivity.multiTimeLocations.length > 0) {
            const firstLocation = rawActivity.multiTimeLocations[0];
            if (firstLocation.location && 
                typeof firstLocation.location.lat === 'number' && 
                typeof firstLocation.location.lng === 'number' &&
                !isNaN(firstLocation.location.lat) && 
                !isNaN(firstLocation.location.lng)) {
              setMapCenter([firstLocation.location.lat, firstLocation.location.lng]);
            }
          }
        }

        setCheckedIn(userParticipant.checkedIn || false);
        
        // Load attendance status from API
        await loadAttendanceStatus();
        
        setLoading(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
        setLoading(false);
      }
    };

    fetchActivity();
  }, [isAuthenticated, authLoading, token, activityId, user]);

  // Helper function to reverse geocode coordinates to address
  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      // Use higher zoom level and more detailed parameters for better address
      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&extratags=1&namedetails=1`,
          {
            headers: {
              'User-Agent': 'CLB-SV5T-TDMU/1.0'
            },
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          return null;
        }
        
        const data = await response.json();
        
        // Try to get the most detailed address possible
        if (data && data.address) {
          const address = data.address;
          const parts: string[] = [];
          
          // Số nhà (nếu có)
          if (address.house_number) {
            parts.push(`Số ${address.house_number}`);
          }
          
          // Tên đường/Phố
          if (address.road) {
            parts.push(address.road);
          } else if (address.street) {
            parts.push(address.street);
          } else if (address.pedestrian) {
            parts.push(address.pedestrian);
          }
          
          // Khu phố/Hẻm
          if (address.quarter) {
            parts.push(address.quarter);
          }
          if (address.neighbourhood) {
            parts.push(address.neighbourhood);
          }
          
          // Phường/Xã
          if (address.suburb) {
            parts.push(address.suburb);
          } else if (address.village) {
            parts.push(address.village);
          }
          
          // Quận/Huyện
          if (address.city_district) {
            parts.push(address.city_district);
          } else if (address.district) {
            parts.push(address.district);
          } else if (address.county) {
            parts.push(address.county);
          }
          
          // Thành phố/Tỉnh
          if (address.city) {
            parts.push(address.city);
          } else if (address.town) {
            parts.push(address.town);
          }
          
          // Tỉnh/Thành phố (state) - chỉ thêm nếu chưa có trong city
          if (address.state && !address.city) {
            parts.push(address.state);
          }
          
          // Nếu có đủ thông tin, trả về địa chỉ đầy đủ
          if (parts.length > 0) {
            const fullAddress = parts.join(', ');
            // Nếu địa chỉ quá ngắn (chỉ có thành phố), thử dùng display_name
            if (fullAddress.length < 20 && data.display_name && data.display_name.length > fullAddress.length) {
              return data.display_name;
            }
            return fullAddress;
          }
        }
        
        // Fallback: sử dụng display_name - thường có địa chỉ đầy đủ hơn
        if (data && data.display_name) {
          return data.display_name;
        }
        
        return null;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.log('Reverse geocoding timeout');
        } else {
          console.log('Reverse geocoding fetch error:', fetchError);
        }
        return null;
      }
    } catch (error) {
      console.log('Reverse geocoding error:', error);
      return null;
    }
  };

  // Helper function to calculate distance between two GPS coordinates using Haversine formula
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

  // Helper function to find currently available check-in slot
  const findAvailableCheckInSlot = (): { day: number; slot: 'morning' | 'afternoon' | 'evening'; location: any } | null => {
    if (!activity || activity.type !== 'multiple_days' || parsedScheduleData.length === 0) {
      return null;
    }

    const now = currentTime;
    
    // Check all days and slots to find the one that's currently open for check-in
    for (const dayData of parsedScheduleData) {
      for (const slot of dayData.slots) {
        if (!slot || !slot.slotKey) continue;
        
        const daySlotKey = `Ngày ${dayData.day} - ${slot.slotKey === 'morning' ? 'Buổi Sáng' : slot.slotKey === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối'}`;
        const startRecord = (attendanceRecords || []).find(
          (r) => r.timeSlot === daySlotKey && r.checkInType === 'start'
        );
        const endRecord = (attendanceRecords || []).find(
          (r) => r.timeSlot === daySlotKey && r.checkInType === 'end'
        );
        
        const slotDate = new Date(dayData.date);
        const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
        const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
        
        const slotStartTime = new Date(slotDate);
        slotStartTime.setHours(startHours, startMinutes, 0, 0);
        const slotEndTime = new Date(slotDate);
        slotEndTime.setHours(endHours, endMinutes, 0, 0);
        
        const onTimeStartStart = new Date(slotStartTime);
        onTimeStartStart.setMinutes(onTimeStartStart.getMinutes() - 15);
        const lateStartEnd = new Date(slotStartTime);
        lateStartEnd.setMinutes(lateStartEnd.getMinutes() + 30);
        
        const onTimeEndStart = new Date(slotEndTime);
        onTimeEndStart.setMinutes(onTimeEndStart.getMinutes() - 15);
        const lateEndEnd = new Date(slotEndTime);
        lateEndEnd.setMinutes(lateEndEnd.getMinutes() + 30);
        
        const canCheckInStart = !startRecord && now >= onTimeStartStart && now <= lateStartEnd;
        const canCheckInEnd = !endRecord && now >= onTimeEndStart && now <= lateEndEnd;
        
        if (canCheckInStart || canCheckInEnd) {
          const location = slot.mapLocation || dayData.dayMapLocation;
          return {
            day: dayData.day,
            slot: slot.slotKey as 'morning' | 'afternoon' | 'evening',
            location: location
          };
        }
      }
    }
    
    return null;
  };

  // Check if user location is within allowed radius
  // For multiple days, can optionally specify which slot to check (day and slotKey)
  const checkLocationValidity = (userLat: number, userLng: number, targetSlot?: { day: number; slot: 'morning' | 'afternoon' | 'evening' }): { valid: boolean; distance?: number; message?: string } => {
    if (!activity) {
      return { valid: false, message: 'Không tìm thấy thông tin hoạt động' };
    }

    // Handle multiple days activities
    if (activity.type === 'multiple_days') {
      // Check if there's a slot currently open for check-in
      const availableSlot = findAvailableCheckInSlot();
      
      // If there's a slot currently open, ONLY check against that slot
      if (availableSlot && availableSlot.location) {
        const location = availableSlot.location;
        if (location.lat && location.lng) {
          const distance = calculateDistance(
            userLat,
            userLng,
            location.lat,
            location.lng
          );
          
          const slotName = availableSlot.slot === 'morning' ? 'Buổi Sáng' : availableSlot.slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
          const radius = location.radius || 200;
          
          if (distance <= radius) {
            return { valid: true, distance };
          } else {
            return {
              valid: false,
              distance,
              message: `Bạn đang cách vị trí điểm danh (Ngày ${availableSlot.day} - ${slotName}) ${distance.toFixed(0)}m. Vui lòng đến đúng vị trí (trong bán kính ${radius}m) để điểm danh.`
            };
          }
        }
      }
      
      // If no slot is currently open, allow user to select a day/slot and check against selected slot
      // Priority 1: Check against the specific slot that user wants to check-in (if provided)
      if (targetSlot) {
        const dayData = parsedScheduleData.find(d => d.day === targetSlot.day);
        if (dayData) {
          const slot = dayData.slots.find(s => s.slotKey === targetSlot.slot);
          const location = slot?.mapLocation || dayData.dayMapLocation;
          
          if (location && location.lat && location.lng) {
            const distance = calculateDistance(
              userLat,
              userLng,
              location.lat,
              location.lng
            );
            
            const slotName = targetSlot.slot === 'morning' ? 'Buổi Sáng' : targetSlot.slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
            const radius = location.radius || 200;
            
            if (distance <= radius) {
              return { valid: true, distance };
            } else {
              return {
                valid: false,
                distance,
                message: `Bạn đang cách vị trí điểm danh (Ngày ${targetSlot.day} - ${slotName}) ${distance.toFixed(0)}m. Vui lòng đến đúng vị trí (trong bán kính ${radius}m) để điểm danh.`
              };
            }
          }
        }
      }
      
      // Priority 2: Check against selected slot (when user has selected a specific day/slot)
      if (selectedDaySlot) {
        const dayData = parsedScheduleData.find(d => d.day === selectedDaySlot.day);
        if (dayData) {
          const slot = dayData.slots.find(s => s.slotKey === selectedDaySlot.slot);
          const location = slot?.mapLocation || dayData.dayMapLocation;
          
          if (location && location.lat && location.lng) {
            const distance = calculateDistance(
              userLat,
              userLng,
              location.lat,
              location.lng
            );
            
            const slotName = selectedDaySlot.slot === 'morning' ? 'Buổi Sáng' : selectedDaySlot.slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
            const radius = location.radius || 200;
            
            if (distance <= radius) {
              return { valid: true, distance };
            } else {
              return {
                valid: false,
                distance,
                message: `Bạn đang cách vị trí điểm danh (Ngày ${selectedDaySlot.day} - ${slotName}) ${distance.toFixed(0)}m. Vui lòng đến đúng vị trí (trong bán kính ${radius}m) để điểm danh.`
              };
            }
          }
        }
      }
      
      // If no location found, allow check-in
      return { valid: true, message: 'Hoạt động không yêu cầu vị trí cụ thể cho buổi này' };
    }

    // If no location data is required, allow check-in
    if (!activity.locationData && (!activity.multiTimeLocations || activity.multiTimeLocations.length === 0)) {
      return { valid: true, message: 'Hoạt động không yêu cầu vị trí cụ thể' };
    }

    // Check single location
    if (activity.locationData) {
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
          message: `Bạn đang cách vị trí hoạt động ${distance.toFixed(0)}m. Vui lòng đến đúng vị trí (trong bán kính ${activity.locationData.radius}m) để điểm danh.`
        };
      }
    }

    // Check multi-time locations
    if (activity.multiTimeLocations && activity.multiTimeLocations.length > 0) {
      // Get current time slot
      const timeSlotInfo = getCurrentTimeSlot();
      let targetLocation = null;

      if (timeSlotInfo.slot) {
        // Map time slot name to timeSlot enum
        const timeSlotMap: { [key: string]: 'morning' | 'afternoon' | 'evening' } = {
          'Buổi Sáng': 'morning',
          'Buổi Chiều': 'afternoon',
          'Buổi Tối': 'evening'
        };
        const timeSlot = timeSlotMap[timeSlotInfo.slot.name];
        
        if (timeSlot) {
          targetLocation = activity.multiTimeLocations.find(mtl => mtl.timeSlot === timeSlot);
        }
      }

      // If no current time slot, check all locations
      if (!targetLocation && activity.multiTimeLocations.length > 0) {
        // Check against all locations and find the closest one
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
            message: `Bạn đang cách vị trí ${timeSlotNames[closestLocation.timeSlot]} ${minDistance.toFixed(0)}m. Vui lòng đến đúng vị trí (trong bán kính ${closestLocation.radius}m) để điểm danh.`
          };
        }
      } else if (targetLocation) {
        const distance = calculateDistance(
          userLat,
          userLng,
          targetLocation.location.lat,
          targetLocation.location.lng
        );
        
        if (distance <= targetLocation.radius) {
          return { valid: true, distance };
        } else {
          const timeSlotNames: { [key: string]: string } = {
            'morning': 'Buổi Sáng',
            'afternoon': 'Buổi Chiều',
            'evening': 'Buổi Tối'
          };
          return {
            valid: false,
            distance,
            message: `Bạn đang cách vị trí ${timeSlotNames[targetLocation.timeSlot]} ${distance.toFixed(0)}m. Vui lòng đến đúng vị trí (trong bán kính ${targetLocation.radius}m) để điểm danh.`
          };
        }
      }
    }

    // Default: allow check-in if no specific location requirement
    return { valid: true };
  };

  // Helper function to parse time string (HH:MM) to Date
  const parseTimeToDate = (timeString: string, baseDate: Date): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // Helper function to format minutes to "X giờ Y phút"
  const formatMinutesToHours = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} phút`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} giờ`;
    }
    return `${hours} giờ ${remainingMinutes} phút`;
  };

  // Helper function to format time (HH:MM)
  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
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

  // Helper function để lấy dayKey từ date (Thứ 2 = 0, Chủ nhật = 6)
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

  // Helper function to check if user has registered for a specific day
  const hasRegisteredForDay = (dayNumber: number): boolean => {
    if (registeredDaySlots.length === 0) return false;
    return registeredDaySlots.some(ds => ds.day === dayNumber);
  };

  // Helper function to check if user has registered for a specific day and slot
  const hasRegisteredForSlot = (dayNumber: number, slotKey: 'morning' | 'afternoon' | 'evening'): boolean => {
    if (registeredDaySlots.length === 0) return false;
    return registeredDaySlots.some(ds => ds.day === dayNumber && ds.slot === slotKey);
  };

  // Nhóm các ngày theo tuần (từ thứ 2 đến chủ nhật) - hiển thị tất cả các ngày
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

  // Tự động chọn ngày có dữ liệu khi chưa có ngày nào được chọn (ưu tiên ngày hiện tại, sau đó ngày gần nhất sắp tới) - chỉ chọn ngày đã đăng ký
  useEffect(() => {
    if (!hasInitialized && !selectedDaySlot && parsedScheduleData.length > 0 && registeredDaySlots.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Filter to only registered days
      const registeredDays = new Set(registeredDaySlots.map(ds => ds.day));
      const registeredScheduleData = parsedScheduleData.filter(d => registeredDays.has(d.day));
      
      if (registeredScheduleData.length === 0) return;
      
      // Try to find current day
      const currentDay = registeredScheduleData.find(d => {
        if (!d.date) return false;
        const scheduleDate = new Date(d.date);
        scheduleDate.setHours(0, 0, 0, 0);
        return scheduleDate.getTime() === today.getTime();
      });
      
      let dayToSelect: typeof registeredScheduleData[0] | null = null;
      
      if (currentDay && currentDay.slots.length > 0) {
        // Select current day
        dayToSelect = currentDay;
      } else {
        // Find nearest upcoming day (closest future day)
        const upcomingDays = registeredScheduleData
          .map(d => {
            if (!d.date) return null;
            const scheduleDate = new Date(d.date);
            scheduleDate.setHours(0, 0, 0, 0);
            return { day: d, date: scheduleDate };
          })
          .filter((item): item is { day: typeof registeredScheduleData[0]; date: Date } => 
            item !== null && item.date >= today && item.day.slots.length > 0
          )
          .sort((a, b) => a.date.getTime() - b.date.getTime());
        
        if (upcomingDays.length > 0) {
          // Select nearest upcoming day
          dayToSelect = upcomingDays[0].day;
        } else {
          // If no upcoming days, select first day with slots
          const firstDayWithSlots = registeredScheduleData.find(d => d.slots.length > 0);
          if (firstDayWithSlots) {
            dayToSelect = firstDayWithSlots;
          }
        }
      }
      
      if (dayToSelect && dayToSelect.slots.length > 0) {
        setSelectedDaySlot({ day: dayToSelect.day, slot: dayToSelect.slots[0].slotKey });
        setHasInitialized(true);
      }
    }
  }, [parsedScheduleData, registeredDaySlots, selectedDaySlot, hasInitialized]);

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
        data: null as (typeof parsedScheduleData[0] | null)
      }));
    }
    
    // Tạo mảng 7 ngày từ thứ 2 đến chủ nhật, đảm bảo đúng thứ tự
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const dayKey = i; // 0 = Monday, 6 = Sunday
        // Tìm ngày có dayKey tương ứng trong tuần hiện tại (chỉ hiển thị ngày đã đăng ký)
        const dayInWeek = weekInfo.currentWeek.days.find(d => d.dayKey === dayKey && d.data);
      
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

  // Update map center when selectedDaySlot changes (for multiple days)
  useEffect(() => {
    if (activity?.type === 'multiple_days' && selectedDaySlot && parsedScheduleData.length > 0) {
      const dayData = parsedScheduleData.find(d => d.day === selectedDaySlot.day);
      if (dayData) {
        const slot = dayData.slots.find(s => s.slotKey === selectedDaySlot.slot);
        const location = slot?.mapLocation || dayData.dayMapLocation;
        console.log('Updating map center for slot:', {
          selectedDaySlot,
          slotKey: slot?.slotKey,
          slotName: slot?.name,
          hasSlotLocation: !!slot?.mapLocation,
          hasDayLocation: !!dayData.dayMapLocation,
          location: location
        });
        if (location && location.lat && location.lng &&
            typeof location.lat === 'number' && 
            typeof location.lng === 'number' &&
            !isNaN(location.lat) &&
            !isNaN(location.lng)) {
          setMapCenter([location.lat, location.lng]);
        }
      }
    }
  }, [selectedDaySlot, parsedScheduleData, activity?.type]);

  // Helper function to get check-in time window for a slot
  // Returns both on-time window (auto-approve) and late window (pending)
  // Supports both single_day and multiple_days activities
  const getCheckInTimeWindow = (slot: TimeSlot | { startTime: string; endTime: string }, checkInType: 'start' | 'end', slotDate?: string): { 
    onTimeStart: string; 
    onTimeEnd: string; 
    lateStart: string; 
    lateEnd: string;
  } | null => {
    if (!activity) return null;
    
    try {
      let activityDate: Date;
      
      // Handle multiple days - use slotDate if provided
      if (activity.type === 'multiple_days' && slotDate) {
        activityDate = new Date(slotDate);
      } else if (activity.type === 'single_day') {
        const dateParts = activity.date.split('/');
        if (dateParts.length === 3) {
          activityDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
        } else {
          activityDate = new Date(activity.date);
        }
      } else {
        return null;
      }
      
      if (checkInType === 'start') {
        const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
        const slotStartTime = new Date(activityDate);
        slotStartTime.setHours(startHours, startMinutes, 0, 0);
        
        // On-time window: 15 minutes before and 15 minutes after start (auto-approve)
        const onTimeStart = new Date(slotStartTime);
        onTimeStart.setMinutes(onTimeStart.getMinutes() - 15);
        const onTimeEnd = new Date(slotStartTime);
        onTimeEnd.setMinutes(onTimeEnd.getMinutes() + 15);
        
        // Late window: from 15 minutes after to 30 minutes after start (pending, needs approval)
        const lateStart = new Date(slotStartTime);
        lateStart.setMinutes(lateStart.getMinutes() + 15);
        const lateEnd = new Date(slotStartTime);
        lateEnd.setMinutes(lateEnd.getMinutes() + 30);
        
        return {
          onTimeStart: formatTime(onTimeStart),
          onTimeEnd: formatTime(onTimeEnd),
          lateStart: formatTime(lateStart),
          lateEnd: formatTime(lateEnd)
        };
      } else {
        const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
        const slotEndTime = new Date(activityDate);
        slotEndTime.setHours(endHours, endMinutes, 0, 0);
        
        // On-time window: 15 minutes before and 15 minutes after end (auto-approve)
        const onTimeStart = new Date(slotEndTime);
        onTimeStart.setMinutes(onTimeStart.getMinutes() - 15);
        const onTimeEnd = new Date(slotEndTime);
        onTimeEnd.setMinutes(onTimeEnd.getMinutes() + 15);
        
        // Late window: from 15 minutes after to 30 minutes after end (pending, needs approval)
        const lateStart = new Date(slotEndTime);
        lateStart.setMinutes(lateStart.getMinutes() + 15);
        const lateEnd = new Date(slotEndTime);
        lateEnd.setMinutes(lateEnd.getMinutes() + 30);
        
        return {
          onTimeStart: formatTime(onTimeStart),
          onTimeEnd: formatTime(onTimeEnd),
          lateStart: formatTime(lateStart),
          lateEnd: formatTime(lateEnd)
        };
      }
    } catch (e) {
      return null;
    }
  };

  // Helper function to calculate late/early time for an attendance record
  // Supports both single_day and multiple_days activities
  const calculateLateEarlyForRecord = (record: {
    timeSlot: string;
    checkInType: string;
    checkInTime: string;
    lateReason?: string;
  }): { isLate: boolean; isEarly: boolean; isOnTime?: boolean; minutes?: number; isInLateWindow?: boolean } | null => {
    if (!activity) return null;
    
    const checkInTime = new Date(record.checkInTime);
    
    try {
      let activityDate: Date;
      let slotStartTime: Date;
      let slotEndTime: Date;
      
      // Handle multiple days - parse slotName format "Ngày X - Buổi Y"
      if (activity.type === 'multiple_days') {
        const dayMatch = record.timeSlot.match(/Ngày (\d+)/);
        const slotNameMatch = record.timeSlot.match(/Buổi (Sáng|Chiều|Tối)/);
        
        if (!dayMatch || !slotNameMatch) return null;
        
        const day = parseInt(dayMatch[1]);
        const slotName = slotNameMatch[1];
        const slotKey = slotName === 'Sáng' ? 'morning' : slotName === 'Chiều' ? 'afternoon' : 'evening';
        
        const dayData = parsedScheduleData.find(d => d.day === day);
        if (!dayData) return null;
        
        const slot = dayData.slots.find(s => s.slotKey === slotKey);
        if (!slot) return null;
        
        activityDate = new Date(dayData.date);
        const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
        const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
        
        slotStartTime = new Date(activityDate);
        slotStartTime.setHours(startHours, startMinutes, 0, 0);
        
        slotEndTime = new Date(activityDate);
        slotEndTime.setHours(endHours, endMinutes, 0, 0);
      } else {
        // Handle single day
        if (!activity.timeSlots) return null;
        
        const timeSlot = activity.timeSlots.find(ts => ts.name === record.timeSlot && ts.isActive);
        if (!timeSlot) return null;
        
        const dateParts = activity.date.split('/');
        if (dateParts.length === 3) {
          activityDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
        } else {
          activityDate = new Date(activity.date);
        }
        
        const [startHours, startMinutes] = timeSlot.startTime.split(':').map(Number);
        const [endHours, endMinutes] = timeSlot.endTime.split(':').map(Number);
        
        slotStartTime = new Date(activityDate);
        slotStartTime.setHours(startHours, startMinutes, 0, 0);
        
        slotEndTime = new Date(activityDate);
        slotEndTime.setHours(endHours, endMinutes, 0, 0);
      }
      
      let targetTime: Date;
      if (record.checkInType === 'start') {
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
      
      // Calculate difference based on actual photo capture time (checkInTime)
      const timeDifference = checkInTime.getTime() - targetTime.getTime();
      const minutesDifference = Math.round(timeDifference / (1000 * 60));
      
      // Check if within on-time window (auto-approve)
      if (checkInTime >= onTimeStart && checkInTime <= onTimeEnd) {
        return { isLate: false, isEarly: false, isOnTime: true, isInLateWindow: false };
      }
      
      // Check if within late window (pending, but valid)
      if (checkInTime > onTimeEnd && checkInTime <= lateWindowEnd) {
        const minutesLate = Math.abs(minutesDifference);
        return { isLate: true, isEarly: false, minutes: minutesLate, isInLateWindow: true };
      }
      
      // Check if early (before on-time window)
      if (checkInTime < onTimeStart) {
        const minutesEarly = Math.abs(minutesDifference);
        return { isLate: false, isEarly: true, minutes: minutesEarly, isInLateWindow: false };
      }
      
      // Check if too late (after late window, > 30 minutes after target time)
      if (checkInTime > lateWindowEnd) {
        const minutesLate = Math.abs(minutesDifference);
        return { isLate: true, isEarly: false, minutes: minutesLate, isInLateWindow: false };
      }
      
      // Default: no early/late badge
      return null;
    } catch (e) {
      return null;
    }
  };

  // Check if check-in is late or early (using currentTime from state)
  const checkIfLate = (slotName: string, checkInType: string): { isLate: boolean; isEarly?: boolean; minutesLate?: number; minutesEarly?: number; isValid?: boolean; isInLateWindow?: boolean } => {
    return checkIfLateForTime(slotName, checkInType, currentTime);
  };

  // Check if check-in is late or early for a specific time (helper function)
  // Returns: isLate, isEarly, minutesLate, minutesEarly, isValid (whether check-in is allowed), isInLateWindow (within late window)
  // Supports both single_day and multiple_days activities
  const checkIfLateForTime = (slotName: string, checkInType: string, checkInTime: Date): { 
    isLate: boolean; 
    isEarly?: boolean; 
    minutesLate?: number; 
    minutesEarly?: number; 
    isValid?: boolean; 
    isInLateWindow?: boolean;
    isOnTime?: boolean;
  } => {
    if (!activity) {
      return { isLate: false, isValid: false };
    }

    const now = checkInTime;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let activityDate: Date;
    let slotStartTime: Date;
    let slotEndTime: Date;

    // Handle multiple days - parse slotName format "Ngày X - Buổi Y"
    if (activity.type === 'multiple_days') {
      const dayMatch = slotName.match(/Ngày (\d+)/);
      const slotNameMatch = slotName.match(/Buổi (Sáng|Chiều|Tối)/);
      
      if (!dayMatch || !slotNameMatch) {
        return { isLate: false, isValid: false };
      }
      
      const day = parseInt(dayMatch[1]);
      const slotNamePart = slotNameMatch[1];
      const slotKey = slotNamePart === 'Sáng' ? 'morning' : slotNamePart === 'Chiều' ? 'afternoon' : 'evening';
      
      const dayData = parsedScheduleData.find(d => d.day === day);
      if (!dayData) {
        return { isLate: false, isValid: false };
      }
      
      const slot = dayData.slots.find(s => s.slotKey === slotKey);
      if (!slot) {
        return { isLate: false, isValid: false };
      }
      
      activityDate = new Date(dayData.date);
      const activityDateOnly = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Check if the check-in date matches the slot date
      if (activityDateOnly.getTime() !== todayOnly.getTime()) {
        return { isLate: false, isValid: false };
      }
      
      const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
      const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
      
      slotStartTime = new Date(activityDate);
      slotStartTime.setHours(startHours, startMinutes, 0, 0);
      
      slotEndTime = new Date(activityDate);
      slotEndTime.setHours(endHours, endMinutes, 0, 0);
    } else {
      // Handle single day
      if (!activity.timeSlots || activity.timeSlots.length === 0) {
        return { isLate: false, isValid: false };
      }

      try {
        const dateParts = activity.date.split('/');
        if (dateParts.length === 3) {
          activityDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
        } else {
          activityDate = new Date(activity.date);
        }
      } catch (e) {
        return { isLate: false, isValid: false };
      }

      const activityDateOnly = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      if (activityDateOnly.getTime() !== todayOnly.getTime()) {
        return { isLate: false, isValid: false };
      }

      // Find the time slot
      const timeSlot = activity.timeSlots.find(ts => ts.name === slotName && ts.isActive);
      if (!timeSlot) {
        return { isLate: false, isValid: false };
      }

      // Parse start and end times
      const [startHours, startMinutes] = timeSlot.startTime.split(':').map(Number);
      const [endHours, endMinutes] = timeSlot.endTime.split(':').map(Number);
      
      slotStartTime = new Date(activityDate);
      slotStartTime.setHours(startHours, startMinutes, 0, 0);
      
      slotEndTime = new Date(activityDate);
      slotEndTime.setHours(endHours, endMinutes, 0, 0);
    }

    let targetTime: Date;
    if (checkInType === 'start') {
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
    if (now >= onTimeStart && now <= onTimeEnd) {
      return { isLate: false, isEarly: false, isOnTime: true, isValid: true, isInLateWindow: false };
    }

    // Check if within late window (pending, but valid)
    if (now > onTimeEnd && now <= lateWindowEnd) {
      const minutesLate = Math.round((now.getTime() - targetTime.getTime()) / (1000 * 60));
      return { isLate: true, isEarly: false, minutesLate, isValid: true, isInLateWindow: true };
    }

    // Check if too early (before on-time window)
    if (now < onTimeStart) {
      const minutesEarly = Math.round((targetTime.getTime() - now.getTime()) / (1000 * 60));
      return { isLate: false, isEarly: true, minutesEarly, isValid: false, isInLateWindow: false };
    }

    // Check if too late (after late window, > 30 minutes after target time)
    if (now > lateWindowEnd) {
      const minutesLate = Math.round((now.getTime() - targetTime.getTime()) / (1000 * 60));
      return { isLate: true, isEarly: false, minutesLate, isValid: false, isInLateWindow: false };
    }

    return { isLate: false, isValid: false };
  };

  // Check which time slot is currently active
  const getCurrentTimeSlot = (): { slot: TimeSlot | null; status: 'before' | 'during' | 'after' | 'none' } => {
    if (!activity || !activity.timeSlots || activity.timeSlots.length === 0) {
      return { slot: null, status: 'none' };
    }

    const now = currentTime;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Parse activity date
    let activityDate: Date;
    try {
      const dateParts = activity.date.split('/');
      if (dateParts.length === 3) {
        activityDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
      } else {
        activityDate = new Date(activity.date);
      }
    } catch (e) {
      return { slot: null, status: 'none' };
    }

    const activityDateOnly = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (activityDateOnly.getTime() !== todayOnly.getTime()) {
      return { slot: null, status: 'none' };
    }

    const CHECK_IN_BUFFER_MINUTES = 10; // 10 phút kể từ thời gian bắt đầu

    for (const slot of activity.timeSlots) {
      const startTime = parseTimeToDate(slot.startTime, today);
      const endTime = parseTimeToDate(slot.endTime, today);
      // Chỉ cho phép điểm danh trong 10 phút đầu từ khi bắt đầu
      const checkInStart = startTime;
      const checkInEnd = new Date(startTime.getTime() + CHECK_IN_BUFFER_MINUTES * 60 * 1000);

      if (now >= checkInStart && now <= checkInEnd) {
        if (now >= startTime && now <= checkInEnd) {
          return { slot, status: 'during' };
        }
      }
    }

    return { slot: null, status: 'none' };
  };

  // Get user location for map and check validity
  useEffect(() => {
    if (navigator.geolocation && activity) {
      const getLocation = async () => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setUserLocation(location);
            
            // Get address from coordinates
            const address = await reverseGeocode(location.lat, location.lng);
            if (address) {
              setLocationAddress(address);
            }
            
            // Check location validity
            try {
              const locationCheck = checkLocationValidity(location.lat, location.lng);
              setLocationStatus(locationCheck);
            } catch (error) {
              console.error('Error checking location validity:', error);
              setLocationStatus({ valid: false, message: 'Lỗi khi kiểm tra vị trí' });
            }
          },
          (error) => {
            console.log('Could not get user location:', error);
            let errorMessage = 'Không thể lấy vị trí GPS';
            
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Bạn đã từ chối quyền truy cập vị trí. Vui lòng bật GPS và cho phép quyền truy cập vị trí trong cài đặt trình duyệt.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Thông tin vị trí không khả dụng. Vui lòng kiểm tra GPS và thử lại.';
                break;
              case error.TIMEOUT:
                errorMessage = 'Hết thời gian chờ lấy vị trí. Vui lòng thử lại.';
                break;
            }
            
            setLocationStatus({ valid: false, message: errorMessage });
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      };

      getLocation();
      
      // Refresh location every 30 seconds
      const interval = setInterval(getLocation, 30000);
      
      return () => clearInterval(interval);
    } else if (!navigator.geolocation) {
      setLocationStatus({ valid: false, message: 'Trình duyệt không hỗ trợ định vị GPS' });
    }
  }, [activity]);

  // Re-check location validity when selectedDaySlot changes (for multiple days)
  useEffect(() => {
    if (userLocation && activity) {
      try {
        const locationCheck = checkLocationValidity(userLocation.lat, userLocation.lng);
        setLocationStatus(locationCheck);
        console.log('Location status updated for slot:', {
          selectedDaySlot,
          locationStatus: locationCheck,
          userLocation
        });
      } catch (error) {
        console.error('Error checking location validity:', error);
        setLocationStatus({ valid: false, message: 'Lỗi khi kiểm tra vị trí' });
      }
    } else if (activity?.type === 'multiple_days' && selectedDaySlot) {
      // Check if selected slot has location
      const dayData = parsedScheduleData.find(d => d.day === selectedDaySlot.day);
      if (dayData) {
        const slot = dayData.slots.find(s => s.slotKey === selectedDaySlot.slot);
        const location = slot?.mapLocation || dayData.dayMapLocation;
        
        if (!location || !location.lat || !location.lng) {
          // No location for this slot
          setLocationStatus({ 
            valid: true, 
            message: 'Buổi này không yêu cầu vị trí cụ thể' 
          });
        }
      }
    }
  }, [selectedDaySlot, parsedScheduleData, activity?.type, userLocation]);

  // Set video ref when video element is ready
  useEffect(() => {
    if (showCamera && stream && videoRef) {
      // Only set srcObject if it's not already set
      if (videoRef.srcObject !== stream) {
        videoRef.srcObject = stream;
      }
      
      // Play video with error handling
      const playPromise = videoRef.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Video is playing successfully
          })
          .catch((err) => {
            // Ignore AbortError - it's expected when video source changes
            if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
              console.error('Error playing video:', err);
            }
          });
      }
    }
  }, [showCamera, stream]);

  // Open camera
  const openCamera = async () => {
    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ camera');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }, 
        audio: false
      });
      
      setStream(mediaStream);
      setShowCamera(true);
      setCapturedPhoto(null);
      setError(null); // Clear any previous errors
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      let errorMessage = 'Không thể truy cập camera. ';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage += 'Vui lòng cho phép quyền truy cập camera trong cài đặt trình duyệt.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage += 'Không tìm thấy camera trên thiết bị.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage += 'Camera đang được sử dụng bởi ứng dụng khác.';
      } else {
        errorMessage += err.message || 'Vui lòng thử lại sau.';
      }
      
      setError(errorMessage);
      setShowCamera(false);
    }
  };

  // Close camera
  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setCapturedPhoto(null);
  };

  // Capture photo with anti-fraud measures
  const capturePhoto = async () => {
    if (!videoRef || !stream) return;
    
    setIsCapturing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.videoWidth;
      canvas.height = videoRef.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Không thể khởi tạo canvas');
      }

      // Draw video frame
      ctx.drawImage(videoRef, 0, 0);
      
      // Add anti-fraud metadata as watermark
      const now = new Date();
      const timestamp = now.toLocaleString('vi-VN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh'
      });
      
      // Get location if available
      let locationInfo = {
        address: '',
        lat: 0,
        lng: 0,
        distance: null as number | null,
        isValid: false
      };
      
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          locationInfo.lat = position.coords.latitude;
          locationInfo.lng = position.coords.longitude;
          
          // Try to get address from coordinates
          const address = await reverseGeocode(locationInfo.lat, locationInfo.lng);
          if (address) {
            locationInfo.address = address;
            setLocationAddress(address);
          } else {
            locationInfo.address = `Tọa độ: ${locationInfo.lat.toFixed(6)}, ${locationInfo.lng.toFixed(6)}`;
          }
          
          // Check location validity and get distance
          if (activity) {
            const locationCheck = checkLocationValidity(locationInfo.lat, locationInfo.lng);
            locationInfo.isValid = locationCheck.valid;
            locationInfo.distance = locationCheck.distance || null;
          }
        }
      } catch (e) {
        locationInfo.address = 'Không thể xác định vị trí';
      }

      // Calculate watermark height based on content
      const hasDistance = locationInfo.distance !== null;
      const watermarkHeight = hasDistance ? 140 : 120;
      const startY = canvas.height - watermarkHeight;

      // Add watermark with metadata - Modern design
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(10, startY, canvas.width - 20, watermarkHeight - 10);
      
      // Add border for modern look
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, startY, canvas.width - 20, watermarkHeight - 10);
      
      let yPos = startY + 20;
      
      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`📍 Điểm danh - ${activity?.name || 'N/A'}`, 20, yPos);
      yPos += 22;
      
      // Time
      ctx.font = '13px Arial';
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText(`🕐 ${timestamp}`, 20, yPos);
      yPos += 18;
      
      // User
      ctx.fillText(`👤 ${user?.name || user?.email || 'N/A'}`, 20, yPos);
      yPos += 18;
      
      // Location - Modern format
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Arial';
      ctx.fillText('📍 Vị trí:', 20, yPos);
      
      // Format address nicely - split intelligently if too long
      const maxCharsPerLine = 60;
      const addressLines: string[] = [];
      
      if (locationInfo.address && locationInfo.address.trim()) {
        const address = locationInfo.address.trim();
        if (address.length <= maxCharsPerLine) {
          addressLines.push(address);
        } else {
          // Split address into multiple lines intelligently at commas or spaces
          let remaining = address;
          while (remaining.length > 0) {
            if (remaining.length <= maxCharsPerLine) {
              addressLines.push(remaining);
              break;
            }
            // Try to break at comma first (preferred), then space
            let breakPoint = maxCharsPerLine;
            const lastComma = remaining.lastIndexOf(',', maxCharsPerLine);
            const lastSpace = remaining.lastIndexOf(' ', maxCharsPerLine);
            
            if (lastComma > maxCharsPerLine * 0.6) {
              breakPoint = lastComma + 1;
            } else if (lastSpace > maxCharsPerLine * 0.6) {
              breakPoint = lastSpace + 1;
            }
            
            addressLines.push(remaining.substring(0, breakPoint).trim());
            remaining = remaining.substring(breakPoint).trim();
          }
        }
      } else {
        addressLines.push('Đang lấy vị trí...');
      }
      
      ctx.fillStyle = '#e0e0e0';
      ctx.font = '12px Arial';
      addressLines.forEach((line, idx) => {
        if (line.trim()) {
          ctx.fillText(line.trim(), 90, yPos + (idx * 16));
        }
      });
      yPos += addressLines.length * 16 + 4;
      
      // Distance and validity status
      if (locationInfo.distance !== null) {
        ctx.fillStyle = locationInfo.isValid ? '#4ade80' : '#f87171';
        ctx.font = 'bold 12px Arial';
        const statusText = locationInfo.isValid 
          ? `✅ Hợp lệ - Cách ${locationInfo.distance.toFixed(0)}m`
          : `⚠️ Không hợp lệ - Cách ${locationInfo.distance.toFixed(0)}m`;
        ctx.fillText(statusText, 20, yPos);
        yPos += 16;
      }
      
      // ID
      ctx.fillStyle = '#b0b0b0';
      ctx.font = '10px Arial';
      ctx.fillText(`ID: ${user?._id || 'N/A'}`, 20, yPos);

      // Convert to blob with metadata
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedPhoto(photoDataUrl);
      
      // Store the check-in time (when photo was captured) for backend validation
      // This is important for accurate time validation
      const checkInTime = now;
      (window as any).photoCheckInTime = checkInTime;
      
      setIsCapturing(false);
    } catch (err) {
      console.error('Error capturing photo:', err);
      setError('Không thể chụp ảnh. Vui lòng thử lại.');
      setIsCapturing(false);
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedPhoto(null);
  };

  // Load attendance status from API
  const loadAttendanceStatus = async () => {
    if (!isAuthenticated || !token || !activityId || !user) {
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
        if (data.success && data.data) {
          if (data.data.attendanceStatus) {
            setAttendanceStatus(data.data.attendanceStatus);
          }
          // Ensure attendances is always an array
          if (data.data.attendances && Array.isArray(data.data.attendances)) {
            setAttendanceRecords(data.data.attendances);
          } else {
            setAttendanceRecords([]);
          }
        }
      }
    } catch (err) {
      console.error('Error loading attendance status:', err);
      // Don't show error to user, just log it
    }
  };

  // Handle check-in for specific time slot and check-in type
  const handleSlotCheckIn = async (slotName: string, checkInType: string) => {
    if (!isAuthenticated || !token || !activity || !user) {
      setError("Bạn cần đăng nhập để điểm danh.");
      return;
    }

    // For multiple days, update selectedDaySlot to show correct location on map
    if (activity.type === 'multiple_days' && slotName.includes(' - ')) {
      const dayMatch = slotName.match(/Ngày (\d+)/);
      const slotNameMatch = slotName.match(/Buổi (Sáng|Chiều|Tối)/);
      
      if (dayMatch && slotNameMatch) {
        const day = parseInt(dayMatch[1]);
        const slotNamePart = slotNameMatch[1];
        const slotKey = slotNamePart === 'Sáng' ? 'morning' : slotNamePart === 'Chiều' ? 'afternoon' : 'evening';
        
        // Update selectedDaySlot to show correct location on map
        console.log('Setting selectedDaySlot for check-in:', { day, slot: slotKey, slotName });
        setSelectedDaySlot({ day, slot: slotKey });
        
        // Also update map center immediately to ensure map shows correct location
        if (parsedScheduleData.length > 0) {
          const dayData = parsedScheduleData.find(d => d.day === day);
          if (dayData) {
            const slot = dayData.slots.find(s => s.slotKey === slotKey);
            const location = slot?.mapLocation || dayData.dayMapLocation;
            console.log('Slot location check:', {
              day,
              slotKey,
              hasSlot: !!slot,
              hasSlotLocation: !!slot?.mapLocation,
              hasDayLocation: !!dayData.dayMapLocation,
              location: location
            });
            if (location && location.lat && location.lng &&
                typeof location.lat === 'number' && 
                typeof location.lng === 'number' &&
                !isNaN(location.lat) &&
                !isNaN(location.lng)) {
              console.log('Updating map center immediately:', { lat: location.lat, lng: location.lng });
              setMapCenter([location.lat, location.lng]);
            }
          }
        }
      }
    }

    const slotStatus = attendanceStatus[slotName as TimeSlotName] || { start: false, end: false };
    const isAlreadyCheckedIn = checkInType === 'start' ? slotStatus.start : slotStatus.end;

    // Check if there's an existing attendance record and its status
    const existingRecord = (attendanceRecords || []).find(
      (r) => r.timeSlot === slotName && r.checkInType === checkInType
    );

    // If already checked in, check the status
    if (isAlreadyCheckedIn && existingRecord) {
      // If status is approved, don't allow re-check-in (or allow with warning)
      if (existingRecord.status === 'approved') {
        // Option 1: Don't allow re-check-in for approved records
        // return;
        
        // Option 2: Allow re-check-in but show warning
        // For now, we'll allow re-check-in for all cases (pending, rejected, or approved)
        // User can re-check-in to update their attendance
      }
      
      // If status is pending or rejected, allow re-check-in (re-capture photo)
      // This will update the existing record
    }

    // If already checked in and status is approved, we can still allow re-check-in
    // but we'll treat it as updating the attendance
    // For pending/rejected, we definitely allow re-check-in

    // IMPORTANT: Check location validity BEFORE opening camera
    // If location is invalid, don't allow check-in
    // Extract slot info for multiple days activities
    let targetSlot: { day: number; slot: 'morning' | 'afternoon' | 'evening' } | undefined = undefined;
    if (activity.type === 'multiple_days' && slotName.includes(' - ')) {
      const dayMatch = slotName.match(/Ngày (\d+)/);
      const slotNameMatch = slotName.match(/Buổi (Sáng|Chiều|Tối)/);
      if (dayMatch && slotNameMatch) {
        const day = parseInt(dayMatch[1]);
        const slotNamePart = slotNameMatch[1];
        const slotKey = slotNamePart === 'Sáng' ? 'morning' : slotNamePart === 'Chiều' ? 'afternoon' : 'evening';
        targetSlot = { day, slot: slotKey };
      }
    }
    
    if (userLocation) {
      const locationCheck = checkLocationValidity(userLocation.lat, userLocation.lng, targetSlot);
      if (!locationCheck.valid) {
        setError(locationCheck.message || 'Vị trí của bạn không đúng. Vui lòng đến đúng vị trí hoạt động để điểm danh.');
        return;
      }
    } else {
      // If no location available, try to get it first
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        });

        const locationCheck = checkLocationValidity(
          position.coords.latitude,
          position.coords.longitude,
          targetSlot
        );

        if (!locationCheck.valid) {
          setError(locationCheck.message || 'Vị trí của bạn không đúng. Vui lòng đến đúng vị trí hoạt động để điểm danh.');
          return;
        }

        // Update user location
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      } catch (geoError) {
        console.error('Could not get location:', geoError);
        setError('Không thể xác định vị trí. Vui lòng bật GPS và thử lại.');
        return;
      }
    }

    // Location is valid, proceed to open camera
    try {
      await openCamera();
      // Store the slot and check-in type for later use
      (window as any).pendingCheckIn = { slotName, checkInType };
    } catch (err) {
      console.error('Error opening camera:', err);
      setError('Không thể mở camera. Vui lòng kiểm tra quyền truy cập camera.');
    }
  };

  // Handle delete attendance record
  const handleDeleteAttendance = async (slotName: string, checkInType: string) => {
    if (!isAuthenticated || !token || !activity || !user) {
      setError("Bạn cần đăng nhập để thực hiện thao tác này.");
      return;
    }

    // Confirm deletion
    if (!confirm('Bạn có chắc chắn muốn xóa ảnh điểm danh này? Hành động này không thể hoàn tác.')) {
      return;
    }

        setIsCheckingIn(true);
    setError(null);
    setSuccessMessage(null);

    try {
        const response = await fetch(`/api/activities/${activityId}/attendance`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: (user as any).userId || (user as any)._id,
            checkedIn: false,
            timeSlot: slotName,
            checkInType: checkInType
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
        throw new Error(data.message || 'Lỗi khi xóa điểm danh');
        }

      setSuccessMessage('Đã xóa ảnh điểm danh thành công');
        setError(null);
        
        // Reload attendance status from API
        await loadAttendanceStatus();
      } catch (err) {
      console.error('Error deleting attendance:', err);
      setError(err instanceof Error ? err.message : 'Lỗi khi xóa điểm danh');
      } finally {
        setIsCheckingIn(false);
    }
  };

  const handleCheckIn = async () => {
    if (!isAuthenticated || !token || !activity || !user) {
      setError("Bạn cần đăng nhập để điểm danh.");
      return;
    }

    // Check if it's check-in (not check-out)
    if (!checkedIn) {
      // TEST MODE: Skip time and date validation
      // Check time slot availability
      // const timeCheck = getCurrentTimeSlot();
      // if (timeCheck.status !== 'during') {
      //   // Show warning but still allow camera to open for testing
      //   setError('Bạn chỉ có thể điểm danh trong 10 phút đầu từ khi buổi bắt đầu. Camera sẽ mở để bạn có thể chụp ảnh, nhưng điểm danh có thể không được ghi nhận nếu không đúng thời gian.');
      //   // Still open camera - don't return here
      // }

      // Open camera first
      try {
        await openCamera();
      } catch (err) {
        console.error('Error opening camera:', err);
        setError('Không thể mở camera. Vui lòng kiểm tra quyền truy cập camera.');
      }
      return; // Don't proceed until photo is captured
    }

    // If checking out, proceed directly
    await proceedWithCheckIn(null);
  };

  const proceedWithCheckIn = async (photoDataUrl: string | null, slotName?: string, checkInType?: string, lateReasonValue?: string) => {
    if (!isAuthenticated || !token || !activity || !user) {
      setError("Bạn cần đăng nhập để điểm danh.");
      return;
    }

    // Get pending check-in info if not provided
    const pendingCheckIn = (window as any).pendingCheckIn;
    const finalSlotName = slotName || pendingCheckIn?.slotName;
    const finalCheckInType = checkInType || pendingCheckIn?.checkInType;
    
    // Debug logging
    console.log('proceedWithCheckIn - Debug:', {
      slotName,
      checkInType,
      pendingCheckIn,
      finalSlotName,
      finalCheckInType,
      activityType: activity?.type
    });
    
    // Get check-in time from when photo was captured (stored in window)
    // This is the actual time the photo was taken, not when the request is sent
    const photoCheckInTime = (window as any).photoCheckInTime as Date | undefined;
    const checkInTime = photoCheckInTime || new Date(); // Fallback to current time if not available

    // Check if time is valid before proceeding (using checkInTime from photo capture)
    if (finalSlotName && finalCheckInType && photoCheckInTime) {
      // Use helper function to check late/early based on photo capture time
      const timeCheck = checkIfLateForTime(finalSlotName, finalCheckInType, photoCheckInTime);
      
      // If time is not valid (too early or too late > 30 minutes), reject immediately
      if (timeCheck.isValid === false) {
        const errorMessage = timeCheck.isEarly
          ? `Điểm danh quá sớm ${timeCheck.minutesEarly !== undefined ? formatMinutesToHours(timeCheck.minutesEarly) : ''}. Vui lòng điểm danh trong khoảng thời gian cho phép.`
          : timeCheck.isLate
          ? `Điểm danh quá trễ ${timeCheck.minutesLate !== undefined ? formatMinutesToHours(timeCheck.minutesLate) : ''}. Thời gian điểm danh đã kết thúc.`
          : 'Thời gian điểm danh không hợp lệ.';
        setError(errorMessage);
        setIsCheckingIn(false);
        // Clear photo check-in time
        (window as any).photoCheckInTime = null;
        return;
      }
      
      // If within late window (15-30 minutes after), proceed but it will be pending
      // No modal needed - backend will handle pending status
      // If within on-time window, proceed and it will be auto-approved
      // For early check-ins within on-time window (15 minutes before), also proceed
    }

    setIsCheckingIn(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Get current location with high accuracy (verify location again)
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve, 
              reject, 
              { 
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
              }
            );
          });
          
          // Check if location is valid before proceeding
          // If location is invalid, reject immediately (don't allow check-in)
          // Extract slot info for multiple days activities
          let targetSlot: { day: number; slot: 'morning' | 'afternoon' | 'evening' } | undefined = undefined;
          if (activity?.type === 'multiple_days' && finalSlotName && finalSlotName.includes(' - ')) {
            const dayMatch = finalSlotName.match(/Ngày (\d+)/);
            const slotNameMatch = finalSlotName.match(/Buổi (Sáng|Chiều|Tối)/);
            if (dayMatch && slotNameMatch) {
              const day = parseInt(dayMatch[1]);
              const slotNamePart = slotNameMatch[1];
              const slotKey = slotNamePart === 'Sáng' ? 'morning' : slotNamePart === 'Chiều' ? 'afternoon' : 'evening';
              targetSlot = { day, slot: slotKey };
            }
          }
          
          const locationCheck = checkLocationValidity(
            position.coords.latitude,
            position.coords.longitude,
            targetSlot
          );

          if (!locationCheck.valid) {
            setError(locationCheck.message || 'Vị trí của bạn không đúng. Vui lòng đến đúng vị trí hoạt động để điểm danh.');
            setIsCheckingIn(false);
            return;
          }
          
          // Get address from coordinates using reverse geocoding
          let address = null;
          try {
            const addressResult = await reverseGeocode(position.coords.latitude, position.coords.longitude);
            if (addressResult) {
              address = addressResult;
            }
          } catch (geocodeError) {
            console.log('Could not get address:', geocodeError);
            // Continue without address - it's optional
          }

          // Validate coordinates
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
            throw new Error('Tọa độ GPS không hợp lệ');
          }

          location = {
            lat: lat,
            lng: lng,
            ...(address ? { address: address } : {}) // Only include address if it exists
          };
        } catch (geoError) {
          console.error('Could not get location:', geoError);
          setError('Không thể xác định vị trí. Vui lòng bật GPS và thử lại.');
          setIsCheckingIn(false);
          return;
        }
      } else {
        setError('Trình duyệt không hỗ trợ định vị GPS.');
        setIsCheckingIn(false);
        return;
      }

      // Validate location before proceeding
      if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number' || 
          isNaN(location.lat) || isNaN(location.lng)) {
        console.error('Invalid location data:', location);
        setError('Vị trí không hợp lệ. Vui lòng thử lại.');
        setIsCheckingIn(false);
        return;
      }

      // Upload photo if available (only from camera, no file upload allowed)
      let photoUrl = null;
      if (photoDataUrl) {
        try {
          // Verify that photo is from camera (data URL format)
          if (!photoDataUrl.startsWith('data:image/')) {
            throw new Error('Ảnh không hợp lệ. Chỉ chấp nhận ảnh chụp trực tiếp từ camera.');
          }

          // Convert data URL to blob
          const response = await fetch(photoDataUrl);
          const blob = await response.blob();
          
          // Verify blob is image
          if (!blob.type.startsWith('image/')) {
            throw new Error('File không phải là ảnh hợp lệ.');
          }

          const formData = new FormData();
          formData.append('attendancePhoto', blob, `attendance_${activity._id}_${user._id}_${Date.now()}.jpg`);

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
          } else {
            throw new Error('Tải ảnh thất bại');
          }
        } catch (uploadError: any) {
          console.error('Error uploading photo:', uploadError);
          setError(uploadError.message || 'Lỗi khi tải ảnh. Vui lòng thử lại.');
          setIsCheckingIn(false);
          return;
        }
      }

      // Validate required fields before preparing request body
      if (!finalSlotName || !finalCheckInType) {
        console.error('Missing required fields:', { finalSlotName, finalCheckInType });
        setError('Dữ liệu điểm danh không hợp lệ. Vui lòng thử lại.');
        setIsCheckingIn(false);
        closeCamera();
        delete (window as any).pendingCheckIn;
        delete (window as any).photoCheckInTime;
        return;
      }

      // Validate userId
      const userId = (user as any).userId || (user as any)._id;
      if (!userId) {
        console.error('Missing userId');
        setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
        setIsCheckingIn(false);
        closeCamera();
        delete (window as any).pendingCheckIn;
        delete (window as any).photoCheckInTime;
        return;
      }

      // Convert timeSlot format for multiple days activities
      // API expects "Buổi Sáng", "Buổi Chiều", or "Buổi Tối"
      // But for multiple days, we send "Ngày X - Buổi Y", so we need to extract just the slot name
      let apiTimeSlot = finalSlotName;
      let dayNumber: number | undefined = undefined;
      let slotDate: string | undefined = undefined;
      
      if (activity?.type === 'multiple_days' && finalSlotName.includes(' - ')) {
        // Extract day number and slot name from "Ngày X - Buổi Y" format
        const dayMatch = finalSlotName.match(/Ngày (\d+)/);
        const slotNameMatch = finalSlotName.match(/Buổi (Sáng|Chiều|Tối)/);
        
        if (dayMatch && slotNameMatch) {
          dayNumber = parseInt(dayMatch[1]);
          apiTimeSlot = `Buổi ${slotNameMatch[1]}`;
          
          // Find the date for this day from schedule
          if (parsedScheduleData && parsedScheduleData.length > 0) {
            const dayData = parsedScheduleData.find(d => d.day === dayNumber);
            if (dayData) {
              slotDate = dayData.date;
            }
          }
        } else {
          console.error('Invalid timeSlot format for multiple days:', finalSlotName);
          setError('Định dạng buổi điểm danh không hợp lệ. Vui lòng thử lại.');
          setIsCheckingIn(false);
          closeCamera();
          delete (window as any).pendingCheckIn;
          delete (window as any).photoCheckInTime;
          return;
        }
      }

      // Prepare request body - ensure all required fields are present and valid
      const requestBody: {
        userId: string;
        checkedIn: boolean;
        location: { lat: number; lng: number; address?: string };
        photoUrl?: string | null;
        timeSlot: string;
        checkInType: string;
        checkInTime?: string; // ISO string format
        lateReason?: string | null;
        dayNumber?: number; // For multiple days
        slotDate?: string; // For multiple days
      } = {
        userId: userId,
        checkedIn: true,
        location: {
          lat: location.lat,
          lng: location.lng,
          ...(location.address ? { address: location.address } : {})
        },
        timeSlot: apiTimeSlot,
        checkInType: finalCheckInType,
        ...(photoUrl ? { photoUrl: photoUrl } : {}),
        ...(checkInTime ? { checkInTime: checkInTime.toISOString() } : {}), // Send checkInTime (when photo was captured)
        ...(lateReasonValue ? { lateReason: lateReasonValue.trim() } : {}),
        ...(dayNumber !== undefined ? { dayNumber: dayNumber } : {}),
        ...(slotDate ? { slotDate: slotDate } : {})
      };

      // Call API to mark attendance
      console.log('Sending check-in request:', {
        timeSlot: apiTimeSlot,
        originalSlotName: finalSlotName,
        checkInType: finalCheckInType,
        activityType: activity?.type,
        dayNumber: dayNumber,
        slotDate: slotDate
      });
      
      const response = await fetch(`/api/activities/${activityId}/attendance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      console.log('Check-in response:', {
        ok: response.ok,
        status: response.status,
        success: data.success,
        message: data.message,
        error: data.error
      });
      
      if (!response.ok || !data.success) {
        // If rejected due to invalid location, show error but don't throw
        // The record is still saved with status = 'rejected' for officer review
        if (data.data?.status === 'rejected' || data.message?.includes('Vị trí không đúng')) {
          setError(data.message || data.data?.reason || 'Vị trí không đúng. Điểm danh đã bị từ chối.');
          // Reload attendance status to show the rejected record
          await loadAttendanceStatus();
          setIsCheckingIn(false);
          closeCamera();
          // Clear pending check-in
          delete (window as any).pendingCheckIn;
          delete (window as any).photoCheckInTime;
          return;
        }
        throw new Error(data.message || data.error || 'Lỗi khi điểm danh');
      }

      // Get status from response
      const attendanceStatusFromResponse = data.data?.status || 'pending';

      // Update attendance status if it's a slot-specific check-in
      if (finalSlotName && finalCheckInType) {
        setAttendanceStatus(prev => ({
          ...prev,
          [finalSlotName as TimeSlotName]: {
            ...prev[finalSlotName as TimeSlotName],
            [finalCheckInType]: true
          }
        }));
        
        // Set success message based on status
        if (attendanceStatusFromResponse === 'approved') {
          setSuccessMessage(`✅ Đã điểm danh ${finalCheckInType === 'start' ? 'đầu' : 'cuối'} buổi ${finalSlotName} và được tự động duyệt!`);
        } else if (attendanceStatusFromResponse === 'pending') {
          setSuccessMessage(`⏳ Đã điểm danh ${finalCheckInType === 'start' ? 'đầu' : 'cuối'} buổi ${finalSlotName}. Đang chờ xét duyệt.`);
        } else {
          setSuccessMessage(`⚠️ Đã điểm danh ${finalCheckInType === 'start' ? 'đầu' : 'cuối'} buổi ${finalSlotName} nhưng bị từ chối.`);
        }
      } else {
        setCheckedIn(true);
        if (attendanceStatusFromResponse === 'approved') {
          setSuccessMessage('✅ Đã điểm danh và được tự động duyệt!');
        } else if (attendanceStatusFromResponse === 'pending') {
          setSuccessMessage('⏳ Đã điểm danh. Đang chờ xét duyệt.');
        } else {
          setSuccessMessage('⚠️ Đã điểm danh nhưng bị từ chối.');
        }
      }
      
      // Reload attendance status from API to get latest data
      await loadAttendanceStatus();
      
      // Clear pending check-in
      delete (window as any).pendingCheckIn;
      delete (window as any).photoCheckInTime;
      setError(null);
      closeCamera();
      setShowLateModal(false);
      setLateReason('');
      setLateInfo(null);
      setPendingCheckInData(null);
      
      // Show success modal
      setShowSuccessModal(true);
      
      // Auto close success modal after 4 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 4000);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra khi điểm danh';
      setError(errorMessage);
      console.error('Check-in error:', err);
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Add CSS animations for success modal - MUST be before any early returns
  useEffect(() => {
    const styleId = 'success-modal-animations';
    if (document.getElementById(styleId)) {
      return; // Already added
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes zoomIn {
        from {
          transform: scale(0.9);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
      @keyframes ping {
        75%, 100% {
          transform: scale(2);
          opacity: 0;
        }
      }
      @keyframes bounce {
        0%, 100% {
          transform: translateY(-25%);
          animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
        }
        50% {
          transform: translateY(0);
          animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
        }
      }
      .success-modal-overlay {
        animation: fadeIn 0.3s ease-in-out;
      }
      .success-modal-content {
        animation: zoomIn 0.3s ease-out;
      }
      .success-icon-ping {
        animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
      }
      .success-icon-bounce {
        animation: bounce 1s infinite;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Tính toán trạng thái hoàn thành dựa trên attendance records
  // Phải đặt trước các early return để tuân thủ Rules of Hooks
  const isAllCompleted = useMemo(() => {
    if (!activity || !activity.timeSlots || activity.timeSlots.length === 0) {
      return false;
    }

    const totalSlots = activity.timeSlots.length;
    let completedSlots = 0;

    activity.timeSlots.forEach((slot) => {
      const startRecord = (attendanceRecords || []).find(
        (r) => r.timeSlot === slot.name && r.checkInType === 'start' && r.status === 'approved'
      );
      const endRecord = (attendanceRecords || []).find(
        (r) => r.timeSlot === slot.name && r.checkInType === 'end' && r.status === 'approved'
      );

      // Nếu cả đầu và cuối buổi đều được approved thì tính là hoàn thành
      if (startRecord && endRecord) {
        completedSlots++;
      }
    });

    return completedSlots === totalSlots && totalSlots > 0;
  }, [activity, attendanceRecords]);

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Loader className={`w-12 h-12 animate-spin mx-auto mb-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
          <p className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Đang tải dữ liệu</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center p-8 max-w-md mx-4">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-red-900/50' : 'bg-red-100'}`}>
            <span className="text-2xl">⚠️</span>
          </div>
          <p className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Cần đăng nhập</p>
          <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Bạn cần đăng nhập để truy cập trang này</p>
          <button
            onClick={() => router.push('/auth/login')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 text-white hover:bg-gray-600' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  if (error && !activity) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center p-8 max-w-md mx-4">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-red-900/50' : 'bg-red-100'}`}>
            <span className="text-2xl">⚠️</span>
          </div>
          <p className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Lỗi</p>
          <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
          <button
            onClick={() => router.back()}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 text-white hover:bg-gray-600' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (!activity) {
    return null;
  }

  const timeSlotInfo = getCurrentTimeSlot();
  const formattedTime = currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
      <StudentNav />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6">
        {/* Header - Compact Design */}
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className={`mb-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isDarkMode 
                ? 'text-gray-300 hover:text-white border border-gray-700' 
                : 'text-gray-600 hover:text-gray-900 border border-gray-200'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại</span>
          </button>

          {/* Compact Header Card */}
          <div className={`relative overflow-hidden rounded-xl ${
            isDarkMode 
              ? 'border border-gray-700 bg-gray-800/50' 
              : 'border border-gray-200 bg-white'
          }`}>
            <div className="relative p-3 sm:p-4">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
                <div className="flex-1 min-w-0">
                  <h1 className={`text-base sm:text-lg font-bold mb-1 truncate ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                    {activity.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className={`flex items-center gap-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <Calendar className="w-3 h-3" />
                      <span>
                        {activity.type === 'multiple_days' 
                          ? activity.startDate && activity.endDate 
                            ? `${activity.startDate} - ${activity.endDate}`
                            : 'Nhiều ngày'
                          : activity.date}
                      </span>
                    </div>
                    <div className={`flex items-center gap-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{activity.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Success/Error Messages - Compact Design */}
        {(successMessage || error) && !showSuccessModal && (
          <div className="mb-3">
            {successMessage && (
              <div className={`p-2 rounded-lg border text-xs ${isDarkMode ? 'border-green-500/30 bg-green-500/10' : 'border-green-200 bg-green-50'}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-3.5 h-3.5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                  <p className={`font-medium flex-1 ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                    {successMessage}
                  </p>
                  <button
                    onClick={() => setSuccessMessage(null)}
                    className={`transition-all ${
                      isDarkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-700'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className={`p-2 rounded-lg border text-xs ${isDarkMode ? 'border-red-500/30 bg-red-500/10' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  <AlertCircle className={`w-3.5 h-3.5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                  <p className={`font-medium flex-1 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                    {error}
                  </p>
                  <button
                    onClick={() => setError(null)}
                    className={`transition-all ${
                      isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dashboard Header - Compact Design */}
        <div className="space-y-3">
          <div className={`relative overflow-hidden rounded-xl ${
            isDarkMode 
              ? 'border border-gray-700 bg-gray-800/50' 
              : 'border border-gray-200 bg-white'
          }`}>
            <div className="relative p-3 sm:p-4">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <MapPin className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Điểm danh 
                    </h2>
                    <p className={`text-xs flex items-center gap-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <Clock className="w-3 h-3" />
                      {formattedTime} • {formattedDate}
                    </p>
                  </div>
                </div>
             
                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className={`px-2.5 py-1.5 rounded-lg border text-xs ${
                    isAllCompleted
                      ? isDarkMode ? 'border-green-500/30 bg-green-500/10' : 'border-green-200 bg-green-50'
                      : isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <span className={`font-semibold flex items-center gap-1.5 ${
                      isAllCompleted
                        ? isDarkMode ? 'text-green-300' : 'text-green-700'
                        : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {isAllCompleted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đã điểm danh
                        </>
                      ) : (
                        <>
                          <Timer className="w-3.5 h-3.5" />
                          Chưa điểm danh
                        </>
                      )}
                    </span>
                  </div>
                  {locationStatus && (() => {
                    // Get check-in location info
                    let checkInLocationInfo: { day?: number; slotName?: string; address?: string } | null = null;
                    
                    if (activity?.type === 'multiple_days') {
                      const availableSlot = findAvailableCheckInSlot();
                      if (availableSlot && availableSlot.location && availableSlot.location.lat && availableSlot.location.lng) {
                        const slotName = availableSlot.slot === 'morning' ? 'Buổi Sáng' : availableSlot.slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
                        checkInLocationInfo = {
                          day: availableSlot.day,
                          slotName: slotName,
                          address: availableSlot.location.address
                        };
                      } else if (selectedDaySlot) {
                        const dayData = parsedScheduleData.find(d => d.day === selectedDaySlot.day);
                        if (dayData) {
                          const slot = dayData.slots.find(s => s.slotKey === selectedDaySlot.slot);
                          const location = slot?.mapLocation || dayData.dayMapLocation;
                          const slotName = selectedDaySlot.slot === 'morning' ? 'Buổi Sáng' : selectedDaySlot.slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
                          // Only show location info if location exists
                          if (location && location.lat && location.lng) {
                            checkInLocationInfo = {
                              day: selectedDaySlot.day,
                              slotName: slotName,
                              address: location?.address
                            };
                          } else {
                            // Show slot info but indicate no location required
                            checkInLocationInfo = {
                              day: selectedDaySlot.day,
                              slotName: slotName
                            };
                          }
                        }
                      }
                    } else if (activity?.locationData) {
                      checkInLocationInfo = {
                        address: activity.locationData.address
                      };
                    }
                    
                    return (
                      <div className={`px-2.5 py-1.5 rounded-lg border text-xs ${
                        locationStatus.valid
                          ? isDarkMode ? 'border-green-500/30 bg-green-500/10' : 'border-green-200 bg-green-50'
                          : isDarkMode ? 'border-red-500/30 bg-red-500/10' : 'border-red-200 bg-red-50'
                      }`}>
                        <div className="flex flex-col gap-1">
                          <span className={`font-semibold flex items-center gap-1.5 ${
                            locationStatus.valid
                              ? isDarkMode ? 'text-green-300' : 'text-green-700'
                              : isDarkMode ? 'text-red-300' : 'text-red-700'
                          }`}>
                            {locationStatus.valid ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Vị trí hợp lệ
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Vị trí không hợp lệ
                              </>
                            )}
                          </span>
                          {locationStatus.distance !== undefined && (
                            <span className={`text-[10px] ${
                              locationStatus.valid
                                ? isDarkMode ? 'text-green-400/80' : 'text-green-600/80'
                                : isDarkMode ? 'text-red-400/80' : 'text-red-600/80'
                            }`}>
                              Khoảng cách: {locationStatus.distance.toFixed(0)}m
                            </span>
                          )}
                          {checkInLocationInfo && (
                            <span className={`text-[10px] ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {checkInLocationInfo.day ? `Ngày ${checkInLocationInfo.day} - ${checkInLocationInfo.slotName}` : 'Vị trí điểm danh'}
                              {checkInLocationInfo.address ? ` • ${checkInLocationInfo.address}` : ' • Không yêu cầu vị trí cụ thể'}
                            </span>
                          )}
                          {locationStatus?.message && !checkInLocationInfo && (
                            <span className={`text-[10px] ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {locationStatus.message}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Section for Multiple Days */}
          {activity.type === 'multiple_days' && parsedScheduleData.length > 0 && (
            <div className={`mb-3 rounded-xl border-2 p-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                    <Calendar size={18} className="text-blue-500" />
                  </div>
                  <h2 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Lịch trình điểm danh
                  </h2>
                </div>
              </div>

              {/* Overall Attendance Summary for Multiple Days */}
              {(() => {
                // Calculate total attendance percentage across all days
                // Only count slots that user has registered for
                // Calculate based on completed slots (buổi) instead of check-ins (lần)
                let totalCompletedSlots = 0; // Number of slots with both start and end check-ins
                let totalRegisteredSlots = 0; // Total number of registered slots
                const slotOrder: ('morning' | 'afternoon' | 'evening')[] = ['morning', 'afternoon', 'evening'];
                
                parsedScheduleData.forEach(dayData => {
                  slotOrder.forEach(slotKey => {
                    // Only count if user has registered for this slot
                    if (!hasRegisteredForSlot(dayData.day, slotKey)) {
                      return;
                    }
                    
                    const slot = dayData.slots.find(s => s.slotKey === slotKey);
                    // Only count slots that actually exist and have data
                    if (!slot || !slot.startTime || !slot.endTime) return;
                    
                    // Count this as a registered slot
                    totalRegisteredSlots++;
                    
                    const slotName = slotKey === 'morning' ? 'Buổi Sáng' : slotKey === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
                    // Try multiple possible formats for timeSlot
                    const daySlotKey1 = `Ngày ${dayData.day} - ${slotName}`;
                    const daySlotKey2 = `Ngày ${dayData.day}-${slotName}`;
                    const daySlotKey3 = `Ngày${dayData.day} - ${slotName}`;
                    const daySlotKey4 = `Ngày${dayData.day}-${slotName}`;
                    
                    // Helper function to check if record matches any format
                    const matchesTimeSlot = (r: any) => {
                      const timeSlot = r.timeSlot || '';
                      return timeSlot === daySlotKey1 || 
                             timeSlot === daySlotKey2 || 
                             timeSlot === daySlotKey3 || 
                             timeSlot === daySlotKey4 ||
                             timeSlot.includes(`Ngày ${dayData.day}`) && timeSlot.includes(slotName);
                    };
                    
                    // Check if both start and end check-ins are completed
                    const startRecord = (attendanceRecords || []).find(
                      (r) => matchesTimeSlot(r) && 
                             r.checkInType === 'start' && 
                             (r.status === 'approved' || r.status === 'pending')
                    );
                    const endRecord = (attendanceRecords || []).find(
                      (r) => matchesTimeSlot(r) && 
                             r.checkInType === 'end' && 
                             (r.status === 'approved' || r.status === 'pending')
                    );
                    
                    // A slot is considered completed only if both start and end check-ins are done
                    if (startRecord && endRecord) {
                      totalCompletedSlots++;
                    }
                  });
                });
                
                // Calculate overall percentage based on completed slots vs total registered slots
                const overallPercentage = totalRegisteredSlots > 0 
                  ? Math.round((totalCompletedSlots / totalRegisteredSlots) * 100 * 10) / 10 
                  : 0;
                const hasParticipated = overallPercentage >= 70; // >= 70% is considered "participated"
                
                // Calculate circle progress (0-100%)
                const circleRadius = 45;
                const displayRadius = circleRadius * 0.9; // Slightly smaller for better fit
                const circleCircumference = 2 * Math.PI * displayRadius;
                const circleOffset = circleCircumference - (overallPercentage / 100) * circleCircumference;
                
                // Use blue gradient colors for better visibility - darker and bolder
                const progressColor = hasParticipated 
                  ? (isDarkMode ? '#2563eb' : '#1d4ed8') // blue-600/700 - darker
                  : (isDarkMode ? '#3b82f6' : '#2563eb'); // blue-500/600 - darker
                const bgColor = isDarkMode ? '#334155' : '#cbd5e1'; // slate-700/slate-300 - darker for contrast
                
                return (
                  <div className={`mb-3 p-5 rounded-2xl border-2 shadow-lg transition-all duration-300 ${
                    hasParticipated
                      ? isDarkMode 
                        ? 'border-blue-500/50 bg-gradient-to-br from-blue-500/15 via-blue-600/10 to-blue-700/5' 
                        : 'border-blue-400/60 bg-gradient-to-br from-blue-50 via-blue-100/80 to-indigo-50/60'
                      : isDarkMode 
                        ? 'border-blue-400/40 bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-blue-700/3' 
                        : 'border-blue-300/50 bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-blue-100/40'
                  }`}>
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
                      {/* Circular Progress with Icon */}
                      <div className="relative flex-shrink-0 w-[100px] h-[100px] sm:w-[110px] sm:h-[110px]">
                        <svg width="100" height="100" className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
                          {/* Background circle - thicker and more visible */}
                          <circle
                            cx="50"
                            cy="50"
                            r={displayRadius}
                            fill="none"
                            stroke={bgColor}
                            strokeWidth="14"
                            className="opacity-50"
                          />
                          {/* Progress circle - much thicker and bolder */}
                          <circle
                            cx="50"
                            cy="50"
                            r={displayRadius}
                            fill="none"
                            stroke={progressColor}
                            strokeWidth="16"
                            strokeLinecap="round"
                            strokeDasharray={circleCircumference}
                            strokeDashoffset={circleOffset}
                            className="transition-all duration-1000 ease-out"
                            style={{
                              filter: hasParticipated ? 'drop-shadow(0 0 8px rgba(37, 99, 235, 0.6))' : 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))'
                            }}
                          />
                        </svg>
                        {/* Icon and Percentage in center */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          {hasParticipated ? (
                            <Award className={`w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1 ${
                              isDarkMode ? 'text-blue-400' : 'text-blue-600'
                            }`} strokeWidth={2.5} />
                          ) : (
                            <TrendingUp className={`w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1 ${
                              isDarkMode ? 'text-blue-400' : 'text-blue-600'
                            }`} strokeWidth={2.5} />
                          )}
                          <span className={`text-xl sm:text-2xl font-black leading-tight ${
                            isDarkMode ? 'text-blue-300' : 'text-blue-700'
                          }`}>
                            {overallPercentage % 1 === 0 ? overallPercentage.toFixed(0) : overallPercentage.toFixed(1)}%
                          </span>
                          <span className={`text-[9px] sm:text-[10px] font-semibold mt-0.5 ${
                            isDarkMode ? 'text-blue-400/70' : 'text-blue-600/70'
                          }`}>
                            / 100%
                          </span>
                        </div>
                      </div>
                      
                      {/* Info Section */}
                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                        <div className="flex items-center gap-2 sm:gap-2.5 mb-2 sm:mb-3">
                          <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${
                            isDarkMode ? 'bg-blue-500/25' : 'bg-blue-100'
                          }`}>
                            <Activity className={`w-4 h-4 sm:w-5 sm:h-5 ${
                              isDarkMode ? 'text-blue-400' : 'text-blue-600'
                            }`} strokeWidth={2.5} />
                          </div>
                          <h3 className={`text-sm sm:text-base font-bold ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            Tổng quan tham gia hoạt động
                          </h3>
                        </div>
                        
                        <div className={`flex items-center gap-2.5 mb-3 px-3 py-2 rounded-xl ${
                          isDarkMode ? 'bg-blue-500/15' : 'bg-blue-50/80'
                        }`}>
                          <div className={`p-1.5 rounded-lg ${
                            isDarkMode ? 'bg-blue-500/30' : 'bg-blue-100'
                          }`}>
                            {hasParticipated ? (
                              <CheckCircle2 className={`w-4 h-4 ${
                                isDarkMode ? 'text-blue-400' : 'text-blue-600'
                              }`} strokeWidth={2.5} />
                            ) : (
                              <TrendingUp className={`w-4 h-4 ${
                                isDarkMode ? 'text-blue-400' : 'text-blue-600'
                              }`} strokeWidth={2.5} />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`text-xs font-medium mb-0.5 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              Phần trăm tham gia
                            </p>
                            <p className={`text-sm font-bold ${
                              isDarkMode ? 'text-blue-300' : 'text-blue-700'
                            }`}>
                              {overallPercentage % 1 === 0 ? overallPercentage.toFixed(0) : overallPercentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        
                        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${
                          isDarkMode ? 'bg-slate-800/60' : 'bg-gray-100'
                        }`}>
                          <Clock className={`w-4 h-4 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`} strokeWidth={2} />
                          <p className={`text-xs font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            Đã điểm danh <span className="font-bold text-blue-600 dark:text-blue-400">{totalCompletedSlots}</span> / <span className="font-bold">{totalRegisteredSlots}</span> buổi
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {/* Week Navigation */}
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
                    
                    {/* Week Info Card */}
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

              {/* Day Tabs */}
              <div data-day-tabs-section className="flex justify-center overflow-x-auto gap-1.5 mb-3 no-scrollbar">
                {currentWeekDays.map((weekDay, idx) => {
                  const dayLabel = dayLabels[idx];
                  const dayData = weekDay.data;
                  const isInCurrentWeek = !!dayData;
                  const isSelected = dayData && selectedDaySlot?.day === dayData.day;
                  
                  if (!dayData) {
                    return (
                      <div
                        key={`day-tab-empty-${currentWeekIndex}-${weekDay.dayKey}`}
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
                  
                  // Calculate attendance percentage for this day
                  // Only count slots that user has registered for
                  // Calculate attendance percentage for this day
                  // Only count slots that user has registered for
                  // Calculate based on completed slots (buổi) instead of check-ins (lần)
                  // A slot is considered completed only if both start and end check-ins are done
                  let completedSlots = 0; // Number of slots with both start and end check-ins
                  let totalRegisteredSlotsForDay = 0; // Total number of registered slots for this day
                  const slotOrder: ('morning' | 'afternoon' | 'evening')[] = ['morning', 'afternoon', 'evening'];
                  
                  slotOrder.forEach(slotKey => {
                    // Only count if user has registered for this slot
                    if (!hasRegisteredForSlot(dayData.day, slotKey)) {
                      return;
                    }
                    
                    const slot = dayData.slots.find(s => s.slotKey === slotKey);
                    if (!slot) return; // Skip if slot doesn't exist for this day
                    
                    // Count this as a registered slot
                    totalRegisteredSlotsForDay++;
                    
                    const slotName = slotKey === 'morning' ? 'Buổi Sáng' : slotKey === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
                    const daySlotKey = `Ngày ${dayData.day} - ${slotName}`;
                    
                    // Check if both start and end check-ins are completed
                    const hasStartRecord = (attendanceRecords || []).some(
                      (r) => r.timeSlot === daySlotKey && 
                             r.checkInType === 'start' && 
                             (r.status === 'approved' || r.status === 'pending')
                    );
                    const hasEndRecord = (attendanceRecords || []).some(
                      (r) => r.timeSlot === daySlotKey && 
                             r.checkInType === 'end' && 
                             (r.status === 'approved' || r.status === 'pending')
                    );
                    
                    // A slot is considered completed only if both start and end check-ins are done
                    if (hasStartRecord && hasEndRecord) {
                      completedSlots++;
                    }
                  });
                  
                  // Calculate percentage based on completed slots vs total registered slots
                  const attendancePercentage = totalRegisteredSlotsForDay > 0 ? (completedSlots / totalRegisteredSlotsForDay) * 100 : 0;
                  const isSufficientAttendance = attendancePercentage >= 80;
                  
                  // Check if user has registered for this day
                  const isRegisteredForThisDay = hasRegisteredForDay(dayData.day);

                  return (
                    <button
                      key={`day-tab-${currentWeekIndex}-${dayData.day}-${dayData.date}`}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedDaySlot(null);
                        } else {
                          // Find first available slot for this day, or default to morning
                          const checkSlotAvailability = (slotKey: string) => {
                            const slot = dayData.slots.find(s => s.slotKey === slotKey);
                            if (!slot) return false;
                            
                            const daySlotKey = `Ngày ${dayData.day} - ${slotKey === 'morning' ? 'Buổi Sáng' : slotKey === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối'}`;
                            const startRecord = (attendanceRecords || []).find(
                              (r) => r.timeSlot === daySlotKey && r.checkInType === 'start'
                            );
                            const endRecord = (attendanceRecords || []).find(
                              (r) => r.timeSlot === daySlotKey && r.checkInType === 'end'
                            );
                            
                            const slotDate = new Date(dayData.date);
                            const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
                            const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
                            
                            const slotStartTime = new Date(slotDate);
                            slotStartTime.setHours(startHours, startMinutes, 0, 0);
                            const slotEndTime = new Date(slotDate);
                            slotEndTime.setHours(endHours, endMinutes, 0, 0);
                            
                            const now = currentTime;
                            const onTimeStartStart = new Date(slotStartTime);
                            onTimeStartStart.setMinutes(onTimeStartStart.getMinutes() - 15);
                            const lateStartEnd = new Date(slotStartTime);
                            lateStartEnd.setMinutes(lateStartEnd.getMinutes() + 30);
                            
                            const onTimeEndStart = new Date(slotEndTime);
                            onTimeEndStart.setMinutes(onTimeEndStart.getMinutes() - 15);
                            const lateEndEnd = new Date(slotEndTime);
                            lateEndEnd.setMinutes(lateEndEnd.getMinutes() + 30);
                            
                            const canCheckInStart = !startRecord && now >= onTimeStartStart && now <= lateStartEnd;
                            const canCheckInEnd = !endRecord && now >= onTimeEndStart && now <= lateEndEnd;
                            
                            return canCheckInStart || canCheckInEnd;
                          };
                          
                          const slotOrder: ('morning' | 'afternoon' | 'evening')[] = ['morning', 'afternoon', 'evening'];
                          const firstAvailableSlot = slotOrder.find(s => checkSlotAvailability(s)) || 'morning';
                          
                          setSelectedDaySlot({ day: dayData.day, slot: firstAvailableSlot });
                          
                          // Update map center immediately
                          const slot = dayData.slots.find(s => s.slotKey === firstAvailableSlot);
                          const location = slot?.mapLocation || dayData.dayMapLocation;
                          if (location && location.lat && location.lng &&
                              typeof location.lat === 'number' && 
                              typeof location.lng === 'number' &&
                              !isNaN(location.lat) &&
                              !isNaN(location.lng)) {
                            setMapCenter([location.lat, location.lng]);
                          }
                        }
                      }}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all relative border-2 ${
                        !isRegisteredForThisDay
                          ? isSelected
                            ? isDarkMode
                              ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg border-gray-500'
                              : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-md border-gray-400'
                            : isDarkMode
                              ? 'bg-gray-800/70 text-gray-400 hover:bg-gray-700/80 border-gray-600/60'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border-gray-300'
                          : isSelected
                          ? isDarkMode
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg border-blue-400'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md border-blue-400'
                          : isDarkMode
                            ? 'bg-gray-800/90 text-gray-200 hover:bg-gray-700 border-gray-600/80'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300 shadow-sm'
                      }`}
                      title={!isRegisteredForThisDay ? 'Bạn chưa đăng ký tham gia ngày này' : undefined}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{dayLabel}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            totalRegisteredSlotsForDay > 0
                              ? isSelected
                                ? isDarkMode ? 'bg-white/25 text-white' : 'bg-white/35 text-white'
                                : isDarkMode ? 'bg-emerald-500/50 text-emerald-100' : 'bg-emerald-500 text-white'
                              : isSelected
                                ? isDarkMode ? 'bg-white/15 text-white/80' : 'bg-white/25 text-white/90'
                                : isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
                          }`}>{totalRegisteredSlotsForDay}/3</span>
                          {/* Attendance status badge */}
                          {totalRegisteredSlotsForDay > 0 && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isSufficientAttendance
                                ? isSelected
                                  ? isDarkMode ? 'bg-emerald-600 text-white border-2 border-emerald-400' : 'bg-emerald-600 text-white border-2 border-emerald-500'
                                  : isDarkMode ? 'bg-emerald-600 text-white border-2 border-emerald-400' : 'bg-emerald-600 text-white border-2 border-emerald-500'
                                : attendancePercentage >= 50
                                  ? isSelected
                                    ? isDarkMode ? 'bg-amber-600 text-white border-2 border-amber-400' : 'bg-amber-500 text-white border-2 border-amber-400'
                                    : isDarkMode ? 'bg-amber-600 text-white border-2 border-amber-400' : 'bg-amber-500 text-white border-2 border-amber-400'
                                  : isSelected
                                    ? isDarkMode ? 'bg-orange-600 text-white border-2 border-orange-400' : 'bg-orange-500 text-white border-2 border-orange-400'
                                    : isDarkMode ? 'bg-orange-600 text-white border-2 border-orange-400' : 'bg-orange-500 text-white border-2 border-orange-400'
                            }`} title={`Đã điểm danh ${completedSlots}/${totalRegisteredSlotsForDay} buổi (${attendancePercentage.toFixed(0)}%)`}>
                              {isSufficientAttendance ? '✓ Đủ' : `${attendancePercentage.toFixed(0)}%`}
                            </span>
                          )}
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

              {/* Time Slot Cards for Selected Day */}
              {selectedDaySlot && (() => {
                const dayData = parsedScheduleData.find(d => d.day === selectedDaySlot.day);
                if (!dayData) return null;
                
                // Check if user has registered for this day
                const isRegisteredForThisDay = hasRegisteredForDay(selectedDaySlot.day);

                // Check which slots are available for check-in
                const checkSlotAvailability = (slotKey: string) => {
                  const slot = dayData.slots.find(s => s.slotKey === slotKey);
                  if (!slot) return false;
                  
                  const daySlotKey = `Ngày ${dayData.day} - ${slotKey === 'morning' ? 'Buổi Sáng' : slotKey === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối'}`;
                  const startRecord = (attendanceRecords || []).find(
                    (r) => r.timeSlot === daySlotKey && r.checkInType === 'start'
                  );
                  const endRecord = (attendanceRecords || []).find(
                    (r) => r.timeSlot === daySlotKey && r.checkInType === 'end'
                  );
                  
                  const slotDate = new Date(dayData.date);
                  const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
                  const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
                  
                  const slotStartTime = new Date(slotDate);
                  slotStartTime.setHours(startHours, startMinutes, 0, 0);
                  const slotEndTime = new Date(slotDate);
                  slotEndTime.setHours(endHours, endMinutes, 0, 0);
                  
                  const now = currentTime;
                  const onTimeStartStart = new Date(slotStartTime);
                  onTimeStartStart.setMinutes(onTimeStartStart.getMinutes() - 15);
                  const lateStartEnd = new Date(slotStartTime);
                  lateStartEnd.setMinutes(lateStartEnd.getMinutes() + 30);
                  
                  const onTimeEndStart = new Date(slotEndTime);
                  onTimeEndStart.setMinutes(onTimeEndStart.getMinutes() - 15);
                  const lateEndEnd = new Date(slotEndTime);
                  lateEndEnd.setMinutes(lateEndEnd.getMinutes() + 30);
                  
                  const canCheckInStart = !startRecord && now >= onTimeStartStart && now <= lateStartEnd;
                  const canCheckInEnd = !endRecord && now >= onTimeEndStart && now <= lateEndEnd;
                  
                  return canCheckInStart || canCheckInEnd;
                };

                // Sort slots: available first, then others
                const slotOrder = ['morning', 'afternoon', 'evening'];
                const sortedSlots = [...slotOrder].sort((a, b) => {
                  const aAvailable = checkSlotAvailability(a);
                  const bAvailable = checkSlotAvailability(b);
                  if (aAvailable && !bAvailable) return -1;
                  if (!aAvailable && bAvailable) return 1;
                  return 0;
                });

                // Auto-select first available slot if current selected slot is not available
                // This ensures map shows the correct location for the open check-in slot
                const firstAvailableSlot = sortedSlots.find(s => checkSlotAvailability(s));
                if (firstAvailableSlot && selectedDaySlot.slot !== firstAvailableSlot && 
                    (firstAvailableSlot === 'morning' || firstAvailableSlot === 'afternoon' || firstAvailableSlot === 'evening')) {
                  // Use setTimeout to avoid state update during render
                  setTimeout(() => {
                    const slot = dayData.slots.find(s => s.slotKey === firstAvailableSlot);
                    const location = slot?.mapLocation || dayData.dayMapLocation;
                    if (location && location.lat && location.lng &&
                        typeof location.lat === 'number' && 
                        typeof location.lng === 'number' &&
                        !isNaN(location.lat) &&
                        !isNaN(location.lng)) {
                      setSelectedDaySlot({ day: selectedDaySlot.day, slot: firstAvailableSlot as 'morning' | 'afternoon' | 'evening' });
                      setMapCenter([location.lat, location.lng]);
                    }
                  }, 0);
                }

                return (
                  <div className="space-y-4 md:space-y-5">
                    {/* Warning message if not registered for this day */}
                    {!isRegisteredForThisDay && (
                      <div className={`p-4 rounded-xl border-2 ${
                        isDarkMode 
                          ? 'bg-orange-500/10 border-orange-500/30 text-orange-300' 
                          : 'bg-orange-50 border-orange-300 text-orange-800'
                      }`}>
                        <div className="flex items-center gap-3">
                          <AlertTriangle size={20} strokeWidth={2.5} className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} />
                          <div className="flex-1">
                            <h3 className={`text-sm font-bold mb-1 ${isDarkMode ? 'text-orange-300' : 'text-orange-800'}`}>
                              Bạn chưa đăng ký tham gia ngày này
                            </h3>
                            <p className={`text-xs ${isDarkMode ? 'text-orange-200' : 'text-orange-700'}`}>
                              Vui lòng đăng ký tham gia ngày này trước khi điểm danh.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* All Slots Section - Show all slots for registered days */}
                    {isRegisteredForThisDay ? (
                      <div className="space-y-3">
                        {/* Show "Đang mở điểm danh" header only if there are available slots */}
                        {sortedSlots.some(s => {
                          const isRegistered = hasRegisteredForSlot(dayData.day, s as 'morning' | 'afternoon' | 'evening');
                          return isRegistered && checkSlotAvailability(s);
                        }) && (
                        <div className="flex items-center gap-2 px-2">
                          <div className={`h-1 flex-1 rounded-full ${isDarkMode ? 'bg-blue-500/30' : 'bg-blue-200'}`}></div>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                            Đang mở điểm danh
                          </span>
                          <div className={`h-1 flex-1 rounded-full ${isDarkMode ? 'bg-blue-500/30' : 'bg-blue-200'}`}></div>
                        </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-stretch overflow-visible w-full">
                          {slotOrder.map((slotKey) => {
                            // Check if user has registered for this specific slot
                            const isRegisteredForThisSlot = hasRegisteredForSlot(dayData.day, slotKey as 'morning' | 'afternoon' | 'evening');
                            
                            // If not registered, don't show in this section (will be shown in "Other Slots" section)
                            if (!isRegisteredForThisSlot) {
                              return null;
                            }
                            
                            // If registered but not available, don't show in this section (will be shown in "Other Slots" section)
                            if (!checkSlotAvailability(slotKey)) {
                              return null;
                            }
                            
                            // Continue with existing slot card rendering for registered and available slots
                      const slot = dayData.slots.find(s => s.slotKey === slotKey);
                      const slotName = slotKey === 'morning' ? 'Buổi Sáng' : slotKey === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
                      const SlotIcon = slotKey === 'morning' ? Sunrise : slotKey === 'afternoon' ? Sun : Moon;
                      
                      const isActive = !!slot;
                      const location = slot?.mapLocation || dayData.dayMapLocation;
                      const hasLocation = !!(location?.lat && location?.lng);
                      const isSelected = selectedDaySlot.slot === slotKey;

                            // Get attendance status for this day/slot
                            const daySlotKey = `Ngày ${dayData.day} - ${slotName}`;
                            
                            // Find attendance records for this day/slot
                            // Only match records with exact daySlotKey to avoid showing records from other days
                            const startRecord = (attendanceRecords || []).find(
                              (r) => r.timeSlot === daySlotKey && r.checkInType === 'start'
                            );
                            const endRecord = (attendanceRecords || []).find(
                              (r) => r.timeSlot === daySlotKey && r.checkInType === 'end'
                            );

                            // Calculate time windows and determine status for check-in
                            type CheckInStatus = 'not_started' | 'available' | 'missed';
                            
                            let startStatus: CheckInStatus = 'not_started';
                            let endStatus: CheckInStatus = 'not_started';
                      let canCheckInStart = false;
                      let canCheckInEnd = false;
                      
                      if (slot) {
                        const slotDate = new Date(dayData.date);
                        const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
                        const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
                        
                        const slotStartTime = new Date(slotDate);
                        slotStartTime.setHours(startHours, startMinutes, 0, 0);
                        
                        const slotEndTime = new Date(slotDate);
                        slotEndTime.setHours(endHours, endMinutes, 0, 0);
                        
                        const now = currentTime;
                        
                        // On-time window: 15 minutes before to 15 minutes after (auto-approve)
                        const onTimeStartStart = new Date(slotStartTime);
                        onTimeStartStart.setMinutes(onTimeStartStart.getMinutes() - 15);
                        const onTimeStartEnd = new Date(slotStartTime);
                        onTimeStartEnd.setMinutes(onTimeStartEnd.getMinutes() + 15);
                        
                        // Late window: from 15 minutes after to 30 minutes after (pending, needs approval)
                        const lateStartStart = new Date(slotStartTime);
                        lateStartStart.setMinutes(lateStartStart.getMinutes() + 15);
                        const lateStartEnd = new Date(slotStartTime);
                        lateStartEnd.setMinutes(lateStartEnd.getMinutes() + 30);
                        
                              // Determine start check-in status
                              if (startRecord) {
                                // Already checked in
                                startStatus = 'available';
                                canCheckInStart = false;
                              } else if (now < onTimeStartStart) {
                                // Not started yet
                                startStatus = 'not_started';
                                canCheckInStart = false;
                              } else if (now >= onTimeStartStart && now <= lateStartEnd) {
                                // Within check-in window
                                startStatus = 'available';
                                canCheckInStart = true;
                              } else if (now > lateStartEnd) {
                                // Passed the check-in window
                                startStatus = 'missed';
                                canCheckInStart = false;
                              }
                        
                        // Same logic for end check-in
                        const onTimeEndStart = new Date(slotEndTime);
                        onTimeEndStart.setMinutes(onTimeEndStart.getMinutes() - 15);
                        const onTimeEndEnd = new Date(slotEndTime);
                        onTimeEndEnd.setMinutes(onTimeEndEnd.getMinutes() + 15);
                        
                        const lateEndStart = new Date(slotEndTime);
                        lateEndStart.setMinutes(lateEndStart.getMinutes() + 15);
                        const lateEndEnd = new Date(slotEndTime);
                        lateEndEnd.setMinutes(lateEndEnd.getMinutes() + 30);
                        
                              // Determine end check-in status
                              if (endRecord) {
                                // Already checked in
                                endStatus = 'available';
                                canCheckInEnd = false;
                              } else if (now < onTimeEndStart) {
                                // Not started yet
                                endStatus = 'not_started';
                                canCheckInEnd = false;
                              } else if (now >= onTimeEndStart && now <= lateEndEnd) {
                                // Within check-in window
                                endStatus = 'available';
                                canCheckInEnd = true;
                              } else if (now > lateEndEnd) {
                                // Passed the check-in window
                                endStatus = 'missed';
                                canCheckInEnd = false;
                              }
                      }

                      return (
                        <div
                          key={slotKey}
                          onClick={() => {
                            // Update selected slot when clicking on a slot card
                            setSelectedDaySlot({ day: dayData.day, slot: slotKey as 'morning' | 'afternoon' | 'evening' });
                            // Update map center to show location of this slot
                            if (location && location.lat && location.lng &&
                                typeof location.lat === 'number' && 
                                typeof location.lng === 'number' &&
                                !isNaN(location.lat) &&
                                !isNaN(location.lng)) {
                              setMapCenter([location.lat, location.lng]);
                            }
                            // Location status will be updated automatically via useEffect
                          }}
                          className={`rounded-xl border-2 p-2.5 md:p-3 transition-all duration-200 min-w-[260px] max-w-full overflow-hidden w-full h-full flex flex-col cursor-pointer ${
                            isSelected
                              ? isDarkMode 
                                ? 'bg-blue-900/30 border-blue-400 shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/50' 
                                : 'bg-blue-50 border-blue-500 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/30'
                              : isDarkMode 
                                ? 'bg-gray-800/50 border-blue-400 shadow-lg shadow-blue-500/20 hover:border-blue-300 hover:shadow-blue-500/30' 
                                : 'bg-white border-blue-500 shadow-lg shadow-blue-500/10 hover:border-blue-400 hover:shadow-blue-500/20'
                          }`}
                          style={{
                                borderColor: isSelected 
                                  ? (isDarkMode ? '#60a5fa' : '#3b82f6')
                                  : (isDarkMode ? '#60a5fa' : '#3b82f6'),
                                borderWidth: isSelected ? '3px' : '2px',
                                minHeight: '400px'
                          }}
                        >
                          {/* Slot Header */}
                          <div className="flex items-start justify-between mb-2.5 md:mb-3 gap-1.5 min-w-0 w-full flex-shrink-0">
                            <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0 max-w-full">
                              <SlotIcon className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? (slotKey === 'morning' ? (isDarkMode ? 'text-yellow-400' : 'text-yellow-600') : slotKey === 'afternoon' ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : (isDarkMode ? 'text-purple-400' : 'text-purple-600')) : (isDarkMode ? 'text-gray-500' : 'text-gray-400')} flex-shrink-0`} />
                              <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                                <h3 className={`text-sm md:text-base font-bold mb-0.5 md:mb-1 w-full ${isActive ? (isDarkMode ? 'text-white' : 'text-gray-900') : (isDarkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                                  {slotName}
                                </h3>
                                {slot && (
                                  <div className="flex items-center gap-1 flex-wrap min-w-0">
                                    <div className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded border text-[10px] md:text-xs flex-shrink-0 ${
                                      isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                                    }`}>
                                      <span className={`font-semibold flex items-center gap-0.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 flex-shrink-0" />
                                        <span className="whitespace-nowrap">{slot.startTime}-{slot.endTime}</span>
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {isActive && slot ? (
                            <>
                              {/* Location Info */}
                              {location && location.lat && location.lng ? (
                                <div className={`mb-2.5 md:mb-3 p-2 md:p-2.5 rounded-lg border text-[10px] md:text-xs min-w-0 w-full overflow-hidden flex-shrink-0 ${
                                  isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'
                                }`}>
                                  <div className="flex items-start gap-1.5 md:gap-2 min-w-0 w-full">
                                    <MapPin className={`w-3 h-3 md:w-3.5 md:h-3.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} flex-shrink-0 mt-0.5`} />
                                    <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                                      <p className={`font-semibold mb-0.5 text-[10px] md:text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Vị trí điểm danh
                                      </p>
                                      <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} break-words text-[10px] md:text-xs w-full line-clamp-2`}>
                                        {location.address || `${location.lat?.toFixed(4)}, ${location.lng?.toFixed(4)}`}
                                      </p>
                                      {location.radius && (
                                        <p className={`mt-0.5 font-medium flex items-center gap-1 text-[10px] md:text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                          <Target className="w-2.5 h-2.5 md:w-3 md:h-3 flex-shrink-0 text-blue-500" />
                                          <span className="whitespace-nowrap">{location.radius}m</span>
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className={`mb-2.5 md:mb-3 p-2 md:p-2.5 rounded-lg border text-[10px] md:text-xs min-w-0 w-full overflow-hidden flex-shrink-0 ${
                                  isDarkMode ? 'border-gray-700/50 bg-gray-800/20' : 'border-gray-200/50 bg-gray-50/50'
                                }`}>
                                  <div className="flex items-start gap-1.5 md:gap-2 min-w-0 w-full">
                                    <MapPin className={`w-3 h-3 md:w-3.5 md:h-3.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} flex-shrink-0 mt-0.5`} />
                                    <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                                      <p className={`font-semibold mb-0.5 text-[10px] md:text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Vị trí điểm danh
                                      </p>
                                      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-[10px] md:text-xs italic`}>
                                        Buổi này không yêu cầu vị trí cụ thể
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Check-in Actions */}
                              <div className="flex justify-center items-center flex-1 w-full">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-2.5 place-items-center" style={{ maxWidth: '100%' }}>
                                {/* Start Check-in */}
                                {(() => {
                                  const startWindow = slot ? getCheckInTimeWindow(slot, 'start', dayData.date) : null;
                                  const visualStatus = startRecord ? 'done' : startStatus;
                                  
                                  const statusStyles: Record<string, { badge: string; badgeClass: string; icon: React.ReactNode; message: string; container: string; text: string; showButton?: boolean }> = {
                                    done: {
                                      badge: 'Đã điểm danh',
                                      badgeClass: isDarkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white',
                                      icon: <CheckCircle2 className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />,
                                      message: 'Đã hoàn thành',
                                      container: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300',
                                      text: isDarkMode ? 'text-gray-200' : 'text-gray-700'
                                    },
                                    not_started: {
                                      badge: 'Chưa đến giờ',
                                      badgeClass: isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-400 text-white',
                                      icon: <Timer className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />,
                                      message: 'Chưa đến thời gian điểm danh',
                                      container: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300',
                                      text: isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                    },
                                    available: {
                                      badge: 'Đang mở',
                                      badgeClass: isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white',
                                      icon: <Clock className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />,
                                      message: 'Có thể điểm danh',
                                      container: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300',
                                      text: isDarkMode ? 'text-gray-200' : 'text-gray-700',
                                      showButton: true
                                    },
                                    missed: {
                                      badge: 'Đã hết hạn',
                                      badgeClass: isDarkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white',
                                      icon: <AlertTriangle className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />,
                                      message: 'Đã bỏ lỡ điểm danh',
                                      container: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300',
                                      text: isDarkMode ? 'text-gray-200' : 'text-gray-700'
                                    }
                                  };
                                  
                                  const currentConfig = statusStyles[visualStatus];
                                  
                                  return (
                                    <div className={`p-2 md:p-2.5 rounded-lg border-2 transition-all flex flex-col gap-1.5 md:gap-2 h-full min-h-[180px] min-w-0 max-w-full w-full overflow-hidden ${
                                      visualStatus === 'done'
                                        ? isDarkMode ? 'border-green-500 bg-gray-800' : 'border-green-500 bg-white'
                                        : visualStatus === 'available'
                                        ? isDarkMode ? 'border-blue-500 bg-gray-800' : 'border-blue-500 bg-white'
                                        : visualStatus === 'missed'
                                        ? isDarkMode ? 'border-red-500 bg-gray-800' : 'border-red-500 bg-white'
                                        : isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'
                                    }`}>
                                      <div className="flex items-center justify-between gap-1.5 md:gap-2 min-w-0 w-full">
                                        <div className="flex items-center gap-1 md:gap-1.5 min-w-0 flex-1">
                                          <Sun className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'} flex-shrink-0`} />
                                          <span className={`text-[10px] md:text-xs font-bold ${isDarkMode ? 'text-yellow-200' : 'text-yellow-700'}`}>Đầu buổi</span>
                                        </div>
                                        <span className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[9px] md:text-[10px] font-semibold flex-shrink-0 whitespace-nowrap ${currentConfig.badgeClass}`}>
                                          {currentConfig.badge}
                                        </span>
                                      </div>
                                      
                                      {startWindow && (
                                        <div className="rounded-lg border border-dashed px-2 md:px-2.5 py-1.5 md:py-2 text-[10px] md:text-xs space-y-0.5 min-w-0 w-full overflow-hidden">
                                          <p className={`flex items-center justify-between gap-1.5 min-w-0 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                            <span className="flex items-center gap-0.5 flex-shrink-0">
                                              <CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3 text-green-500" />
                                              <span className="whitespace-nowrap text-[10px] md:text-xs">Đúng giờ:</span>
                                            </span>
                                            <span className="font-medium whitespace-nowrap text-[10px] md:text-xs">{startWindow.onTimeStart}-{startWindow.onTimeEnd}</span>
                                          </p>
                                          <p className={`flex items-center justify-between gap-1.5 min-w-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            <span className="flex items-center gap-0.5 flex-shrink-0">
                                              <Timer className="w-2.5 h-2.5 md:w-3 md:h-3 text-orange-500" />
                                              <span className="whitespace-nowrap text-[10px] md:text-xs">Trễ:</span>
                                            </span>
                                            <span className="font-medium whitespace-nowrap text-[10px] md:text-xs">{startWindow.lateStart}-{startWindow.lateEnd}</span>
                                          </p>
                                        </div>
                                      )}
                                      
                                      {/* Location validity warning for available slots */}
                                      {visualStatus === 'available' && locationStatus && !locationStatus.valid && (
                                        <div className={`rounded-lg border-2 px-2 md:px-2.5 py-1.5 md:py-2 flex items-center gap-1.5 md:gap-2 min-w-0 w-full overflow-hidden ${
                                          isDarkMode 
                                            ? 'bg-red-500/20 border-red-500/50 text-red-300' 
                                            : 'bg-red-50 border-red-300 text-red-700'
                                        }`}>
                                          <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                                          <p className={`text-[10px] md:text-xs font-semibold flex-1 min-w-0 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                                            Vị trí không hợp lệ{locationStatus.distance !== undefined ? ` (${locationStatus.distance.toFixed(0)}m)` : ''}
                                          </p>
                                        </div>
                                      )}
                                      
                                      <div className={`flex items-center justify-between gap-1.5 md:gap-2 rounded-lg border px-2 md:px-2.5 py-1.5 md:py-2 min-w-0 w-full overflow-hidden ${currentConfig.container}`}>
                                        <div className="flex items-center gap-1 md:gap-1.5 min-w-0 flex-1 overflow-hidden">
                                          <div className="flex-shrink-0">{currentConfig.icon}</div>
                                          <p className={`text-[10px] md:text-xs font-semibold ${currentConfig.text}`}>{currentConfig.message}</p>
                                        </div>
                                        {/* Show photo if already checked in, otherwise show button */}
                                        {(() => {
                                          // Check if we have a record with photo
                                          const hasRecordWithPhoto = startRecord && startRecord.photoUrl;
                                          const isDoneStatus = visualStatus === 'done';
                                          
                                          // Debug log
                                          if (startRecord) {
                                            console.log('Start check-in status:', {
                                              daySlotKey,
                                              hasRecord: !!startRecord,
                                              hasPhoto: !!startRecord.photoUrl,
                                              photoUrl: startRecord.photoUrl,
                                              visualStatus,
                                              isDoneStatus,
                                              shouldShowPhoto: isDoneStatus && hasRecordWithPhoto
                                            });
                                          }
                                          
                                          if (isDoneStatus && hasRecordWithPhoto) {
                                            return (
                                              <div className="rounded-lg overflow-hidden border-2 flex-shrink-0" style={{
                                                borderColor: isDarkMode ? '#10b981' : '#22c55e',
                                                width: '60px',
                                                height: '60px'
                                              }}>
                                                <img 
                                                  src={startRecord.photoUrl} 
                                                  alt="Điểm danh đầu buổi" 
                                                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                  onClick={() => {
                                                    setSelectedImageUrl(startRecord.photoUrl!);
                                                    setShowImageModal(true);
                                                  }}
                                                />
                                              </div>
                                            );
                                          }
                                          
                                          // Show button if available
                                          if (currentConfig.showButton) {
                                            return (
                                              <button
                                                onClick={() => handleSlotCheckIn(daySlotKey, 'start')}
                                                disabled={isCheckingIn || (visualStatus === 'available' && locationStatus !== null && !locationStatus.valid)}
                                                className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-semibold transition-all flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
                                                  isDarkMode 
                                                    ? 'bg-blue-600 text-white hover:bg-blue-500' 
                                                    : 'bg-blue-600 text-white hover:bg-blue-500'
                                                } ${isCheckingIn || (visualStatus === 'available' && locationStatus && !locationStatus.valid) ? 'opacity-50 cursor-not-allowed' : 'shadow-sm hover:shadow-md'}`}
                                              >
                                                {isCheckingIn ? (
                                                  <Loader className="w-3 h-3 md:w-3.5 md:h-3.5 animate-spin" />
                                                ) : (
                                                  <>
                                                    <Camera className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" />
                                                    <span>Điểm danh</span>
                                                  </>
                                                )}
                                              </button>
                                            );
                                          }
                                          
                                          return null;
                                        })()}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* End Check-in */}
                                {(() => {
                                  const endWindow = slot ? getCheckInTimeWindow(slot, 'end', dayData.date) : null;
                                  const visualStatus = endRecord ? 'done' : endStatus;
                                  
                                  const statusStyles: Record<string, { badge: string; badgeClass: string; icon: React.ReactNode; message: string; container: string; text: string; showButton?: boolean }> = {
                                    done: {
                                      badge: 'Đã điểm danh',
                                      badgeClass: isDarkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white',
                                      icon: <CheckCircle2 className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />,
                                      message: 'Đã hoàn thành',
                                      container: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300',
                                      text: isDarkMode ? 'text-gray-200' : 'text-gray-700'
                                    },
                                    not_started: {
                                      badge: 'Chưa đến giờ',
                                      badgeClass: isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-400 text-white',
                                      icon: <Timer className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />,
                                      message: 'Chưa đến thời gian điểm danh',
                                      container: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300',
                                      text: isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                    },
                                    available: {
                                      badge: 'Đang mở',
                                      badgeClass: isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white',
                                      icon: <Clock className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />,
                                      message: 'Có thể điểm danh',
                                      container: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300',
                                      text: isDarkMode ? 'text-gray-200' : 'text-gray-700',
                                      showButton: true
                                    },
                                    missed: {
                                      badge: 'Đã hết hạn',
                                      badgeClass: isDarkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white',
                                      icon: <AlertTriangle className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />,
                                      message: 'Đã bỏ lỡ điểm danh',
                                      container: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300',
                                      text: isDarkMode ? 'text-gray-200' : 'text-gray-700'
                                    }
                                  };
                                  
                                  const currentConfig = statusStyles[visualStatus];
                                  
                                  return (
                                    <div className={`p-2 md:p-2.5 rounded-lg border-2 transition-all flex flex-col gap-1.5 md:gap-2 h-full min-h-[180px] min-w-0 max-w-full w-full overflow-hidden ${
                                      visualStatus === 'done'
                                        ? isDarkMode ? 'border-green-500 bg-gray-800' : 'border-green-500 bg-white'
                                        : visualStatus === 'available'
                                        ? isDarkMode ? 'border-blue-500 bg-gray-800' : 'border-blue-500 bg-white'
                                        : visualStatus === 'missed'
                                        ? isDarkMode ? 'border-red-500 bg-gray-800' : 'border-red-500 bg-white'
                                        : isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'
                                    }`}>
                                      <div className="flex items-center justify-between gap-1.5 md:gap-2 min-w-0 w-full">
                                        <div className="flex items-center gap-1 md:gap-1.5 min-w-0 flex-1">
                                          <Moon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'} flex-shrink-0`} />
                                          <span className={`text-[10px] md:text-xs font-bold ${isDarkMode ? 'text-purple-200' : 'text-purple-700'}`}>Cuối buổi</span>
                                        </div>
                                        <span className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[9px] md:text-[10px] font-semibold flex-shrink-0 whitespace-nowrap ${currentConfig.badgeClass}`}>
                                          {currentConfig.badge}
                                        </span>
                                      </div>
                                      
                                      {endWindow && (
                                        <div className="rounded-lg border border-dashed px-2 md:px-2.5 py-1.5 md:py-2 text-[10px] md:text-xs space-y-0.5 min-w-0 w-full overflow-hidden">
                                          <p className={`flex items-center justify-between gap-1.5 min-w-0 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                            <span className="flex items-center gap-0.5 flex-shrink-0">
                                              <CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3 text-green-500" />
                                              <span className="whitespace-nowrap text-[10px] md:text-xs">Đúng giờ:</span>
                                            </span>
                                            <span className="font-medium whitespace-nowrap text-[10px] md:text-xs">{endWindow.onTimeStart}-{endWindow.onTimeEnd}</span>
                                          </p>
                                          <p className={`flex items-center justify-between gap-1.5 min-w-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            <span className="flex items-center gap-0.5 flex-shrink-0">
                                              <Timer className="w-2.5 h-2.5 md:w-3 md:h-3 text-orange-500" />
                                              <span className="whitespace-nowrap text-[10px] md:text-xs">Trễ:</span>
                                            </span>
                                            <span className="font-medium whitespace-nowrap text-[10px] md:text-xs">{endWindow.lateStart}-{endWindow.lateEnd}</span>
                                          </p>
                                        </div>
                                      )}
                                      
                                      {/* Location validity warning for available slots */}
                                      {visualStatus === 'available' && locationStatus && !locationStatus.valid && (
                                        <div className={`rounded-lg border-2 px-2 md:px-2.5 py-1.5 md:py-2 flex items-center gap-1.5 md:gap-2 min-w-0 w-full overflow-hidden ${
                                          isDarkMode 
                                            ? 'bg-red-500/20 border-red-500/50 text-red-300' 
                                            : 'bg-red-50 border-red-300 text-red-700'
                                        }`}>
                                          <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                                          <p className={`text-[10px] md:text-xs font-semibold flex-1 min-w-0 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                                            Vị trí không hợp lệ{locationStatus.distance !== undefined ? ` (${locationStatus.distance.toFixed(0)}m)` : ''}
                                          </p>
                                        </div>
                                      )}
                                      
                                      <div className={`flex items-center justify-between gap-1.5 md:gap-2 rounded-lg border px-2 md:px-2.5 py-1.5 md:py-2 min-w-0 w-full overflow-hidden ${currentConfig.container}`}>
                                        <div className="flex items-center gap-1 md:gap-1.5 min-w-0 flex-1 overflow-hidden">
                                          <div className="flex-shrink-0">{currentConfig.icon}</div>
                                          <p className={`text-[10px] md:text-xs font-semibold ${currentConfig.text}`}>{currentConfig.message}</p>
                                        </div>
                                        {/* Show photo if already checked in, otherwise show button */}
                                        {(() => {
                                          // Check if we have a record with photo
                                          const hasRecordWithPhoto = endRecord && endRecord.photoUrl;
                                          const isDoneStatus = visualStatus === 'done';
                                          
                                          // Debug log
                                          if (endRecord) {
                                            console.log('End check-in status:', {
                                              daySlotKey,
                                              hasRecord: !!endRecord,
                                              hasPhoto: !!endRecord.photoUrl,
                                              photoUrl: endRecord.photoUrl,
                                              visualStatus,
                                              isDoneStatus,
                                              shouldShowPhoto: isDoneStatus && hasRecordWithPhoto
                                            });
                                          }
                                          
                                          if (isDoneStatus && hasRecordWithPhoto) {
                                            return (
                                              <div className="rounded-lg overflow-hidden border-2 flex-shrink-0" style={{
                                                borderColor: isDarkMode ? '#10b981' : '#22c55e',
                                                width: '60px',
                                                height: '60px'
                                              }}>
                                                <img 
                                                  src={endRecord.photoUrl} 
                                                  alt="Điểm danh cuối buổi" 
                                                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                  onClick={() => {
                                                    setSelectedImageUrl(endRecord.photoUrl!);
                                                    setShowImageModal(true);
                                                  }}
                                                />
                                              </div>
                                            );
                                          }
                                          
                                          // Show button if available
                                          if (currentConfig.showButton) {
                                            return (
                                              <button
                                                onClick={() => handleSlotCheckIn(daySlotKey, 'end')}
                                                disabled={isCheckingIn || (visualStatus === 'available' && locationStatus !== null && !locationStatus.valid)}
                                                className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-semibold transition-all flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
                                                  isDarkMode 
                                                    ? 'bg-blue-600 text-white hover:bg-blue-500' 
                                                    : 'bg-blue-600 text-white hover:bg-blue-500'
                                                } ${isCheckingIn || (visualStatus === 'available' && locationStatus && !locationStatus.valid) ? 'opacity-50 cursor-not-allowed' : 'shadow-sm hover:shadow-md'}`}
                                              >
                                                {isCheckingIn ? (
                                                  <Loader className="w-3 h-3 md:w-3.5 md:h-3.5 animate-spin" />
                                                ) : (
                                                  <>
                                                    <Camera className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" />
                                                    <span>Điểm danh</span>
                                                  </>
                                                )}
                                              </button>
                                            );
                                          }
                                          
                                          return null;
                                        })()}
                                      </div>
                                    </div>
                                  );
                                })()}
                                </div>
                              </div>

                              {/* Attendance Records */}
                              {(startRecord || endRecord) && (
                                <div className={`mt-3 pt-3 border-t border-dashed flex-shrink-0`} style={{
                                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                                }}>
                                  <div className="space-y-2">
                                    {startRecord && (
                                      <div className={`p-2 rounded-lg border text-xs ${
                                        isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                                      }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                          <Sun className="w-3.5 h-3.5" />
                                          <span className="font-semibold">Đầu buổi</span>
                                        </div>
                                        {slot && (() => {
                                          const startWindow = getCheckInTimeWindow(slot, 'start', dayData.date);
                                          return startWindow ? (
                                            <div className="mb-2 space-y-0.5">
                                              <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                <CheckCircle2 className="w-3 h-3" />
                                                Đúng giờ: {startWindow.onTimeStart} - {startWindow.onTimeEnd}
                                              </p>
                                        <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                          <Timer className="w-3 h-3" />
                                                Trễ: {startWindow.lateStart} - {startWindow.lateEnd}
                                              </p>
                                            </div>
                                          ) : null;
                                        })()}
                                        {/* Status Badges */}
                                        <div className="flex flex-wrap gap-2 mb-2">
                                          {(() => {
                                            const lateEarlyInfo = calculateLateEarlyForRecord(startRecord);
                                            return (
                                              <>
                                                {lateEarlyInfo && startRecord.status !== 'rejected' && (
                                                  <>
                                                    {lateEarlyInfo.isOnTime ? (
                                                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all duration-200 ${
                                                        isDarkMode 
                                                          ? 'text-green-300 border-green-500/40' 
                                                          : 'text-green-700 border-green-300/60'
                                                      }`}>
                                                        <CheckCircle2 className={`w-4 h-4 ${
                                                          isDarkMode ? 'text-green-400' : 'text-green-600'
                                                        }`} />
                                                        <span className="font-bold">Đúng giờ</span>
                                                      </div>
                                                    ) : (
                                                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all duration-200 ${
                                                        lateEarlyInfo.isEarly
                                                          ? isDarkMode 
                                                            ? 'text-blue-300 border-blue-500/40' 
                                                            : 'text-blue-700 border-blue-300/60'
                                                          : isDarkMode 
                                                            ? 'text-pink-300 border-pink-500/40' 
                                                            : 'text-pink-700 border-pink-300/60'
                                                      }`}>
                                                        <Clock className={`w-4 h-4 ${
                                                          lateEarlyInfo.isEarly
                                                            ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                                            : isDarkMode ? 'text-pink-400' : 'text-pink-600'
                                                        }`} />
                                                        <span className="font-bold">
                                                          {lateEarlyInfo.isEarly ? 'Sớm' : 'Trễ'} {lateEarlyInfo.minutes !== undefined ? formatMinutesToHours(lateEarlyInfo.minutes) : ''}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </>
                                                )}
                                                {startRecord.status !== 'rejected' && (
                                                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all duration-200 ${
                                                    startRecord.status === 'approved'
                                                      ? isDarkMode 
                                                        ? 'text-green-300 border-green-500/40' 
                                                        : 'text-green-700 border-green-300/60'
                                                      : isDarkMode 
                                                        ? 'text-amber-300 border-amber-500/40' 
                                                        : 'text-amber-700 border-amber-300/60'
                                                  }`}>
                                                    {startRecord.status === 'approved' ? (
                                                      <CheckCircle2 className={`w-4 h-4 ${
                                                        isDarkMode ? 'text-green-400' : 'text-green-600'
                                                      }`} />
                                                    ) : (
                                                      <Timer className={`w-4 h-4 ${
                                                        isDarkMode ? 'text-amber-400' : 'text-amber-600'
                                                      }`} />
                                                    )}
                                                    <span className="font-bold">
                                                      {startRecord.status === 'approved' 
                                                        ? (isManualCheckInRecord(startRecord) && ((startRecord as any).verifiedByName || startRecord.verifiedBy)
                                                            ? `Đã được điểm danh bởi ${getVerifierName(startRecord.verifiedBy, (startRecord as any).verifiedByName)}`
                                                            : 'Đã xác nhận')
                                                        : 'Chờ xác nhận'}
                                                    </span>
                                    </div>
                                                )}
                                              </>
                                            );
                                          })()}
                                        </div>
                                        {startRecord.photoUrl && (
                                          <img 
                                            src={startRecord.photoUrl} 
                                            alt="Start check-in" 
                                            className="w-full h-20 object-cover rounded mb-1 cursor-pointer"
                                            onClick={() => {
                                              setSelectedImageUrl(startRecord.photoUrl!);
                                              setShowImageModal(true);
                                            }}
                                          />
                                        )}
                                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                          {new Date(startRecord.checkInTime).toLocaleString('vi-VN', { 
                                            hour: '2-digit', 
                                            minute: '2-digit', 
                                            second: '2-digit',
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                          })}
                                        </p>
                                        {isManualCheckInRecord(startRecord) && ((startRecord as any).verifiedByName || startRecord.verifiedBy) && (
                                          <p className={`text-xs mt-1 flex items-center gap-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                                            <User className="w-3 h-3" />
                                            Đã được điểm danh bởi: <span className="font-semibold">{getVerifierName(startRecord.verifiedBy, (startRecord as any).verifiedByName)}</span>
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    {endRecord && (
                                      <div className={`p-2 rounded-lg border text-xs ${
                                        isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                                      }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                          <Moon className="w-3.5 h-3.5" />
                                          <span className="font-semibold">Cuối buổi</span>
                                        </div>
                                        {slot && (() => {
                                          const endWindow = getCheckInTimeWindow(slot, 'end', dayData.date);
                                          return endWindow ? (
                                            <div className="mb-2 space-y-0.5">
                                              <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                <CheckCircle2 className="w-3 h-3" />
                                                Đúng giờ: {endWindow.onTimeStart} - {endWindow.onTimeEnd}
                                              </p>
                                              <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                                <Timer className="w-3 h-3" />
                                                Trễ: {endWindow.lateStart} - {endWindow.lateEnd}
                                              </p>
                                            </div>
                                          ) : null;
                                        })()}
                                        {/* Status Badges */}
                                        <div className="flex flex-wrap gap-2 mb-2">
                                          {(() => {
                                            const lateEarlyInfo = calculateLateEarlyForRecord(endRecord);
                                            return (
                                              <>
                                                {lateEarlyInfo && endRecord.status !== 'rejected' && (
                                                  <>
                                                    {lateEarlyInfo.isOnTime ? (
                                                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all duration-200 ${
                                                        isDarkMode 
                                                          ? 'text-green-300 border-green-500/40' 
                                                          : 'text-green-700 border-green-300/60'
                                                      }`}>
                                                        <CheckCircle2 className={`w-4 h-4 ${
                                                          isDarkMode ? 'text-green-400' : 'text-green-600'
                                                        }`} />
                                                        <span className="font-bold">Đúng giờ</span>
                                                      </div>
                                                    ) : (
                                                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all duration-200 ${
                                                        lateEarlyInfo.isEarly
                                                          ? isDarkMode 
                                                            ? 'text-blue-300 border-blue-500/40' 
                                                            : 'text-blue-700 border-blue-300/60'
                                                          : isDarkMode 
                                                            ? 'text-pink-300 border-pink-500/40' 
                                                            : 'text-pink-700 border-pink-300/60'
                                                      }`}>
                                                        <Clock className={`w-4 h-4 ${
                                                          lateEarlyInfo.isEarly
                                                            ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                                            : isDarkMode ? 'text-pink-400' : 'text-pink-600'
                                                        }`} />
                                                        <span className="font-bold">
                                                          {lateEarlyInfo.isEarly ? 'Sớm' : 'Trễ'} {lateEarlyInfo.minutes !== undefined ? formatMinutesToHours(lateEarlyInfo.minutes) : ''}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </>
                                                )}
                                                {endRecord.status !== 'rejected' && (
                                                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all duration-200 ${
                                                    endRecord.status === 'approved'
                                                      ? isDarkMode 
                                                        ? 'text-green-300 border-green-500/40' 
                                                        : 'text-green-700 border-green-300/60'
                                                      : isDarkMode 
                                                        ? 'text-amber-300 border-amber-500/40' 
                                                        : 'text-amber-700 border-amber-300/60'
                                                  }`}>
                                                    {endRecord.status === 'approved' ? (
                                                      <CheckCircle2 className={`w-4 h-4 ${
                                                        isDarkMode ? 'text-green-400' : 'text-green-600'
                                                      }`} />
                                                    ) : (
                                                      <Timer className={`w-4 h-4 ${
                                                        isDarkMode ? 'text-amber-400' : 'text-amber-600'
                                                      }`} />
                                                    )}
                                                    <span className="font-bold">
                                                      {endRecord.status === 'approved' 
                                                        ? (isManualCheckInRecord(endRecord) && ((endRecord as any).verifiedByName || endRecord.verifiedBy)
                                                            ? `Đã được điểm danh bởi ${getVerifierName(endRecord.verifiedBy, (endRecord as any).verifiedByName)}`
                                                            : 'Đã xác nhận')
                                                        : 'Chờ xác nhận'}
                                                    </span>
                                                  </div>
                                                )}
                                              </>
                                            );
                                          })()}
                                        </div>
                                        {endRecord.photoUrl && (
                                          <img 
                                            src={endRecord.photoUrl} 
                                            alt="End check-in" 
                                            className="w-full h-20 object-cover rounded mb-1 cursor-pointer"
                                            onClick={() => {
                                              setSelectedImageUrl(endRecord.photoUrl!);
                                              setShowImageModal(true);
                                            }}
                                          />
                                        )}
                                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                          {new Date(endRecord.checkInTime).toLocaleString('vi-VN', { 
                                            hour: '2-digit', 
                                            minute: '2-digit', 
                                            second: '2-digit',
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                          })}
                                        </p>
                                        {isManualCheckInRecord(endRecord) && ((endRecord as any).verifiedByName || endRecord.verifiedBy) && (
                                          <p className={`text-xs mt-1 flex items-center gap-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                                            <User className="w-3 h-3" />
                                            Đã được điểm danh bởi: <span className="font-semibold">{getVerifierName(endRecord.verifiedBy, (endRecord as any).verifiedByName)}</span>
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
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
                      </div>
                    ) : null}

                    {/* Other Slots Section - Show all slots that are not available OR not registered */}
                    {isRegisteredForThisDay ? (() => {
                      // Check if there are any slots to show in this section
                      const hasOtherSlots = slotOrder.some(slotKey => {
                        const isRegistered = hasRegisteredForSlot(dayData.day, slotKey as 'morning' | 'afternoon' | 'evening');
                        const isAvailable = checkSlotAvailability(slotKey);
                        return !isRegistered || !isAvailable;
                      });
                      
                      if (!hasOtherSlots) return null;
                      
                      return (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-2">
                          <div className={`h-1 flex-1 rounded-full ${isDarkMode ? 'bg-gray-500/30' : 'bg-gray-200'}`}></div>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${isDarkMode ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                            Các buổi khác
                          </span>
                          <div className={`h-1 flex-1 rounded-full ${isDarkMode ? 'bg-gray-500/30' : 'bg-gray-200'}`}></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-stretch overflow-visible w-full">
                            {slotOrder.map((slotKey) => {
                              // Check if user has registered for this specific slot
                              const isRegisteredForThisSlot = hasRegisteredForSlot(dayData.day, slotKey as 'morning' | 'afternoon' | 'evening');
                              const isAvailable = checkSlotAvailability(slotKey);
                              
                              // Only show slots that are either not registered OR not available
                              if (isRegisteredForThisSlot && isAvailable) {
                                return null; // Already shown in "Available Slots" section
                              }
                              
                              // If not registered, show "Not registered" card
                              if (!isRegisteredForThisSlot) {
                                const slot = dayData.slots.find(s => s.slotKey === slotKey);
                                const slotName = slotKey === 'morning' ? 'Buổi Sáng' : slotKey === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
                                const SlotIcon = slotKey === 'morning' ? Sunrise : slotKey === 'afternoon' ? Sun : Moon;
                                
                                return (
                                  <div
                                    key={slotKey}
                                    className={`rounded-xl border-2 p-2.5 md:p-3 transition-all duration-200 min-w-[260px] max-w-full overflow-hidden w-full h-full flex flex-col ${
                                      isDarkMode 
                                        ? 'bg-gray-800/30 border-gray-600/50 opacity-60' 
                                        : 'bg-gray-100 border-gray-300 opacity-60'
                                    }`}
                                    style={{
                                      minHeight: '400px'
                                    }}
                                  >
                                    {/* Slot Header */}
                                    <div className="flex items-start justify-between mb-2.5 md:mb-3 gap-1.5 min-w-0 w-full flex-shrink-0">
                                      <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0 max-w-full">
                                        <SlotIcon className={`w-4 h-4 md:w-5 md:h-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} flex-shrink-0`} />
                                        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                                          <h3 className={`text-sm md:text-base font-bold mb-0.5 md:mb-1 w-full ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                            {slotName}
                                          </h3>
                                          {slot && (
                                            <div className="flex items-center gap-1 flex-wrap min-w-0">
                                              <div className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded border text-[10px] md:text-xs flex-shrink-0 ${
                                                isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                                              }`}>
                                                <span className={`font-semibold flex items-center gap-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                  <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 flex-shrink-0" />
                                                  <span className="whitespace-nowrap">{slot.startTime}-{slot.endTime}</span>
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Not Registered Message */}
                                    <div className={`flex-1 flex items-center justify-center p-4 rounded-lg border-2 border-dashed ${
                                      isDarkMode 
                                        ? 'bg-gray-800/50 border-gray-600/50' 
                                        : 'bg-gray-50 border-gray-300'
                                    }`}>
                                      <div className="text-center">
                                        <XCircle className={`w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} strokeWidth={1.5} />
                                        <p className={`text-sm md:text-base font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                          Không đăng ký
                                        </p>
                                        <p className={`text-xs md:text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                          Bạn chưa đăng ký tham gia buổi này
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Continue with existing rendering for registered slots that are not available
                            const slot = dayData.slots.find(s => s.slotKey === slotKey);
                            const slotName = slotKey === 'morning' ? 'Buổi Sáng' : slotKey === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
                            const SlotIcon = slotKey === 'morning' ? Sunrise : slotKey === 'afternoon' ? Sun : Moon;
                            const isActive = !!slot;
                            const location = slot?.mapLocation || dayData.dayMapLocation;
                            const hasLocation = !!(location?.lat && location?.lng);
                            const isSelected = selectedDaySlot.slot === slotKey;
                            
                            // Get attendance status for this day/slot
                            const daySlotKey = `Ngày ${dayData.day} - ${slotName}`;
                            
                            // Find attendance records for this day/slot
                            // Only match records with exact daySlotKey to avoid showing records from other days
                            const startRecord = (attendanceRecords || []).find(
                              (r) => r.timeSlot === daySlotKey && r.checkInType === 'start'
                            );
                            const endRecord = (attendanceRecords || []).find(
                              (r) => r.timeSlot === daySlotKey && r.checkInType === 'end'
                            );

                            // Calculate time windows and determine status for check-in
                            type CheckInStatus = 'not_started' | 'available' | 'missed';
                            
                            let startStatus: CheckInStatus = 'not_started';
                            let endStatus: CheckInStatus = 'not_started';
                            let canCheckInStart = false;
                            let canCheckInEnd = false;
                            
                            if (slot) {
                              const slotDate = new Date(dayData.date);
                              const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
                              const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
                              
                              const slotStartTime = new Date(slotDate);
                              slotStartTime.setHours(startHours, startMinutes, 0, 0);
                              
                              const slotEndTime = new Date(slotDate);
                              slotEndTime.setHours(endHours, endMinutes, 0, 0);
                              
                              const now = currentTime;
                              
                              // On-time window: 15 minutes before to 15 minutes after (auto-approve)
                              const onTimeStartStart = new Date(slotStartTime);
                              onTimeStartStart.setMinutes(onTimeStartStart.getMinutes() - 15);
                              const onTimeStartEnd = new Date(slotStartTime);
                              onTimeStartEnd.setMinutes(onTimeStartEnd.getMinutes() + 15);
                              
                              // Late window: from 15 minutes after to 30 minutes after (pending, needs approval)
                              const lateStartStart = new Date(slotStartTime);
                              lateStartStart.setMinutes(lateStartStart.getMinutes() + 15);
                              const lateStartEnd = new Date(slotStartTime);
                              lateStartEnd.setMinutes(lateStartEnd.getMinutes() + 30);
                              
                              // Determine start check-in status
                              if (startRecord) {
                                // Already checked in
                                startStatus = 'available';
                                canCheckInStart = false;
                              } else if (now < onTimeStartStart) {
                                // Not started yet
                                startStatus = 'not_started';
                                canCheckInStart = false;
                              } else if (now >= onTimeStartStart && now <= lateStartEnd) {
                                // Within check-in window
                                startStatus = 'available';
                                canCheckInStart = true;
                              } else if (now > lateStartEnd) {
                                // Passed the check-in window
                                startStatus = 'missed';
                                canCheckInStart = false;
                              }
                              
                              // Same logic for end check-in
                              const onTimeEndStart = new Date(slotEndTime);
                              onTimeEndStart.setMinutes(onTimeEndStart.getMinutes() - 15);
                              const onTimeEndEnd = new Date(slotEndTime);
                              onTimeEndEnd.setMinutes(onTimeEndEnd.getMinutes() + 15);
                              
                              const lateEndStart = new Date(slotEndTime);
                              lateEndStart.setMinutes(lateEndStart.getMinutes() + 15);
                              const lateEndEnd = new Date(slotEndTime);
                              lateEndEnd.setMinutes(lateEndEnd.getMinutes() + 30);
                              
                              // Determine end check-in status
                              if (endRecord) {
                                // Already checked in
                                endStatus = 'available';
                                canCheckInEnd = false;
                              } else if (now < onTimeEndStart) {
                                // Not started yet
                                endStatus = 'not_started';
                                canCheckInEnd = false;
                              } else if (now >= onTimeEndStart && now <= lateEndEnd) {
                                // Within check-in window
                                endStatus = 'available';
                                canCheckInEnd = true;
                              } else if (now > lateEndEnd) {
                                // Passed the check-in window
                                endStatus = 'missed';
                                canCheckInEnd = false;
                              }
                            }

                            return (
                              <div
                                key={slotKey}
                                onClick={() => {
                                  // Update selected slot when clicking on a slot card
                                  setSelectedDaySlot({ day: dayData.day, slot: slotKey as 'morning' | 'afternoon' | 'evening' });
                                  // Update map center to show location of this slot
                                  if (location && location.lat && location.lng &&
                                      typeof location.lat === 'number' && 
                                      typeof location.lng === 'number' &&
                                      !isNaN(location.lat) &&
                                      !isNaN(location.lng)) {
                                    setMapCenter([location.lat, location.lng]);
                                  }
                                  // Location status will be updated automatically via useEffect
                                }}
                                className={`rounded-xl border-2 p-2.5 md:p-3 transition-all duration-200 min-w-[260px] max-w-full overflow-hidden w-full h-full flex flex-col cursor-pointer ${
                                  isSelected
                                    ? isDarkMode 
                                      ? 'bg-blue-900/30 border-blue-400 shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/50' 
                                      : 'bg-blue-50 border-blue-500 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/30'
                                    : isDarkMode 
                                      ? 'bg-gray-800/50 border-gray-600 shadow-lg hover:border-blue-400 hover:shadow-blue-500/20' 
                                      : 'bg-white border-gray-300 shadow-lg hover:border-blue-400 hover:shadow-blue-500/10'
                                }`}
                                style={{
                                      borderColor: isSelected 
                                        ? (isDarkMode ? '#60a5fa' : '#3b82f6')
                                        : (isDarkMode ? '#4b5563' : '#d1d5db'),
                                      borderWidth: isSelected ? '3px' : '2px',
                                      minHeight: '400px'
                                }}
                              >
                                {/* Slot Header */}
                                <div className="flex items-start justify-between mb-2.5 md:mb-3 gap-1.5 min-w-0 w-full">
                                  <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0 max-w-full">
                                    <SlotIcon className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? (slotKey === 'morning' ? (isDarkMode ? 'text-yellow-400' : 'text-yellow-600') : slotKey === 'afternoon' ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : (isDarkMode ? 'text-purple-400' : 'text-purple-600')) : (isDarkMode ? 'text-gray-500' : 'text-gray-400')} flex-shrink-0`} />
                                    <div className="flex-1 min-w-0 max-w-full overflow-visible">
                                      <h3 className={`text-sm md:text-base font-bold mb-0.5 md:mb-1 w-full ${isActive ? (isDarkMode ? 'text-white' : 'text-gray-900') : (isDarkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                                        {slotName}
                                      </h3>
                                      {slot && (
                                        <div className="flex items-center gap-1 flex-wrap min-w-0">
                                          <div className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded border text-[10px] md:text-xs flex-shrink-0 ${
                                            isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                                          }`}>
                                            <span className={`font-semibold flex items-center gap-0.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                              <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 flex-shrink-0" />
                                              <span className="whitespace-nowrap">{slot.startTime}-{slot.endTime}</span>
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {isActive && slot ? (
                                  <>
                                    {/* Location Info */}
                                    {location && (
                                      <div className={`mb-2.5 md:mb-3 p-2 md:p-2.5 rounded-lg border text-[10px] md:text-xs min-w-0 w-full overflow-visible ${
                                        isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'
                                      }`}>
                                        <div className="flex items-start gap-1.5 md:gap-2 min-w-0 w-full">
                                          <MapPin className={`w-3 h-3 md:w-3.5 md:h-3.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} flex-shrink-0 mt-0.5`} />
                                          <div className="flex-1 min-w-0 max-w-full overflow-visible">
                                            <p className={`font-semibold mb-0.5 text-[10px] md:text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                              Vị trí điểm danh
                                            </p>
                                            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} break-words text-[10px] md:text-xs w-full`}>
                                              {location.address || `${location.lat?.toFixed(4)}, ${location.lng?.toFixed(4)}`}
                                            </p>
                                            {location.radius && (
                                              <p className={`mt-0.5 font-medium flex items-center gap-1 text-[10px] md:text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                <Target className="w-2.5 h-2.5 md:w-3 md:h-3 flex-shrink-0 text-blue-500" />
                                                <span className="whitespace-nowrap">{location.radius}m</span>
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Check-in Actions */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-2.5 w-full min-w-0">
                                      {/* Start Check-in */}
                                      {(() => {
                                        const startWindow = slot ? getCheckInTimeWindow(slot, 'start', dayData.date) : null;
                                        const visualStatus = startRecord ? 'done' : startStatus;
                                        
                                        const statusStyles: Record<string, { badge: string; badgeClass: string; icon: React.ReactNode; message: string; container: string; text: string; showButton?: boolean }> = {
                                          done: {
                                            badge: 'Đã điểm danh',
                                            badgeClass: isDarkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white',
                                            icon: <CheckCircle2 className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />,
                                            message: 'Đã hoàn thành',
                                            container: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300',
                                            text: isDarkMode ? 'text-gray-200' : 'text-gray-700'
                                          },
                                          not_started: {
                                            badge: 'Chưa đến giờ',
                                            badgeClass: isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-400 text-white',
                                            icon: <Timer className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />,
                                            message: 'Chưa đến thời gian điểm danh',
                                            container: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300',
                                            text: isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                          },
                                          available: {
                                            badge: 'Đang mở',
                                            badgeClass: isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white',
                                            icon: <Clock className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />,
                                            message: 'Có thể điểm danh',
                                            container: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300',
                                            text: isDarkMode ? 'text-gray-200' : 'text-gray-700',
                                            showButton: true
                                          },
                                          missed: {
                                            badge: 'Đã hết hạn',
                                            badgeClass: isDarkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white',
                                            icon: <AlertTriangle className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />,
                                            message: 'Đã bỏ lỡ điểm danh',
                                            container: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300',
                                            text: isDarkMode ? 'text-gray-200' : 'text-gray-700'
                                          }
                                        };
                                        
                                        const currentConfig = statusStyles[visualStatus];
                                        
                                        return (
                                          <div className={`p-2 md:p-2.5 rounded-lg border-2 transition-all flex flex-col gap-1.5 md:gap-2 h-full min-h-[180px] min-w-0 max-w-full w-full overflow-hidden ${
                                            visualStatus === 'done'
                                              ? isDarkMode ? 'border-green-500 bg-gray-800' : 'border-green-500 bg-white'
                                              : visualStatus === 'available'
                                              ? isDarkMode ? 'border-blue-500 bg-gray-800' : 'border-blue-500 bg-white'
                                              : visualStatus === 'missed'
                                              ? isDarkMode ? 'border-red-500 bg-gray-800' : 'border-red-500 bg-white'
                                              : isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'
                                          }`}>
                                            <div className="flex items-center justify-between gap-1.5 md:gap-2 min-w-0 w-full">
                                              <div className="flex items-center gap-1 md:gap-1.5 min-w-0 flex-1">
                                                <Sun className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'} flex-shrink-0`} />
                                                <span className={`text-[10px] md:text-xs font-bold ${isDarkMode ? 'text-yellow-200' : 'text-yellow-700'}`}>Đầu buổi</span>
                                              </div>
                                              <span className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[9px] md:text-[10px] font-semibold flex-shrink-0 whitespace-nowrap ${currentConfig.badgeClass}`}>
                                                {currentConfig.badge}
                                              </span>
                                            </div>
                                            
                                            {startWindow && (
                                              <div className="rounded-lg border border-dashed px-2 md:px-2.5 py-1.5 md:py-2 text-[10px] md:text-xs space-y-0.5 min-w-0 w-full overflow-visible">
                                                <p className={`flex items-center justify-between gap-1.5 min-w-0 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                  <span className="flex items-center gap-0.5 flex-shrink-0">
                                                    <CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3 text-green-500" />
                                                    <span className="whitespace-nowrap text-[10px] md:text-xs">Đúng giờ:</span>
                                                  </span>
                                                  <span className="font-medium whitespace-nowrap text-[10px] md:text-xs">{startWindow.onTimeStart}-{startWindow.onTimeEnd}</span>
                                                </p>
                                                <p className={`flex items-center justify-between gap-1.5 min-w-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                  <span className="flex items-center gap-0.5 flex-shrink-0">
                                                    <Timer className="w-2.5 h-2.5 md:w-3 md:h-3 text-orange-500" />
                                                    <span className="whitespace-nowrap text-[10px] md:text-xs">Trễ:</span>
                                                  </span>
                                                  <span className="font-medium whitespace-nowrap text-[10px] md:text-xs">{startWindow.lateStart}-{startWindow.lateEnd}</span>
                                                </p>
                                              </div>
                                            )}
                                            
                                            <div className={`flex items-center justify-between gap-1.5 md:gap-2 rounded-lg border px-2 md:px-2.5 py-1.5 md:py-2 min-w-0 w-full overflow-visible ${currentConfig.container}`}>
                                              <div className="flex items-center gap-1 md:gap-1.5 min-w-0 flex-1 overflow-visible">
                                                <div className="flex-shrink-0">{currentConfig.icon}</div>
                                                <p className={`text-[10px] md:text-xs font-semibold ${currentConfig.text}`}>{currentConfig.message}</p>
                                              </div>
                                              {/* Show photo if already checked in, otherwise show button */}
                                              {visualStatus === 'done' && startRecord && startRecord.photoUrl ? (
                                                <div className="rounded-lg overflow-hidden border-2 flex-shrink-0" style={{
                                                  borderColor: isDarkMode ? '#10b981' : '#22c55e',
                                                  width: '60px',
                                                  height: '60px'
                                                }}>
                                                  <img 
                                                    src={startRecord.photoUrl} 
                                                    alt="Điểm danh đầu buổi" 
                                                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => {
                                                      setSelectedImageUrl(startRecord.photoUrl!);
                                                      setShowImageModal(true);
                                                    }}
                                                  />
                                                </div>
                                              ) : currentConfig.showButton ? (
                                                <button
                                                  onClick={() => handleSlotCheckIn(daySlotKey, 'start')}
                                                  disabled={isCheckingIn}
                                                  className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-semibold transition-all flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
                                                    isDarkMode 
                                                      ? 'bg-blue-600 text-white hover:bg-blue-500' 
                                                      : 'bg-blue-600 text-white hover:bg-blue-500'
                                                  } ${isCheckingIn ? 'opacity-50 cursor-not-allowed' : 'shadow-sm hover:shadow-md'}`}
                                                >
                                                  {isCheckingIn ? (
                                                    <Loader className="w-3 h-3 md:w-3.5 md:h-3.5 animate-spin" />
                                                  ) : (
                                                    <>
                                                      <Camera className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" />
                                                      <span>Điểm danh</span>
                                                    </>
                                                  )}
                                                </button>
                                              ) : null}
                                            </div>
                                          </div>
                                  );
                                })()}

                                {/* End Check-in */}
                                {(() => {
                                  const endWindow = slot ? getCheckInTimeWindow(slot, 'end', dayData.date) : null;
                                        const visualStatus = endRecord ? 'done' : endStatus;
                                        
                                        const statusStyles: Record<string, { badge: string; badgeClass: string; icon: React.ReactNode; message: string; container: string; text: string; showButton?: boolean }> = {
                                          done: {
                                            badge: 'Đã điểm danh',
                                            badgeClass: isDarkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white',
                                            icon: <CheckCircle2 className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />,
                                            message: 'Đã hoàn thành',
                                            container: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300',
                                            text: isDarkMode ? 'text-gray-200' : 'text-gray-700'
                                          },
                                          not_started: {
                                            badge: 'Chưa đến giờ',
                                            badgeClass: isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-400 text-white',
                                            icon: <Timer className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />,
                                            message: 'Chưa đến thời gian điểm danh',
                                            container: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300',
                                            text: isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                          },
                                          available: {
                                            badge: 'Đang mở',
                                            badgeClass: isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white',
                                            icon: <Clock className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />,
                                            message: 'Có thể điểm danh',
                                            container: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300',
                                            text: isDarkMode ? 'text-gray-200' : 'text-gray-700',
                                            showButton: true
                                          },
                                          missed: {
                                            badge: 'Đã hết hạn',
                                            badgeClass: isDarkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white',
                                            icon: <AlertTriangle className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />,
                                            message: 'Đã bỏ lỡ điểm danh',
                                            container: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300',
                                            text: isDarkMode ? 'text-gray-200' : 'text-gray-700'
                                          }
                                        };
                                        
                                        const currentConfig = statusStyles[visualStatus];
                                        
                                  return (
                                          <div className={`p-2 md:p-2.5 rounded-lg border-2 transition-all flex flex-col gap-1.5 md:gap-2 h-full min-h-[180px] min-w-0 max-w-full w-full overflow-hidden ${
                                            visualStatus === 'done'
                                              ? isDarkMode ? 'border-green-500 bg-gray-800' : 'border-green-500 bg-white'
                                              : visualStatus === 'available'
                                              ? isDarkMode ? 'border-blue-500 bg-gray-800' : 'border-blue-500 bg-white'
                                              : visualStatus === 'missed'
                                              ? isDarkMode ? 'border-red-500 bg-gray-800' : 'border-red-500 bg-white'
                                              : isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'
                                          }`}>
                                            <div className="flex items-center justify-between gap-1.5 md:gap-2 min-w-0 w-full">
                                              <div className="flex items-center gap-1 md:gap-1.5 min-w-0 flex-1">
                                                <Moon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'} flex-shrink-0`} />
                                                <span className={`text-[10px] md:text-xs font-bold ${isDarkMode ? 'text-purple-200' : 'text-purple-700'}`}>Cuối buổi</span>
                                              </div>
                                              <span className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[9px] md:text-[10px] font-semibold flex-shrink-0 whitespace-nowrap ${currentConfig.badgeClass}`}>
                                                {currentConfig.badge}
                                        </span>
                                      </div>
                                            
                                      {endWindow && (
                                              <div className="rounded-lg border border-dashed px-2 md:px-2.5 py-1.5 md:py-2 text-[10px] md:text-xs space-y-0.5 min-w-0 w-full overflow-visible">
                                                <p className={`flex items-center justify-between gap-1.5 min-w-0 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                  <span className="flex items-center gap-0.5 flex-shrink-0">
                                                    <CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3 text-green-500" />
                                                    <span className="whitespace-nowrap text-[10px] md:text-xs">Đúng giờ:</span>
                                                  </span>
                                                  <span className="font-medium whitespace-nowrap text-[10px] md:text-xs">{endWindow.onTimeStart}-{endWindow.onTimeEnd}</span>
                                                </p>
                                                <p className={`flex items-center justify-between gap-1.5 min-w-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                  <span className="flex items-center gap-0.5 flex-shrink-0">
                                                    <Timer className="w-2.5 h-2.5 md:w-3 md:h-3 text-orange-500" />
                                                    <span className="whitespace-nowrap text-[10px] md:text-xs">Trễ:</span>
                                                  </span>
                                                  <span className="font-medium whitespace-nowrap text-[10px] md:text-xs">{endWindow.lateStart}-{endWindow.lateEnd}</span>
                                          </p>
                                        </div>
                                      )}
                                            
                                            <div className={`flex items-center justify-between gap-1.5 md:gap-2 rounded-lg border px-2 md:px-2.5 py-1.5 md:py-2 min-w-0 w-full overflow-visible ${currentConfig.container}`}>
                                              <div className="flex items-center gap-1 md:gap-1.5 min-w-0 flex-1 overflow-visible">
                                                <div className="flex-shrink-0">{currentConfig.icon}</div>
                                                <p className={`text-[10px] md:text-xs font-semibold ${currentConfig.text}`}>{currentConfig.message}</p>
                                              </div>
                                              {/* Show photo if already checked in, otherwise show button */}
                                              {visualStatus === 'done' && endRecord && endRecord.photoUrl ? (
                                                <div className="rounded-lg overflow-hidden border-2 flex-shrink-0" style={{
                                                  borderColor: isDarkMode ? '#10b981' : '#22c55e',
                                                  width: '60px',
                                                  height: '60px'
                                                }}>
                                                  <img 
                                                    src={endRecord.photoUrl} 
                                                    alt="Điểm danh cuối buổi" 
                                                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => {
                                                      setSelectedImageUrl(endRecord.photoUrl!);
                                                      setShowImageModal(true);
                                                    }}
                                                  />
                                                </div>
                                              ) : currentConfig.showButton ? (
                                                <button
                                                  onClick={() => handleSlotCheckIn(daySlotKey, 'end')}
                                                  disabled={isCheckingIn}
                                                  className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-semibold transition-all flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
                                                    isDarkMode 
                                                      ? 'bg-blue-600 text-white hover:bg-blue-500' 
                                                      : 'bg-blue-600 text-white hover:bg-blue-500'
                                                  } ${isCheckingIn ? 'opacity-50 cursor-not-allowed' : 'shadow-sm hover:shadow-md'}`}
                                                >
                                                  {isCheckingIn ? (
                                                    <Loader className="w-3 h-3 md:w-3.5 md:h-3.5 animate-spin" />
                                                  ) : (
                                                    <>
                                                      <Camera className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" />
                                                      <span>Điểm danh</span>
                                                    </>
                                                  )}
                                                </button>
                                              ) : null}
                                            </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Attendance Records */}
                              {(startRecord || endRecord) && (
                                <div className={`mt-3 pt-3 border-t border-dashed`} style={{
                                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                                }}>
                                  <div className="space-y-2">
                                    {startRecord && (
                                      <div className={`p-2 rounded-lg border text-xs ${
                                        isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                                      }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                          <Sun className="w-3.5 h-3.5" />
                                          <span className="font-semibold">Đầu buổi</span>
                                        </div>
                                        {slot && (() => {
                                          const startWindow = getCheckInTimeWindow(slot, 'start', dayData.date);
                                          return startWindow ? (
                                            <div className="mb-2 space-y-0.5">
                                              <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                <CheckCircle2 className="w-3 h-3" />
                                                Đúng giờ: {startWindow.onTimeStart} - {startWindow.onTimeEnd}
                                              </p>
                                              <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                                <Timer className="w-3 h-3" />
                                                Trễ: {startWindow.lateStart} - {startWindow.lateEnd}
                                              </p>
                                            </div>
                                          ) : null;
                                        })()}
                                        {/* Status Badges */}
                                        <div className="flex flex-wrap gap-2 mb-2">
                                          {(() => {
                                            const lateEarlyInfo = calculateLateEarlyForRecord(startRecord);
                                            return (
                                              <>
                                                {lateEarlyInfo && startRecord.status !== 'rejected' && (
                                                  <>
                                                    {lateEarlyInfo.isOnTime ? (
                                                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all duration-200 ${
                                                        isDarkMode 
                                                          ? 'text-green-300 border-green-500/40' 
                                                          : 'text-green-700 border-green-300/60'
                                                      }`}>
                                                        <CheckCircle2 className={`w-4 h-4 ${
                                                          isDarkMode ? 'text-green-400' : 'text-green-600'
                                                        }`} />
                                                        <span className="font-bold">Đúng giờ</span>
                                                      </div>
                                                    ) : (
                                                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all duration-200 ${
                                                        lateEarlyInfo.isEarly
                                                          ? isDarkMode 
                                                            ? 'text-blue-300 border-blue-500/40' 
                                                            : 'text-blue-700 border-blue-300/60'
                                                          : isDarkMode 
                                                            ? 'text-pink-300 border-pink-500/40' 
                                                            : 'text-pink-700 border-pink-300/60'
                                                      }`}>
                                                        <Clock className={`w-4 h-4 ${
                                                          lateEarlyInfo.isEarly
                                                            ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                                            : isDarkMode ? 'text-pink-400' : 'text-pink-600'
                                                        }`} />
                                                        <span className="font-bold">
                                                          {lateEarlyInfo.isEarly ? 'Sớm' : 'Trễ'} {lateEarlyInfo.minutes !== undefined ? formatMinutesToHours(lateEarlyInfo.minutes) : ''}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </>
                                                )}
                                                {startRecord.status !== 'rejected' && (
                                                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all duration-200 ${
                                                    startRecord.status === 'approved'
                                                      ? isDarkMode 
                                                        ? 'text-green-300 border-green-500/40' 
                                                        : 'text-green-700 border-green-300/60'
                                                      : isDarkMode 
                                                        ? 'text-amber-300 border-amber-500/40' 
                                                        : 'text-amber-700 border-amber-300/60'
                                                  }`}>
                                                    {startRecord.status === 'approved' ? (
                                                      <CheckCircle2 className={`w-4 h-4 ${
                                                        isDarkMode ? 'text-green-400' : 'text-green-600'
                                                      }`} />
                                                    ) : (
                                                      <Timer className={`w-4 h-4 ${
                                                        isDarkMode ? 'text-amber-400' : 'text-amber-600'
                                                      }`} />
                                                    )}
                                                    <span className="font-bold">
                                                      {startRecord.status === 'approved' ? 'Đã xác nhận' : 'Chờ xác nhận'}
                                                    </span>
                                                  </div>
                                                )}
                                              </>
                                            );
                                          })()}
                                        </div>
                                        {startRecord.photoUrl && (
                                          <img 
                                            src={startRecord.photoUrl} 
                                            alt="Start check-in" 
                                            className="w-full h-20 object-cover rounded mb-1 cursor-pointer"
                                            onClick={() => {
                                              setSelectedImageUrl(startRecord.photoUrl!);
                                              setShowImageModal(true);
                                            }}
                                          />
                                        )}
                                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                          {new Date(startRecord.checkInTime).toLocaleString('vi-VN', { 
                                            hour: '2-digit', 
                                            minute: '2-digit', 
                                            second: '2-digit',
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                          })}
                                        </p>
                                        {isManualCheckInRecord(startRecord) && ((startRecord as any).verifiedByName || startRecord.verifiedBy) && (
                                          <p className={`text-xs mt-1 flex items-center gap-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                                            <User className="w-3 h-3" />
                                            Đã được điểm danh bởi: <span className="font-semibold">{getVerifierName(startRecord.verifiedBy, (startRecord as any).verifiedByName)}</span>
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    {endRecord && (
                                      <div className={`p-2 rounded-lg border text-xs ${
                                        isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                                      }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                          <Moon className="w-3.5 h-3.5" />
                                          <span className="font-semibold">Cuối buổi</span>
                                        </div>
                                        {slot && (() => {
                                          const endWindow = getCheckInTimeWindow(slot, 'end', dayData.date);
                                          return endWindow ? (
                                            <div className="mb-2 space-y-0.5">
                                              <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                <CheckCircle2 className="w-3 h-3" />
                                                Đúng giờ: {endWindow.onTimeStart} - {endWindow.onTimeEnd}
                                              </p>
                                              <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                                <Timer className="w-3 h-3" />
                                                Trễ: {endWindow.lateStart} - {endWindow.lateEnd}
                                              </p>
                                            </div>
                                          ) : null;
                                        })()}
                                        {/* Status Badges */}
                                        <div className="flex flex-wrap gap-2 mb-2">
                                          {(() => {
                                            const lateEarlyInfo = calculateLateEarlyForRecord(endRecord);
                                            return (
                                              <>
                                                {lateEarlyInfo && endRecord.status !== 'rejected' && (
                                                  <>
                                                    {lateEarlyInfo.isOnTime ? (
                                                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all duration-200 ${
                                                        isDarkMode 
                                                          ? 'text-green-300 border-green-500/40' 
                                                          : 'text-green-700 border-green-300/60'
                                                      }`}>
                                                        <CheckCircle2 className={`w-4 h-4 ${
                                                          isDarkMode ? 'text-green-400' : 'text-green-600'
                                                        }`} />
                                                        <span className="font-bold">Đúng giờ</span>
                                                      </div>
                                                    ) : (
                                                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all duration-200 ${
                                                        lateEarlyInfo.isEarly
                                                          ? isDarkMode 
                                                            ? 'text-blue-300 border-blue-500/40' 
                                                            : 'text-blue-700 border-blue-300/60'
                                                          : isDarkMode 
                                                            ? 'text-pink-300 border-pink-500/40' 
                                                            : 'text-pink-700 border-pink-300/60'
                                                      }`}>
                                                        <Clock className={`w-4 h-4 ${
                                                          lateEarlyInfo.isEarly
                                                            ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                                            : isDarkMode ? 'text-pink-400' : 'text-pink-600'
                                                        }`} />
                                                        <span className="font-bold">
                                                          {lateEarlyInfo.isEarly ? 'Sớm' : 'Trễ'} {lateEarlyInfo.minutes !== undefined ? formatMinutesToHours(lateEarlyInfo.minutes) : ''}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </>
                                                )}
                                                {endRecord.status !== 'rejected' && (
                                                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all duration-200 ${
                                                    endRecord.status === 'approved'
                                                      ? isDarkMode 
                                                        ? 'text-green-300 border-green-500/40' 
                                                        : 'text-green-700 border-green-300/60'
                                                      : isDarkMode 
                                                        ? 'text-amber-300 border-amber-500/40' 
                                                        : 'text-amber-700 border-amber-300/60'
                                                  }`}>
                                                    {endRecord.status === 'approved' ? (
                                                      <CheckCircle2 className={`w-4 h-4 ${
                                                        isDarkMode ? 'text-green-400' : 'text-green-600'
                                                      }`} />
                                                    ) : (
                                                      <Timer className={`w-4 h-4 ${
                                                        isDarkMode ? 'text-amber-400' : 'text-amber-600'
                                                      }`} />
                                                    )}
                                                    <span className="font-bold">
                                                      {endRecord.status === 'approved' 
                                                        ? (isManualCheckInRecord(endRecord) && ((endRecord as any).verifiedByName || endRecord.verifiedBy)
                                                            ? `Đã được điểm danh bởi ${getVerifierName(endRecord.verifiedBy, (endRecord as any).verifiedByName)}`
                                                            : 'Đã xác nhận')
                                                        : 'Chờ xác nhận'}
                                                    </span>
                                                  </div>
                                                )}
                                              </>
                                            );
                                          })()}
                                        </div>
                                        {endRecord.photoUrl && (
                                          <img 
                                            src={endRecord.photoUrl} 
                                            alt="End check-in" 
                                            className="w-full h-20 object-cover rounded mb-1 cursor-pointer"
                                            onClick={() => {
                                              setSelectedImageUrl(endRecord.photoUrl!);
                                              setShowImageModal(true);
                                            }}
                                          />
                                        )}
                                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                          {new Date(endRecord.checkInTime).toLocaleString('vi-VN', { 
                                            hour: '2-digit', 
                                            minute: '2-digit', 
                                            second: '2-digit',
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                          })}
                                        </p>
                                        {isManualCheckInRecord(endRecord) && ((endRecord as any).verifiedByName || endRecord.verifiedBy) && (
                                          <p className={`text-xs mt-1 flex items-center gap-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                                            <User className="w-3 h-3" />
                                            Đã được điểm danh bởi: <span className="font-semibold">{getVerifierName(endRecord.verifiedBy, (endRecord as any).verifiedByName)}</span>
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
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
                  </div>
                );
                    })() : null}

              {/* Info Message */}
              {selectedDaySlot && (
                <div className={`mt-3 p-2 rounded-lg border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-blue-500" />
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      Đang hiển thị điểm danh cho {selectedDaySlot.slot === 'morning' ? 'Buổi Sáng' : selectedDaySlot.slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối'} - Ngày {selectedDaySlot.day}
                    </p>
                  </div>
                </div>
              )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Timeline View - Main Content */}
          {activity.type === 'single_day' && activity.timeSlots && activity.timeSlots.length > 0 ? (
            <div className="space-y-3">
              {/* Timeline Header */}
              <div className="flex items-center gap-2">
                <div className={`h-px flex-1 rounded-full ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}></div>
                <h2 className={`text-base sm:text-lg font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Clock className="w-4 h-4" />
                  Lịch trình điểm danh
                </h2>
                <div className={`h-px flex-1 rounded-full ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}></div>
              </div>

              {/* Summary Card - Compact Design */}
              {(() => {
                // Tính số buổi đã hoàn thành (cả đầu và cuối buổi đều được approved)
                const totalSlots = activity.timeSlots?.length || 0;
                let completedSlots = 0;

                activity.timeSlots?.forEach((slot) => {
                  const startRecord = (attendanceRecords || []).find(
                    (r) => r.timeSlot === slot.name && r.checkInType === 'start' && r.status === 'approved'
                  );
                  const endRecord = (attendanceRecords || []).find(
                    (r) => r.timeSlot === slot.name && r.checkInType === 'end' && r.status === 'approved'
                  );

                  // Nếu cả đầu và cuối buổi đều được approved thì tính là hoàn thành
                  if (startRecord && endRecord) {
                    completedSlots++;
                  }
                });

                const isCompleted = completedSlots === totalSlots && totalSlots > 0;

                return (
                  <div className={`p-3 rounded-lg border ${
                    isCompleted
                      ? isDarkMode 
                        ? 'border-green-500/40 bg-green-500/10' 
                        : 'border-green-300 bg-green-50'
                      : isDarkMode 
                        ? 'border-blue-500/40 bg-blue-500/10' 
                        : 'border-blue-300 bg-blue-50'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {isCompleted ? (
                        <CheckCircle2 className={`w-5 h-5 ${
                          isDarkMode ? 'text-green-400' : 'text-green-600'
                        }`} />
                      ) : (
                        <Timer className={`w-5 h-5 ${
                          isDarkMode ? 'text-blue-400' : 'text-blue-600'
                        }`} />
                      )}
                      <div className="flex-1">
                        <h3 className={`text-xs font-semibold mb-0.5 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Tổng quan điểm danh
                        </h3>
                        <p className={`text-sm font-bold ${
                          isCompleted
                            ? isDarkMode ? 'text-green-300' : 'text-green-700'
                            : isDarkMode ? 'text-blue-300' : 'text-blue-700'
                        }`}>
                          {isCompleted
                            ? 'Đã hoàn thành'
                            : totalSlots === 1
                            ? 'Chưa hoàn thành'
                            : `Đã đi ${completedSlots}/${totalSlots} buổi`}
                        </p>
                        {!isCompleted && totalSlots > 1 && (
                          <p className={`text-xs mt-0.5 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {completedSlots === 0 
                              ? 'Chưa hoàn thành buổi nào'
                              : `Cần hoàn thành thêm ${totalSlots - completedSlots} buổi`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Timeline Cards - Compact Size */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {activity.timeSlots.map((slot, idx) => {
                    // Parse activity date for check-in window calculation
                    let activityDate: Date;
                    try {
                      const dateParts = activity.date.split('/');
                      if (dateParts.length === 3) {
                        activityDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
                      } else {
                        activityDate = new Date(activity.date);
                      }
                    } catch (e) {
                      activityDate = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
                    }
                    
                    const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
                    const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
                    
                    const slotStartTime = new Date(activityDate);
                    slotStartTime.setHours(startHours, startMinutes, 0, 0);
                    
                    const slotEndTime = new Date(activityDate);
                    slotEndTime.setHours(endHours, endMinutes, 0, 0);
                    
                    const now = currentTime;
                    
                    // On-time window: 15 minutes before to 15 minutes after (auto-approve)
                    const onTimeStartStart = new Date(slotStartTime);
                    onTimeStartStart.setMinutes(onTimeStartStart.getMinutes() - 15);
                    const onTimeStartEnd = new Date(slotStartTime);
                    onTimeStartEnd.setMinutes(onTimeStartEnd.getMinutes() + 15);
                    
                    // Late window: from 15 minutes after to 30 minutes after (pending, needs approval)
                    const lateStartStart = new Date(slotStartTime);
                    lateStartStart.setMinutes(lateStartStart.getMinutes() + 15);
                    const lateStartEnd = new Date(slotStartTime);
                    lateStartEnd.setMinutes(lateStartEnd.getMinutes() + 30);
                    
                    // Allow check-in if within on-time window OR late window (but not too late)
                    const canCheckInStart = (now >= onTimeStartStart && now <= onTimeStartEnd) || 
                                           (now > onTimeStartEnd && now <= lateStartEnd);
                    
                    // Same logic for end check-in
                    const onTimeEndStart = new Date(slotEndTime);
                    onTimeEndStart.setMinutes(onTimeEndStart.getMinutes() - 15);
                    const onTimeEndEnd = new Date(slotEndTime);
                    onTimeEndEnd.setMinutes(onTimeEndEnd.getMinutes() + 15);
                    
                    const lateEndStart = new Date(slotEndTime);
                    lateEndStart.setMinutes(lateEndStart.getMinutes() + 15);
                    const lateEndEnd = new Date(slotEndTime);
                    lateEndEnd.setMinutes(lateEndEnd.getMinutes() + 30);
                    
                    const canCheckInEnd = (now >= onTimeEndStart && now <= onTimeEndEnd) || 
                                         (now > onTimeEndEnd && now <= lateEndEnd);
                    
                    const isDuringSlot = now >= slotStartTime && now <= slotEndTime;
                    const isBeforeSlot = now < slotStartTime;
                    const isAfterSlot = now > slotEndTime;
                    
                    const slotStatus = attendanceStatus[slot.name as TimeSlotName];
                    
                    // Find location for this slot
                    const slotLocationMap: { [key: string]: 'morning' | 'afternoon' | 'evening' } = {
                      'Buổi Sáng': 'morning',
                      'Buổi Chiều': 'afternoon',
                      'Buổi Tối': 'evening'
                    };
                    const timeSlotKey = slotLocationMap[slot.name];
                    const slotLocation = activity.multiTimeLocations?.find(mtl => mtl.timeSlot === timeSlotKey);
                    
                    // Color scheme with proper icons
                    const slotDesign = {
                      'Buổi Sáng': {
                        icon: Sun,
                        iconColor: isDarkMode ? 'text-yellow-400' : 'text-yellow-600',
                        text: isDarkMode ? 'text-yellow-200' : 'text-yellow-800',
                        accent: isDarkMode ? 'text-yellow-300' : 'text-yellow-600'
                      },
                      'Buổi Chiều': {
                        icon: Sunset,
                        iconColor: isDarkMode ? 'text-blue-400' : 'text-blue-600',
                        text: isDarkMode ? 'text-blue-200' : 'text-blue-800',
                        accent: isDarkMode ? 'text-blue-300' : 'text-blue-600'
                      },
                      'Buổi Tối': {
                        icon: Moon,
                        iconColor: isDarkMode ? 'text-purple-400' : 'text-purple-600',
                        text: isDarkMode ? 'text-purple-200' : 'text-purple-800',
                        accent: isDarkMode ? 'text-purple-300' : 'text-purple-600'
                      }
                    };
                    
                    const design = slotDesign[slot.name as keyof typeof slotDesign] || slotDesign['Buổi Sáng'];
                    const SlotIcon = design.icon;
                    
                    return (
                      <div 
                        key={idx} 
                        className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                          isDarkMode ? 'bg-gray-800/50 border-white' : 'bg-white border-black'
                        }`}
                        style={{
                          borderColor: isDarkMode ? '#ffffff' : '#000000',
                          borderWidth: '2px'
                        }}
                      >
                        <div className="relative p-3">
                          {/* Header Section */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-1">
                              <SlotIcon className={`w-5 h-5 ${design.iconColor} flex-shrink-0`} />
                              <div className="flex-1 min-w-0">
                                <h3 className={`text-base font-bold mb-1 ${design.text}`}>
                                  {slot.name}
                                </h3>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <div className={`px-2 py-1 rounded border text-xs ${
                                    isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                                  }`}>
                                    <span className={`font-semibold flex items-center gap-1 ${design.accent}`}>
                                      <Clock className="w-3 h-3" />
                                      {slot.startTime} - {slot.endTime}
                                    </span>
                                  </div>
                                  {isDuringSlot && (
                                    <span className={`px-2 py-1 rounded text-xs font-semibold border flex items-center gap-1 ${
                                      isDarkMode ? 'border-green-500/30 text-green-300 bg-green-500/10' : 'border-green-200 text-green-700 bg-green-50'
                                    }`}>
                                      <PlayCircle className="w-3 h-3" />
                                      Đang diễn ra
                                    </span>
                                  )}
                                  {isBeforeSlot && (
                                    <span className={`px-2 py-1 rounded text-xs font-semibold border flex items-center gap-1 ${
                                      isDarkMode ? 'border-gray-600 text-gray-400 bg-gray-800/50' : 'border-gray-200 text-gray-600 bg-gray-50'
                                    }`}>
                                      <Timer className="w-3 h-3" />
                                      Sắp tới
                                    </span>
                                  )}
                                  {isAfterSlot && (
                                    <span className={`px-2 py-1 rounded text-xs font-semibold border flex items-center gap-1 ${
                                      isDarkMode ? 'border-gray-600 text-gray-500 bg-gray-800/50' : 'border-gray-200 text-gray-500 bg-gray-50'
                                    }`}>
                                      <Square className="w-3 h-3" />
                                      Đã kết thúc
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Location Info - Compact Design */}
                          {(slotLocation || activity.locationData) && (
                            <div className={`mb-3 p-2 rounded-lg border text-xs ${
                              isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'
                            }`}>
                              <div className="flex items-start gap-2">
                                <MapPin className={`w-3.5 h-3.5 ${design.iconColor} flex-shrink-0 mt-0.5`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold mb-0.5 ${design.accent}`}>
                                    Vị trí điểm danh
                                  </p>
                                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} truncate`}>
                                    {slotLocation?.location.address || 
                                     activity.locationData?.address || 
                                     (slotLocation ? `${slotLocation.location.lat.toFixed(4)}, ${slotLocation.location.lng.toFixed(4)}` : 
                                      activity.locationData ? `${activity.locationData.lat.toFixed(4)}, ${activity.locationData.lng.toFixed(4)}` : 
                                      'Chưa có thông tin')}
                                  </p>
                                  {(slotLocation?.radius || activity.locationData?.radius) && (
                                    <p className={`mt-0.5 font-medium flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      <Target className="w-3 h-3" />
                                      {(slotLocation?.radius || activity.locationData?.radius)}m
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Check-in Actions - Compact Design */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Start Check-in Button */}
                            {(() => {
                              const startWindow = getCheckInTimeWindow(slot, 'start');
                              return (
                                <div className={`p-2.5 rounded-lg border transition-all ${
                                  slotStatus.start
                                    ? isDarkMode ? 'bg-green-500/20 border-green-500/40' : 'bg-green-50 border-green-300'
                                    : isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                                }`}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className={`text-xs font-bold flex items-center gap-1 ${design.accent}`}>
                                      <Sun className="w-3.5 h-3.5" />
                                      Đầu buổi
                                    </span>
                                    {slotStatus.start && (
                                      <CheckCircle2 className={`w-4 h-4 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                                    )}
                                  </div>
                                  {startWindow && (
                                    <div className="mb-1.5 space-y-0.5 text-xs">
                                      <p className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        <CheckCircle className="w-3 h-3" />
                                        <span>Đúng giờ: {startWindow.onTimeStart} - {startWindow.onTimeEnd}</span>
                                      </p>
                                      <p className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                        <Timer className="w-3 h-3" />
                                        <span>Trễ: {startWindow.lateStart} - {startWindow.lateEnd}</span>
                                      </p>
                                    </div>
                                  )}
                                  {slotStatus.start ? (
                                    <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      <CheckCircle2 className="w-3 h-3" />
                                      Đã điểm danh
                                    </p>
                                  ) : canCheckInStart ? (
                                    <button
                                      onClick={() => handleSlotCheckIn(slot.name, 'start')}
                                      disabled={isCheckingIn}
                                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        isDarkMode 
                                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                          : 'bg-blue-600 text-white hover:bg-blue-700'
                                      } ${isCheckingIn ? 'opacity-50' : ''}`}
                                    >
                                      {isCheckingIn ? (
                                        <Loader className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <>
                                          <Camera className="w-3.5 h-3.5" />
                                          Điểm danh
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                      <Timer className="w-3 h-3" />
                                      Chưa đến thời gian
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                            
                            {/* End Check-in Button */}
                            {(() => {
                              const endWindow = getCheckInTimeWindow(slot, 'end');
                              return (
                                <div className={`p-2.5 rounded-lg border transition-all ${
                                  slotStatus.end
                                    ? isDarkMode ? 'bg-green-500/20 border-green-500/40' : 'bg-green-50 border-green-300'
                                    : isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                                }`}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className={`text-xs font-bold flex items-center gap-1 ${design.accent}`}>
                                      <Moon className="w-3.5 h-3.5" />
                                      Cuối buổi
                                    </span>
                                    {slotStatus.end && (
                                      <CheckCircle2 className={`w-4 h-4 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                                    )}
                                  </div>
                                  {endWindow && (
                                    <div className="mb-1.5 space-y-0.5 text-xs">
                                      <p className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        <CheckCircle className="w-3 h-3" />
                                        <span>Đúng giờ: {endWindow.onTimeStart} - {endWindow.onTimeEnd}</span>
                                      </p>
                                      <p className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                        <Timer className="w-3 h-3" />
                                        <span>Trễ: {endWindow.lateStart} - {endWindow.lateEnd}</span>
                                      </p>
                                    </div>
                                  )}
                                  {slotStatus.end ? (
                                    <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      <CheckCircle2 className="w-3 h-3" />
                                      Đã điểm danh
                                    </p>
                                  ) : canCheckInEnd ? (
                                    <button
                                      onClick={() => handleSlotCheckIn(slot.name, 'end')}
                                      disabled={isCheckingIn}
                                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        isDarkMode 
                                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                          : 'bg-blue-600 text-white hover:bg-blue-700'
                                      } ${isCheckingIn ? 'opacity-50' : ''}`}
                                    >
                                      {isCheckingIn ? (
                                        <Loader className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <>
                                          <Camera className="w-3.5 h-3.5" />
                                          Điểm danh
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                      <Timer className="w-3 h-3" />
                                      Chưa đến thời gian
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          
                          {/* Attendance Records Section - Compact Design */}
                          <div className={`mt-4 pt-4 border-t border-dashed`} style={{
                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                          }}>
                            <div className="flex items-center gap-2 mb-3">
                              <ImageIcon className={`w-5 h-5 ${design.iconColor}`} />
                              <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Chi tiết điểm danh
                              </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Start Photo */}
                              {slotStatus.start ? (() => {
                                  const startRecord = (attendanceRecords || []).find(
                                    (r) => r.timeSlot === slot.name && r.checkInType === 'start'
                                  );
                                  return startRecord ? (
                                    <div className={`space-y-2 p-3 rounded-xl border ${
                                      isDarkMode 
                                        ? 'bg-gray-800/50 border-gray-700' 
                                        : 'bg-white/80 backdrop-blur-sm border-gray-200'
                                    }`}>
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex-1">
                                          <p className={`text-xs font-bold flex items-center gap-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                            <Clock className="w-3 h-3" />
                                            Đầu buổi
                                          </p>
                                          {(() => {
                                            const startWindow = getCheckInTimeWindow(slot, 'start');
                                            return startWindow ? (
                                              <div className="mt-0.5 space-y-0.5">
                                                <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                  <CheckCircle2 className="w-3 h-3" />
                                                  Đúng giờ: {startWindow.onTimeStart} - {startWindow.onTimeEnd}
                                                </p>
                                                <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                                  <Timer className="w-3 h-3" />
                                                  Trễ: {startWindow.lateStart} - {startWindow.lateEnd}
                                                </p>
                                              </div>
                                            ) : null;
                                          })()}
                                        </div>
                                      </div>
                                      
                                      {/* Status Badges - Compact Design */}
                                      <div className="flex flex-wrap gap-2 mb-3">
                                        {(() => {
                                          const lateEarlyInfo = calculateLateEarlyForRecord(startRecord);
                                          
                                          return (
                                            <>
                                              {lateEarlyInfo && startRecord.status !== 'rejected' && (
                                                <>
                                                  {lateEarlyInfo.isOnTime ? (
                                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all duration-200 ${
                                                      isDarkMode 
                                                        ? 'text-green-300 border-green-500/40' 
                                                        : 'text-green-700 border-green-300/60'
                                                    }`}>
                                                      <CheckCircle2 className={`w-4 h-4 ${
                                                        isDarkMode ? 'text-green-400' : 'text-green-600'
                                                      }`} />
                                                      <span className="font-bold">Đúng giờ</span>
                                                    </div>
                                                  ) : (
                                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all duration-200 ${
                                                      lateEarlyInfo.isEarly
                                                        ? isDarkMode 
                                                          ? 'text-blue-300 border-blue-500/40' 
                                                          : 'text-blue-700 border-blue-300/60'
                                                        : isDarkMode 
                                                          ? 'text-pink-300 border-pink-500/40' 
                                                          : 'text-pink-700 border-pink-300/60'
                                                    }`}>
                                                      <Clock className={`w-4 h-4 ${
                                                        lateEarlyInfo.isEarly
                                                          ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                                          : isDarkMode ? 'text-pink-400' : 'text-pink-600'
                                                      }`} />
                                                      <span className="font-bold">
                                                        {lateEarlyInfo.isEarly ? 'Sớm' : 'Trễ'} {lateEarlyInfo.minutes !== undefined ? formatMinutesToHours(lateEarlyInfo.minutes) : ''}
                                                      </span>
                                                    </div>
                                                  )}
                                                </>
                                              )}
                                              {startRecord.status !== 'rejected' && (
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all duration-200 ${
                                                  startRecord.status === 'approved'
                                                    ? isDarkMode 
                                                      ? 'text-green-300 border-green-500/40' 
                                                      : 'text-green-700 border-green-300/60'
                                                    : isDarkMode 
                                                      ? 'text-amber-300 border-amber-500/40' 
                                                      : 'text-amber-700 border-amber-300/60'
                                                }`}>
                                                  {startRecord.status === 'approved' ? (
                                                    <CheckCircle2 className={`w-4 h-4 ${
                                                      isDarkMode ? 'text-green-400' : 'text-green-600'
                                                    }`} />
                                                  ) : (
                                                    <Timer className={`w-4 h-4 ${
                                                      isDarkMode ? 'text-amber-400' : 'text-amber-600'
                                                    }`} />
                                                  )}
                                                  <span className="font-bold">
                                                    {startRecord.status === 'approved' ? 'Đã xác nhận' : 'Chờ xác nhận'}
                                                  </span>
                                                </div>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </div>
                                      
                                      {/* Photo - Premium Design */}
                                      {startRecord.photoUrl ? (
                                        <div 
                                          className="relative group rounded-xl overflow-hidden border-2 shadow-lg cursor-pointer"
                                          onClick={() => {
                                            if (startRecord.photoUrl) {
                                              setSelectedImageUrl(startRecord.photoUrl);
                                              setShowImageModal(true);
                                            }
                                          }}
                                        >
                                          <img
                                            src={startRecord.photoUrl}
                                            alt={`Điểm danh đầu buổi ${slot.name}`}
                                            className={`w-full h-32 object-cover transition-all duration-300 ${
                                              startRecord.status === 'rejected'
                                                ? isDarkMode ? 'opacity-50 grayscale' : 'opacity-50 grayscale'
                                                : 'group-hover:scale-105'
                                            }`}
                                        />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2 pointer-events-none">
                                            <div className="px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm pointer-events-auto flex items-center gap-1">
                                              <ImageIcon className="w-3 h-3 text-gray-900" />
                                              <p className="text-xs font-bold text-gray-900">Xem ảnh</p>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className={`w-full h-32 rounded-xl border-2 flex items-center justify-center ${
                                          isDarkMode ? 'border-gray-600' : 'border-gray-300'
                                        }`}>
                                          <div className="text-center">
                                            <ImageIcon className={`w-8 h-8 mx-auto mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Không có ảnh
                                          </p>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Timestamp - Ngày giờ chụp ảnh */}
                                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                                        isDarkMode ? 'border-gray-600' : 'border-gray-200'
                                      }`}>
                                        <Camera className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                                        <div className="flex-1">
                                          <p className={`text-xs font-semibold mb-0.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Thời Gian Chụp Ảnh
                                          </p>
                                          <p className={`text-xs font-bold flex items-center gap-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                                            <Clock className="w-3 h-3" />
                                            {new Date(startRecord.checkInTime).toLocaleString('vi-VN', { 
                                              hour: '2-digit', 
                                              minute: '2-digit', 
                                              second: '2-digit',
                                              day: '2-digit',
                                              month: '2-digit',
                                              year: 'numeric'
                                            })}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      {/* Show rejected status */}
                                      {startRecord.status === 'rejected' && (
                                        <div className={`p-2 rounded border-2 ${
                                          isDarkMode ? 'border-red-500' : 'border-red-500'
                                        }`}>
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <AlertTriangle className={`w-4 h-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                                            <p className={`text-xs font-semibold ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                                              Đã bị hủy
                                            </p>
                                          </div>
                                        {(startRecord.cancelReason || startRecord.verificationNote) && (
                                          <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {startRecord.cancelReason || startRecord.verificationNote}
                                          </p>
                                        )}
                                        </div>
                                      )}
                                      
                                      {/* Additional Info */}
                                      {startRecord.lateReason && startRecord.status !== 'rejected' && (
                                          <div className={`p-2 rounded border-2 text-xs ${
                                            isDarkMode ? 'border-amber-500' : 'border-amber-500'
                                          }`}>
                                            <p className={`font-medium mb-1 flex items-center gap-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                                              <Clock className="w-3 h-3" />
                                              Lý do trễ:
                                            </p>
                                            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                              {startRecord.lateReason}
                                            </p>
                                          </div>
                                        )}
                                        {startRecord.verificationNote && startRecord.status === 'approved' && (
                                          <div className={`p-4 rounded-xl border-2 ${
                                            isDarkMode ? 'border-green-500/40' : 'border-green-300'
                                          }`}>
                                            <div className="flex items-center gap-2 mb-2">
                                              <FileText className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                                              <p className={`font-bold text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                                                Ghi chú từ người quản trị
                                              </p>
                                            </div>
                                            <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                              {startRecord.verificationNote}
                                            </p>
                                            {startRecord.verifiedBy && (
                                              <div className={`flex items-center gap-2 pt-3 border-t ${
                                                isDarkMode ? 'border-green-500/20' : 'border-green-200'
                                              }`}>
                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                                                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                                                }`}>
                                                  <UserCircle className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                                                  <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    {getVerifierName(startRecord.verifiedBy)}
                                                  </span>
                                                </div>
                                                {startRecord.verifiedAt && (
                                                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                                                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                                                  }`}>
                                                    <Clock className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                                                    <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                      {new Date(startRecord.verifiedAt).toLocaleString('vi-VN', { 
                                                  hour: '2-digit', 
                                                  minute: '2-digit', 
                                                  second: '2-digit',
                                                  day: '2-digit',
                                                  month: '2-digit',
                                                  year: 'numeric'
                                                      })}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* Action buttons for pending/rejected status */}
                                        {(startRecord.status === 'pending' || startRecord.status === 'rejected') && (
                                          <div className="flex gap-3">
                                            <button
                                              onClick={() => handleSlotCheckIn(slot.name, 'start')}
                                              disabled={isCheckingIn}
                                              className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 ${
                                                isDarkMode 
                                                  ? 'bg-orange-600 text-white hover:bg-orange-700' 
                                                  : 'bg-orange-600 text-white hover:bg-orange-700'
                                              } ${isCheckingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                              {isCheckingIn ? (
                                                <>
                                                  <Loader className="w-4 h-4 animate-spin" />
                                                  Đang xử lý...
                                                </>
                                              ) : (
                                                <>
                                                  <Camera className="w-4 h-4" />
                                                  Chụp lại
                                                </>
                                              )}
                                            </button>
                                            <button
                                              onClick={() => handleDeleteAttendance(slot.name, 'start')}
                                              disabled={isCheckingIn}
                                              className={`px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 ${
                                                isDarkMode 
                                                  ? 'bg-red-600 text-white hover:bg-red-700' 
                                                  : 'bg-red-600 text-white hover:bg-red-700'
                                              } ${isCheckingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                              Xóa
                                            </button>
                                          </div>
                                        )}
                                    </div>
                                  ) : null;
                                })() : (
                                  // Chưa điểm danh đầu buổi
                                  <div className={`space-y-2 p-3 rounded-xl border ${
                                    isDarkMode 
                                      ? 'bg-gray-800/50 border-gray-700' 
                                      : 'bg-white/80 backdrop-blur-sm border-gray-200'
                                  }`}>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex-1">
                                        <p className={`text-xs font-bold flex items-center gap-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                          <Sun className="w-3.5 h-3.5" />
                                          Đầu buổi
                                        </p>
                                        {(() => {
                                          const startWindow = getCheckInTimeWindow(slot, 'start');
                                          return startWindow ? (
                                            <div className="mt-0.5 space-y-0.5">
                                              <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                <CheckCircle className="w-3 h-3" />
                                                Đúng giờ: {startWindow.onTimeStart} - {startWindow.onTimeEnd}
                                              </p>
                                              <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                                <Timer className="w-3 h-3" />
                                                Trễ: {startWindow.lateStart} - {startWindow.lateEnd}
                                              </p>
                                            </div>
                                          ) : null;
                                        })()}
                                      </div>
                                    </div>
                                    
                                    {/* Status Badge - Chưa điểm danh */}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all duration-200 ${
                                        isDarkMode 
                                          ? 'bg-gray-800/50 text-gray-300 border-gray-600' 
                                          : 'bg-gray-50 text-gray-700 border-gray-200'
                                      }`}>
                                        <PauseCircle className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                        <span className="font-bold">Chưa điểm danh</span>
                                      </div>
                                    </div>
                                    
                                    {/* Empty photo placeholder */}
                                    <div className={`w-full h-32 rounded-xl border-2 flex items-center justify-center ${
                                      isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-100 border-gray-300'
                                    }`}>
                                      <div className="text-center">
                                        <ImageIcon className={`w-8 h-8 mx-auto mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                          Chưa có ảnh điểm danh
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* End Photo */}
                                {slotStatus.end ? (() => {
                                  const endRecord = (attendanceRecords || []).find(
                                    (r) => r.timeSlot === slot.name && r.checkInType === 'end'
                                  );
                                  return endRecord ? (
                                    <div className={`space-y-2 p-3 rounded-xl border ${
                                      isDarkMode 
                                        ? 'bg-gray-800/50 border-gray-700' 
                                        : 'bg-white/80 backdrop-blur-sm border-gray-200'
                                    }`}>
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex-1">
                                          <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                            🌙 Cuối buổi
                                          </p>
                                          {(() => {
                                            const endWindow = getCheckInTimeWindow(slot, 'end');
                                            return endWindow ? (
                                              <div className="mt-0.5 space-y-0.5">
                                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                  ⏰ Đúng giờ: {endWindow.onTimeStart} - {endWindow.onTimeEnd}
                                                </p>
                                                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                                  ⏳ Trễ: {endWindow.lateStart} - {endWindow.lateEnd}
                                                </p>
                                              </div>
                                            ) : null;
                                          })()}
                                        </div>
                                      </div>
                                      
                                      {/* Status Badges - Compact Design */}
                                      <div className="flex flex-wrap gap-2 mb-3">
                                        {(() => {
                                          const lateEarlyInfo = calculateLateEarlyForRecord(endRecord);
                                          
                                          return (
                                            <>
                                              {lateEarlyInfo && endRecord.status !== 'rejected' && (
                                                <>
                                                  {lateEarlyInfo.isOnTime ? (
                                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs shadow-sm transition-all duration-200 ${
                                                      isDarkMode 
                                                        ? 'bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 text-green-300 border border-green-500/40 backdrop-blur-sm' 
                                                        : 'bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 text-green-700 border border-green-300/60 backdrop-blur-sm'
                                                    }`}>
                                                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                                        isDarkMode ? 'bg-green-500/30' : 'bg-green-200'
                                                      }`}>
                                                        <span className="text-xs">✅</span>
                                                      </div>
                                                      <span className="font-bold">Đúng giờ</span>
                                                    </div>
                                                  ) : (
                                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs shadow-sm transition-all duration-200 ${
                                                      lateEarlyInfo.isEarly
                                                        ? isDarkMode 
                                                          ? 'bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-sky-500/20 text-blue-300 border border-blue-500/40 backdrop-blur-sm' 
                                                          : 'bg-gradient-to-r from-blue-50 via-cyan-50 to-sky-50 text-blue-700 border border-blue-300/60 backdrop-blur-sm'
                                                        : isDarkMode 
                                                          ? 'bg-gradient-to-r from-pink-500/20 via-rose-500/20 to-orange-500/20 text-pink-300 border border-pink-500/40 backdrop-blur-sm' 
                                                          : 'bg-gradient-to-r from-pink-50 via-rose-50 to-orange-50 text-pink-700 border border-pink-300/60 backdrop-blur-sm'
                                                    }`}>
                                                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                                        lateEarlyInfo.isEarly
                                                          ? isDarkMode ? 'bg-blue-500/30' : 'bg-blue-200'
                                                          : isDarkMode ? 'bg-pink-500/30' : 'bg-pink-200'
                                                      }`}>
                                                        <span className="text-xs">⏰</span>
                                                      </div>
                                                      <span className="font-bold">
                                                        {lateEarlyInfo.isEarly ? 'Sớm' : 'Trễ'} {lateEarlyInfo.minutes !== undefined ? formatMinutesToHours(lateEarlyInfo.minutes) : ''}
                                                      </span>
                                                    </div>
                                                  )}
                                                </>
                                              )}
                                              {endRecord.status !== 'rejected' && (
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs shadow-sm transition-all duration-200 ${
                                                  endRecord.status === 'approved'
                                                    ? isDarkMode 
                                                      ? 'bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 text-green-300 border border-green-500/40 backdrop-blur-sm' 
                                                      : 'bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 text-green-700 border border-green-300/60 backdrop-blur-sm'
                                                    : isDarkMode 
                                                      ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-sm' 
                                                      : 'bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 text-amber-700 border border-amber-300/60 backdrop-blur-sm'
                                                }`}>
                                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                                    endRecord.status === 'approved'
                                                      ? isDarkMode ? 'bg-green-500/30' : 'bg-green-200'
                                                      : isDarkMode ? 'bg-amber-500/30' : 'bg-amber-200'
                                                  }`}>
                                                    <span className="text-xs">
                                                      {endRecord.status === 'approved' ? '✅' : '⏳'}
                                                    </span>
                                                  </div>
                                                  <span className="font-bold">
                                                    {endRecord.status === 'approved' ? 'Đã xác nhận' : 'Chờ xác nhận'}
                                                  </span>
                                                </div>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </div>
                                      
                                      {/* Photo - Premium Design */}
                                      {endRecord.photoUrl ? (
                                        <div 
                                          className="relative group rounded-xl overflow-hidden border-2 shadow-lg cursor-pointer"
                                          onClick={() => {
                                            if (endRecord.photoUrl) {
                                              setSelectedImageUrl(endRecord.photoUrl);
                                              setShowImageModal(true);
                                            }
                                          }}
                                        >
                                          <img
                                            src={endRecord.photoUrl}
                                            alt={`Điểm danh cuối buổi ${slot.name}`}
                                            className={`w-full h-32 object-cover transition-all duration-300 ${
                                              endRecord.status === 'rejected'
                                                ? isDarkMode ? 'opacity-50 grayscale' : 'opacity-50 grayscale'
                                                : 'group-hover:scale-105'
                                            }`}
                                        />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2 pointer-events-none">
                                            <div className="px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm pointer-events-auto">
                                              <p className="text-xs font-bold text-gray-900">🔍 Xem ảnh</p>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className={`w-full h-32 rounded-xl border-2 flex items-center justify-center ${
                                          isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-100 border-gray-300'
                                        }`}>
                                          <div className="text-center">
                                            <p className={`text-2xl mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>📷</p>
                                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Không có ảnh
                                          </p>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Timestamp - Ngày giờ chụp ảnh */}
                                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                                        isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                                      }`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                          isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                                        }`}>
                                          <span className="text-base">📷</span>
                                        </div>
                                        <div className="flex-1">
                                          <p className={`text-xs font-semibold mb-0.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                              Thời Gian Chụp Ảnh
                                          </p>
                                          <p className={`text-xs font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                                            ⏰ {new Date(endRecord.checkInTime).toLocaleString('vi-VN', { 
                                              hour: '2-digit', 
                                              minute: '2-digit', 
                                              second: '2-digit',
                                              day: '2-digit',
                                              month: '2-digit',
                                              year: 'numeric'
                                            })}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      {/* Show rejected status */}
                                      {endRecord.status === 'rejected' && (
                                        <div className={`p-2 rounded border-2 ${
                                          isDarkMode ? 'bg-red-500/10 border-red-500' : 'bg-red-50 border-red-500'
                                        }`}>
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-sm">⚠️</span>
                                            <p className={`text-xs font-semibold ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                                              Đã bị hủy
                                            </p>
                                          </div>
                                        {(endRecord.cancelReason || endRecord.verificationNote) && (
                                          <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {endRecord.cancelReason || endRecord.verificationNote}
                                          </p>
                                        )}
                                        </div>
                                      )}
                                      
                                      {/* Additional Info */}
                                      {endRecord.lateReason && endRecord.status !== 'rejected' && (
                                          <div className={`p-2 rounded border-2 text-xs ${
                                            isDarkMode ? 'bg-amber-500/10 border-amber-500' : 'bg-amber-50 border-amber-500'
                                          }`}>
                                            <p className={`font-medium mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                                              ⏰ Lý do trễ:
                                            </p>
                                            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                              {endRecord.lateReason}
                                            </p>
                                          </div>
                                        )}
                                        {endRecord.verificationNote && endRecord.status === 'approved' && (
                                          <div className={`p-4 rounded-xl border-2 shadow-md ${
                                            isDarkMode ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/40' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
                                          }`}>
                                            <div className="flex items-center gap-2 mb-2">
                                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                                              }`}>
                                                <span className="text-base">📝</span>
                                      </div>
                                              <p className={`font-bold text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                                                Ghi chú từ người quản trị
                                              </p>
                                            </div>
                                            <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                              {endRecord.verificationNote}
                                            </p>
                                            {endRecord.verifiedBy && (
                                              <div className={`flex items-center gap-2 pt-3 border-t ${
                                                isDarkMode ? 'border-green-500/20' : 'border-green-200'
                                              }`}>
                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                                                  isDarkMode ? 'bg-gray-700/50' : 'bg-white/80'
                                                }`}>
                                                  <svg className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                  </svg>
                                                  <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    {getVerifierName(endRecord.verifiedBy, endRecord.verifiedByName)}
                                                  </span>
                                                </div>
                                                {endRecord.verifiedAt && (
                                                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                                                    isDarkMode ? 'bg-gray-700/50' : 'bg-white/80'
                                                  }`}>
                                                    <svg className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                      {new Date(endRecord.verifiedAt).toLocaleString('vi-VN', { 
                                                  hour: '2-digit', 
                                                  minute: '2-digit', 
                                                  second: '2-digit',
                                                  day: '2-digit',
                                                  month: '2-digit',
                                                  year: 'numeric'
                                                      })}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* Action buttons for pending/rejected status */}
                                        {(endRecord.status === 'pending' || endRecord.status === 'rejected') && (
                                          <div className="flex gap-3">
                                            <button
                                              onClick={() => handleSlotCheckIn(slot.name, 'end')}
                                              disabled={isCheckingIn}
                                              className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 ${
                                                isDarkMode 
                                                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600' 
                                                  : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
                                              } ${isCheckingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                              {isCheckingIn ? '⏳ Đang xử lý...' : '📸 Chụp lại'}
                                            </button>
                                            <button
                                              onClick={() => handleDeleteAttendance(slot.name, 'end')}
                                              disabled={isCheckingIn}
                                              className={`px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 ${
                                                isDarkMode 
                                                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800' 
                                                  : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                                              } ${isCheckingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                              🗑️ Xóa
                                            </button>
                                          </div>
                                        )}
                                    </div>
                                  ) : null;
                                })() : (
                                  // Chưa điểm danh cuối buổi
                                  <div className={`space-y-2 p-3 rounded-xl border ${
                                    isDarkMode 
                                      ? 'bg-gray-800/50 border-gray-700' 
                                      : 'bg-white/80 backdrop-blur-sm border-gray-200'
                                  }`}>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex-1">
                                        <p className={`text-xs font-bold flex items-center gap-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                          <Moon className="w-3.5 h-3.5" />
                                          Cuối buổi
                                        </p>
                                        {(() => {
                                          const endWindow = getCheckInTimeWindow(slot, 'end');
                                          return endWindow ? (
                                            <div className="mt-0.5 space-y-0.5">
                                              <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                <CheckCircle className="w-3 h-3" />
                                                Đúng giờ: {endWindow.onTimeStart} - {endWindow.onTimeEnd}
                                              </p>
                                              <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                                <Timer className="w-3 h-3" />
                                                Trễ: {endWindow.lateStart} - {endWindow.lateEnd}
                                              </p>
                                            </div>
                                          ) : null;
                                        })()}
                                      </div>
                                    </div>
                                    
                                    {/* Status Badge - Chưa điểm danh */}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all duration-200 ${
                                        isDarkMode 
                                          ? 'bg-gray-800/50 text-gray-300 border-gray-600' 
                                          : 'bg-gray-50 text-gray-700 border-gray-200'
                                      }`}>
                                        <PauseCircle className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                        <span className="font-bold">Chưa điểm danh</span>
                                      </div>
                                    </div>
                                    
                                    {/* Empty photo placeholder */}
                                    <div className={`w-full h-32 rounded-xl border-2 flex items-center justify-center ${
                                      isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-100 border-gray-300'
                                    }`}>
                                      <div className="text-center">
                                        <ImageIcon className={`w-8 h-8 mx-auto mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                          Chưa có ảnh điểm danh
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          
                          {/* Status Message - Compact Design */}
                          {!isDuringSlot && (
                            <div className={`mt-3 pt-3 border-t border-dashed`} style={{
                              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                            }}>
                              {isBeforeSlot && (
                                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                                  isDarkMode 
                                    ? 'bg-gray-700/50 border border-gray-600' 
                                    : 'bg-gray-100 border border-gray-300'
                                }`}>
                                  <Timer className={`w-3.5 h-3.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                                  <p className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Chưa đến thời gian buổi này
                                  </p>
                                </div>
                              )}
                              {isAfterSlot && (
                                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                                  isDarkMode 
                                    ? 'bg-gray-700/50 border border-gray-600' 
                                    : 'bg-gray-100 border border-gray-300'
                                }`}>
                                  <CheckCircle2 className={`w-3.5 h-3.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                                  <p className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Đã qua thời gian buổi này
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                })}
              </div>
            </div>
          ) : (
            <div className={`text-center py-8 rounded-xl border ${
              isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}>
              <Calendar className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Không có buổi nào được lên lịch
              </p>
            </div>
          )}
          
          {/* Map Section - Compact Design */}
          {((activity.type === 'multiple_days' && selectedDaySlot && parsedScheduleData.length > 0) || 
            (activity.type === 'single_day' && (activity.locationData || (activity.multiTimeLocations && activity.multiTimeLocations.length > 0))) || 
            userLocation) && !showCamera && (
            <div className="mt-4">
            {/* Interactive Map - Compact Design */}
            <div className={`rounded-xl overflow-hidden ${
              isDarkMode 
                ? 'bg-gray-800/50 border border-gray-700' 
                : 'bg-white border border-gray-200'
            } shadow-lg`}>
                {/* Map Header - Compact */}
                <div className={`p-3 border-b ${
                  isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                      }`}>
                        <Map className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Bản đồ tương tác
                        </h3>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Xem vị trí trên bản đồ
                        </p>
                      </div>
                    </div>
                    {locationStatus && (
                      <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                        locationStatus.valid
                          ? isDarkMode 
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                            : 'bg-green-100 text-green-700 border border-green-200'
                          : isDarkMode 
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                            : 'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {locationStatus.valid ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="relative overflow-hidden" style={{ height: '350px' }}>
                  {mapCenter && 
                   Array.isArray(mapCenter) && 
                   mapCenter.length === 2 && 
                   typeof mapCenter[0] === 'number' && 
                   typeof mapCenter[1] === 'number' &&
                   !isNaN(mapCenter[0]) && 
                   !isNaN(mapCenter[1]) ? (
                    <MapContainer
                      center={mapCenter}
                      zoom={13}
                      style={{ height: '100%', width: '100%', zIndex: 1 }}
                      zoomControl={true}
                      doubleClickZoom={false}
                      dragging={true}
                      scrollWheelZoom={true}
                      key={`map-${selectedDaySlot ? `${selectedDaySlot.day}-${selectedDaySlot.slot}` : 'default'}-${mapCenter[0]}-${mapCenter[1]}`}
                      whenReady={() => {
                        // Map is ready, this prevents errors with markers
                      }}
                      preferCanvas={false}
                    >
                    <TileLayer
                      url={isDarkMode
                        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                      }
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    {/* Fit bounds to show both locations */}
                    {(() => {
                      const bounds: [number, number][] = [];
                      
                      // Handle multiple days activities
                      if (activity.type === 'multiple_days' && selectedDaySlot) {
                        const dayData = parsedScheduleData.find(d => d.day === selectedDaySlot.day);
                        if (dayData) {
                          const slot = dayData.slots.find(s => s.slotKey === selectedDaySlot.slot);
                          const location = slot?.mapLocation || dayData.dayMapLocation;
                          if (location && location.lat && location.lng &&
                              typeof location.lat === 'number' && 
                              typeof location.lng === 'number' &&
                              !isNaN(location.lat) &&
                              !isNaN(location.lng)) {
                            bounds.push([location.lat, location.lng]);
                          }
                        }
                      } else {
                        // Add activity locations to bounds (single day)
                        if (activity.locationData && 
                            typeof activity.locationData.lat === 'number' && 
                            typeof activity.locationData.lng === 'number' &&
                            !isNaN(activity.locationData.lat) &&
                            !isNaN(activity.locationData.lng)) {
                          bounds.push([activity.locationData.lat, activity.locationData.lng]);
                        }
                        if (activity.multiTimeLocations) {
                          activity.multiTimeLocations.forEach(mtl => {
                            if (mtl?.location &&
                                typeof mtl.location.lat === 'number' && 
                                typeof mtl.location.lng === 'number' &&
                                !isNaN(mtl.location.lat) &&
                                !isNaN(mtl.location.lng)) {
                              bounds.push([mtl.location.lat, mtl.location.lng]);
                            }
                          });
                        }
                      }
                      
                      // Add user location to bounds
                      if (userLocation &&
                          typeof userLocation.lat === 'number' && 
                          typeof userLocation.lng === 'number' &&
                          !isNaN(userLocation.lat) &&
                          !isNaN(userLocation.lng)) {
                        bounds.push([userLocation.lat, userLocation.lng]);
                      }
                      
                      return bounds.length > 0 ? <FitBounds bounds={bounds} /> : null;
                    })()}

                    {/* Activity Location Marker - For Multiple Days */}
                    {activity.type === 'multiple_days' && selectedDaySlot && (() => {
                      const dayData = parsedScheduleData.find(d => d.day === selectedDaySlot.day);
                      if (dayData) {
                        const slot = dayData.slots.find(s => s.slotKey === selectedDaySlot.slot);
                        const location = slot?.mapLocation || dayData.dayMapLocation;
                        if (location && location.lat && location.lng &&
                            typeof location.lat === 'number' && 
                            typeof location.lng === 'number' &&
                            !isNaN(location.lat) &&
                            !isNaN(location.lng)) {
                          const slotName = selectedDaySlot.slot === 'morning' ? 'Buổi Sáng' : selectedDaySlot.slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
                          return (
                            <>
                              <Marker 
                                key={`activity-marker-${selectedDaySlot.day}-${selectedDaySlot.slot}-${location.lat}-${location.lng}`}
                                position={[location.lat, location.lng]}
                                icon={(() => {
                                  if (typeof window !== 'undefined') {
                                    const L = require('leaflet');
                                    return L.divIcon({
                                      className: 'activity-location-marker',
                                      html: `<div style="
                                        background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
                                        width: 56px;
                                        height: 56px;
                                        border-radius: 50%;
                                        border: 5px solid white;
                                        box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6), 0 0 0 3px rgba(37, 99, 235, 0.3);
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        font-size: 28px;
                                        font-weight: bold;
                                      ">📍</div>`,
                                      iconSize: [56, 56],
                                      iconAnchor: [28, 28]
                                    });
                                  }
                                  return undefined;
                                })()}
                              >
                                <Popup>
                                  <div className="text-center">
                                    <p className="font-bold text-sm">🏢 {activity.name}</p>
                                    <p className="text-xs mt-1">Ngày {selectedDaySlot.day} - {slotName}</p>
                                    <p className="text-xs mt-1">{location.address || 'N/A'}</p>
                                    <p className="text-xs mt-1">Bán kính: {location.radius || 200}m</p>
                                  </div>
                                </Popup>
                              </Marker>
                              {typeof location.radius === 'number' && !isNaN(location.radius) && location.radius > 0 && (
                                <Circle
                                  key={`circle-${selectedDaySlot.day}-${selectedDaySlot.slot}-${location.lat}-${location.lng}`}
                                  center={[location.lat, location.lng]}
                                  radius={location.radius}
                                  pathOptions={{
                                    color: '#2563eb',
                                    fillColor: '#3b82f6',
                                    fillOpacity: 0.25,
                                    weight: 4,
                                    dashArray: '10, 5'
                                  }}
                                />
                              )}
                            </>
                          );
                        }
                      }
                      return null;
                    })()}

                    {/* Activity Location Marker - For Single Day */}
                    {activity.type === 'single_day' && activity.locationData && 
                     typeof activity.locationData.lat === 'number' && 
                     typeof activity.locationData.lng === 'number' &&
                     !isNaN(activity.locationData.lat) &&
                     !isNaN(activity.locationData.lng) && (
                      <>
                        <Marker 
                          position={[activity.locationData.lat, activity.locationData.lng]}
                          icon={(() => {
                            if (typeof window !== 'undefined') {
                              const L = require('leaflet');
                              return L.divIcon({
                                className: 'activity-location-marker',
                                html: `<div style="
                                  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
                                  width: 56px;
                                  height: 56px;
                                  border-radius: 50%;
                                  border: 5px solid white;
                                  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6), 0 0 0 3px rgba(37, 99, 235, 0.3);
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  font-size: 28px;
                                  font-weight: bold;
                                ">📍</div>`,
                                iconSize: [56, 56],
                                iconAnchor: [28, 28]
                              });
                            }
                            return undefined;
                          })()}
                        >
                          <Popup>
                            <div className="text-center">
                              <p className="font-bold text-sm">🏢 {activity.name}</p>
                              <p className="text-xs mt-1">{activity.locationData.address}</p>
                              <p className="text-xs mt-1">Bán kính: {activity.locationData.radius}m</p>
                            </div>
                          </Popup>
                        </Marker>
                        {typeof activity.locationData.radius === 'number' && !isNaN(activity.locationData.radius) && (
                          <Circle
                            key={`circle-${activity.locationData.lat}-${activity.locationData.lng}`}
                            center={[activity.locationData.lat, activity.locationData.lng]}
                            radius={activity.locationData.radius}
                            pathOptions={{
                              color: '#2563eb',
                              fillColor: '#3b82f6',
                              fillOpacity: 0.25,
                              weight: 4,
                              dashArray: '10, 5'
                            }}
                          />
                        )}
                      </>
                    )}

                    {/* Multi-time locations - Enhanced Design */}
                    {activity?.multiTimeLocations && Array.isArray(activity.multiTimeLocations) && activity.multiTimeLocations.map((mtl, idx) => {
                      if (!mtl?.location || 
                          typeof mtl.location.lat !== 'number' || 
                          typeof mtl.location.lng !== 'number' ||
                          isNaN(mtl.location.lat) ||
                          isNaN(mtl.location.lng)) {
                        return null;
                      }
                      
                      const timeSlotColors: { [key: string]: { color: string; fillColor: string; gradient: string } } = {
                        'morning': { 
                          color: '#eab308', 
                          fillColor: '#facc15',
                          gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                        },
                        'afternoon': { 
                          color: '#3b82f6', 
                          fillColor: '#60a5fa',
                          gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                        },
                        'evening': { 
                          color: '#a855f7', 
                          fillColor: '#c084fc',
                          gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)'
                        }
                      };
                      const colors = timeSlotColors[mtl.timeSlot] || timeSlotColors['morning'];
                      const timeSlotNames: { [key: string]: string } = {
                        'morning': 'Buổi Sáng',
                        'afternoon': 'Buổi Chiều',
                        'evening': 'Buổi Tối'
                      };
                      const slotIcons: { [key: string]: string } = {
                        'morning': '🌅',
                        'afternoon': '☀️',
                        'evening': '🌙'
                      };
                      
                      return (
                        <React.Fragment key={`mtl-${idx}-${mtl.location.lat}-${mtl.location.lng}`}>
                          <Marker 
                            position={[mtl.location.lat, mtl.location.lng]}
                            icon={(() => {
                              if (typeof window !== 'undefined') {
                                try {
                                  const L = require('leaflet');
                                  return L.divIcon({
                                    className: 'activity-location-marker',
                                    html: `<div style="
                                    background: ${colors.gradient};
                                    width: 50px;
                                    height: 50px;
                                      border-radius: 50%;
                                    border: 5px solid white;
                                    box-shadow: 0 6px 20px ${colors.color}80, 0 0 0 3px ${colors.color}40;
                                      display: flex;
                                      align-items: center;
                                      justify-content: center;
                                    font-size: 24px;
                                    font-weight: bold;
                                    position: relative;
                                  ">
                                    <div style="
                                      position: absolute;
                                      top: -8px;
                                      right: -8px;
                                      background: white;
                                      border-radius: 50%;
                                      width: 20px;
                                      height: 20px;
                                      display: flex;
                                      align-items: center;
                                      justify-content: center;
                                      font-size: 10px;
                                      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                                    ">${slotIcons[mtl.timeSlot]}</div>
                                    <div style="
                                      width: 12px;
                                      height: 12px;
                                      background: white;
                                      border-radius: 50%;
                                      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                    "></div>
                                  </div>`,
                                  iconSize: [50, 50],
                                  iconAnchor: [25, 25]
                                  });
                                } catch (error) {
                                  console.log('Error creating multi-time location marker icon:', error);
                                  return undefined;
                                }
                              }
                              return undefined;
                            })()}
                          >
                            <Popup>
                              <div className="text-center p-2">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <span className="text-lg">{slotIcons[mtl.timeSlot]}</span>
                                  <p className="font-bold text-sm">{timeSlotNames[mtl.timeSlot]}</p>
                                </div>
                                <p className="text-xs font-semibold text-gray-700 mb-1">{activity.name}</p>
                                <p className="text-xs text-gray-600 mt-1">{mtl.location.address || 'N/A'}</p>
                                <div className={`mt-2 px-2 py-1 rounded text-xs font-bold ${
                                  mtl.timeSlot === 'morning' ? 'bg-yellow-100 text-yellow-700' :
                                  mtl.timeSlot === 'afternoon' ? 'bg-blue-100 text-blue-700' :
                                  'bg-purple-100 text-purple-700'
                                }`}>
                                  Bán kính: {mtl.radius}m
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                          {typeof mtl.radius === 'number' && !isNaN(mtl.radius) && mtl.radius > 0 && (
                            <Circle
                              center={[mtl.location.lat, mtl.location.lng]}
                              radius={mtl.radius}
                              pathOptions={{
                                color: colors.color,
                                fillColor: colors.fillColor,
                              fillOpacity: 0.2,
                              weight: 4,
                              dashArray: '8, 4'
                              }}
                            />
                          )}
                        </React.Fragment>
                      );
                    }).filter(Boolean)}

                    {/* User Location Marker - Larger and more visible */}
                    {userLocation &&
                     typeof userLocation.lat === 'number' && 
                     typeof userLocation.lng === 'number' &&
                     !isNaN(userLocation.lat) &&
                     !isNaN(userLocation.lng) && (
                      <>
                        <Marker 
                          key={`user-marker-${userLocation.lat}-${userLocation.lng}-${locationStatus?.valid ? 'valid' : 'invalid'}`}
                          position={[userLocation.lat, userLocation.lng]}
                          icon={(() => {
                            if (typeof window !== 'undefined') {
                              const L = require('leaflet');
                              const isValid = locationStatus?.valid ?? false;
                              const bgColor = isValid ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)';
                              const shadowColor = isValid ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)';
                              const ringColor = isValid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
                              return L.divIcon({
                                className: 'user-location-marker',
                                html: `<div style="
                                  background: ${bgColor};
                                  width: 60px;
                                  height: 60px;
                                  border-radius: 50%;
                                  border: 6px solid white;
                                  box-shadow: 0 8px 24px ${shadowColor}, 0 0 0 4px ${ringColor};
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  font-size: 32px;
                                  font-weight: bold;
                                  animation: pulse 2s infinite;
                                ">👤</div>
                                <style>
                                  @keyframes pulse {
                                    0%, 100% { 
                                      transform: scale(1);
                                      box-shadow: 0 8px 24px ${shadowColor}, 0 0 0 4px ${ringColor};
                                    }
                                    50% { 
                                      transform: scale(1.15);
                                      box-shadow: 0 12px 32px ${shadowColor}, 0 0 0 8px ${ringColor};
                                    }
                                  }
                                </style>`,
                                iconSize: [60, 60],
                                iconAnchor: [30, 30]
                              });
                            }
                            return undefined;
                          })()}
                        >
                          <Popup>
                            <div className="text-center">
                              <p className="font-bold text-sm">👤 Vị trí của bạn</p>
                              {locationAddress ? (
                                <p className="text-xs mt-1">{locationAddress}</p>
                              ) : (
                                <>
                                  <p className="text-xs mt-1">Lat: {userLocation.lat.toFixed(6)}</p>
                                  <p className="text-xs">Lng: {userLocation.lng.toFixed(6)}</p>
                                </>
                              )}
                              {locationStatus && locationStatus.distance !== undefined && (
                                <p className={`text-xs mt-1 font-semibold ${
                                  locationStatus.valid ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  Khoảng cách: {locationStatus.distance.toFixed(0)}m
                                </p>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                        
                        {/* Draw line connecting user location to activity location */}
                        {(() => {
                          let activityLocation: { lat: number; lng: number } | null = null;
                          
                          // Handle multiple days
                          if (activity.type === 'multiple_days' && selectedDaySlot) {
                            const dayData = parsedScheduleData.find(d => d.day === selectedDaySlot.day);
                            if (dayData) {
                              const slot = dayData.slots.find(s => s.slotKey === selectedDaySlot.slot);
                              const location = slot?.mapLocation || dayData.dayMapLocation;
                              if (location && location.lat && location.lng &&
                                  typeof location.lat === 'number' && 
                                  typeof location.lng === 'number' &&
                                  !isNaN(location.lat) &&
                                  !isNaN(location.lng)) {
                                activityLocation = { lat: location.lat, lng: location.lng };
                              }
                            }
                          } else if (activity.locationData &&
                             typeof activity.locationData.lat === 'number' && 
                             typeof activity.locationData.lng === 'number' &&
                             !isNaN(activity.locationData.lat) &&
                             !isNaN(activity.locationData.lng)) {
                            activityLocation = { lat: activity.locationData.lat, lng: activity.locationData.lng };
                          }
                          
                          if (activityLocation &&
                              userLocation &&
                              typeof userLocation.lat === 'number' && 
                              typeof userLocation.lng === 'number' &&
                              !isNaN(userLocation.lat) &&
                              !isNaN(userLocation.lng)) {
                            return (
                              <Polyline
                                key={`polyline-${userLocation.lat}-${userLocation.lng}-${activityLocation.lat}-${activityLocation.lng}`}
                                positions={[
                                  [userLocation.lat, userLocation.lng],
                                  [activityLocation.lat, activityLocation.lng]
                                ]}
                                pathOptions={{
                                  color: locationStatus?.valid ? '#10b981' : '#ef4444',
                                  weight: 3,
                                  opacity: 0.6,
                                  dashArray: '10, 5'
                                }}
                              />
                            );
                          }
                          return null;
                        })()}
                      </>
                    )}
                  </MapContainer>
                  ) : (
                    <div className={`h-full flex items-center justify-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                      <div className="text-center p-4">
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Không có dữ liệu vị trí bản đồ
                        </p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          Vui lòng kiểm tra lại thông tin hoạt động
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Legend - Compact Design */}
                <div className={`p-2.5 border-t ${
                  isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    {/* User Location Status */}
                    {userLocation && locationStatus && (
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          locationStatus.valid 
                            ? 'bg-green-500' 
                            : 'bg-red-500'
                        }`}>
                          <User className={`w-3 h-3 text-white`} />
                        </div>
                        <div>
                          <span className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Vị trí của bạn
                          </span>
                          {locationStatus.distance !== undefined && (
                            <p className={`text-xs font-medium flex items-center gap-1 ${
                              locationStatus.valid 
                                ? isDarkMode ? 'text-green-400' : 'text-green-600'
                                : isDarkMode ? 'text-red-400' : 'text-red-600'
                            }`}>
                              {locationStatus.valid ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <AlertTriangle className="w-3 h-3" />
                              )}
                              {locationStatus.distance.toFixed(0)}m
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Quick Legend Icons */}
                    <div className="flex items-center gap-3">
                      {activity.multiTimeLocations && activity.multiTimeLocations.length > 0 ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border border-white shadow-sm"></div>
                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sáng</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 border border-white shadow-sm"></div>
                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Chiều</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 border border-white shadow-sm"></div>
                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tối</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 border border-white shadow-sm"></div>
                          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Vị trí</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* User Address */}
                  {userLocation && locationAddress && (
                    <div className={`mt-2 pt-2 border-t ${
                      isDarkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className="font-semibold">📍</span> {locationAddress}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90">
          <div className="w-full h-full max-w-4xl mx-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/50">
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-white'}`}>
                Chụp ảnh điểm danh
              </h3>
              <button
                onClick={closeCamera}
                className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-700'}`}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Video Preview */}
            <div className="flex-1 relative bg-black flex items-center justify-center">
              {!capturedPhoto ? (
                <>
                  {stream ? (
                    <video
                      ref={(el) => {
                        if (el) {
                          setVideoRef(el);
                          // Set srcObject immediately when ref is set
                          if (stream && el.srcObject !== stream) {
                            el.srcObject = stream;
                            // Play video
                            const playPromise = el.play();
                            if (playPromise !== undefined) {
                              playPromise.catch((err) => {
                                // Ignore AbortError
                                if (err.name !== 'AbortError') {
                                  console.error('Error playing video:', err);
                                }
                              });
                            }
                          }
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain"
                      style={{ transform: 'scaleX(-1)' }} // Mirror for selfie
                      onLoadedMetadata={() => {
                        // Ensure video plays when metadata is loaded
                        if (videoRef && stream) {
                          const playPromise = videoRef.play();
                          if (playPromise !== undefined) {
                            playPromise.catch((err) => {
                              if (err.name !== 'AbortError') {
                                console.error('Error playing video:', err);
                              }
                            });
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="text-white text-center">
                      <Loader className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                      <p>Đang khởi động camera...</p>
                    </div>
                  )}
                </>
              ) : (
                <img
                  src={capturedPhoto}
                  alt="Captured"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Controls */}
            <div className="p-6 bg-black/50">
              {!capturedPhoto ? (
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={closeCamera}
                    className={`px-6 py-3 rounded-lg font-semibold ${
                      isDarkMode 
                        ? 'bg-gray-700 text-white hover:bg-gray-600' 
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={capturePhoto}
                    disabled={isCapturing}
                    className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                  >
                    <div className="w-16 h-16 rounded-full bg-white border-2 border-gray-400"></div>
                  </button>
                  <div className="w-20"></div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={retakePhoto}
                    className={`px-6 py-3 rounded-lg font-semibold ${
                      isDarkMode 
                        ? 'bg-gray-700 text-white hover:bg-gray-600' 
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                  >
                    Chụp lại
                  </button>
                  <button
                    onClick={() => {
                      if (capturedPhoto) {
                        const pendingCheckIn = (window as any).pendingCheckIn;
                        const photoCheckInTime = (window as any).photoCheckInTime as Date | undefined;
                        
                        // Validate pendingCheckIn data before proceeding
                        if (!pendingCheckIn || !pendingCheckIn.slotName || !pendingCheckIn.checkInType) {
                          console.error('Missing pendingCheckIn data:', pendingCheckIn);
                          setError('Dữ liệu điểm danh không hợp lệ. Vui lòng thử lại.');
                          closeCamera();
                          delete (window as any).pendingCheckIn;
                          delete (window as any).photoCheckInTime;
                          return;
                        }
                        
                        // Check if late or early before proceeding (using photo capture time)
                        if (pendingCheckIn.slotName && pendingCheckIn.checkInType && photoCheckInTime) {
                          const lateCheck = checkIfLateForTime(pendingCheckIn.slotName, pendingCheckIn.checkInType, photoCheckInTime);
                          if (lateCheck.isLate || lateCheck.isEarly) {
                            // Show late/early modal
                            setLateInfo({
                              minutes: lateCheck.isLate ? (lateCheck.minutesLate || 0) : (lateCheck.minutesEarly || 0),
                              slotName: pendingCheckIn.slotName,
                              checkInType: pendingCheckIn.checkInType,
                              isEarly: lateCheck.isEarly || false
                            });
                            setPendingCheckInData({ 
                              photoDataUrl: capturedPhoto, 
                              slotName: pendingCheckIn.slotName, 
                              checkInType: pendingCheckIn.checkInType,
                              checkInTime: photoCheckInTime
                            });
                            setShowLateModal(true);
                            return;
                          }
                        }
                        proceedWithCheckIn(capturedPhoto, pendingCheckIn.slotName, pendingCheckIn.checkInType);
                      }
                    }}
                    disabled={isCheckingIn}
                    className={`px-8 py-3 rounded-lg font-semibold ${
                      isDarkMode 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    } ${isCheckingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isCheckingIn ? 'Đang xử lý...' : 'Xác nhận điểm danh'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal - Hiển thị khi điểm danh thành công */}
      {showSuccessModal && successMessage && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-sm success-modal-overlay">
          <div className={`w-full max-w-md mx-4 rounded-3xl shadow-2xl transform transition-all success-modal-content ${
            isDarkMode ? 'bg-gradient-to-br from-green-900/95 to-emerald-900/95 border-2 border-green-500/50' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300'
          }`}>
            <div className="p-8 text-center">
              {/* Success Icon with Animation */}
              <div className="mb-6 flex justify-center">
                <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${
                  isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                }`}>
                  <div className={`absolute inset-0 rounded-full success-icon-ping ${
                    isDarkMode ? 'bg-green-500/30' : 'bg-green-200'
                  }`}></div>
                  <svg 
                    className="w-12 h-12 text-green-500 relative z-10 success-icon-bounce" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={3} 
                      d="M5 13l4 4L19 7" 
                    />
                  </svg>
                </div>
              </div>

              {/* Success Message */}
              <h3 className={`text-2xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                🎉 Điểm danh thành công!
              </h3>
              <p className={`text-lg mb-6 ${
                isDarkMode ? 'text-green-200' : 'text-green-700'
              }`}>
                {successMessage}
              </p>

              {/* Additional Info */}
              <div className={`mb-6 p-4 rounded-xl ${
                isDarkMode ? 'bg-green-500/10 border border-green-500/30' : 'bg-white border border-green-200'
              }`}>
                <p className={`text-sm font-semibold mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  ✅ Thông tin điểm danh của bạn đã được ghi nhận
                </p>
                <p className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Vui lòng đợi người quản trị xác nhận
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                }}
                className={`w-full px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  isDarkMode 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                } shadow-lg`}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Late Check-in Modal */}
      {showLateModal && lateInfo && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  lateInfo.isEarly 
                    ? isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                    : isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-100'
                }`}>
                  <span className="text-2xl">{lateInfo.isEarly ? '⏰' : '⚠️'}</span>
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {lateInfo.isEarly ? 'Cảnh báo điểm danh sớm' : 'Cảnh báo điểm danh trễ'}
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {lateInfo.isEarly ? 'Bạn đang điểm danh sớm' : 'Bạn đang điểm danh trễ'}
                  </p>
                </div>
              </div>

              <div className={`mb-4 p-4 rounded-lg ${
                lateInfo.isEarly
                  ? isDarkMode ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
                  : isDarkMode ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <p className={`text-sm font-semibold mb-2 ${
                  lateInfo.isEarly
                    ? isDarkMode ? 'text-blue-300' : 'text-blue-700'
                    : isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
                }`}>
                  ⏰ {lateInfo.isEarly ? 'Thông tin sớm' : 'Thông tin trễ'}
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Bạn đang điểm danh <span className={`font-bold ${
                    lateInfo.isEarly
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {lateInfo.isEarly ? 'sớm' : 'trễ'} {formatMinutesToHours(lateInfo.minutes)}
                  </span> so với thời gian quy định.
                </p>
                <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Buổi: <span className="font-medium">{lateInfo.slotName}</span> - {lateInfo.checkInType === 'start' ? 'Đầu buổi' : 'Cuối buổi'}
                </p>
              </div>

              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {lateInfo.isEarly ? 'Lý do sớm' : 'Lý do trễ'} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={lateReason}
                  onChange={(e) => setLateReason(e.target.value)}
                  placeholder={lateInfo.isEarly 
                    ? "Vui lòng nhập lý do điểm danh sớm (bắt buộc). VD: Đến sớm, hoàn thành công việc sớm..." 
                    : "Vui lòng nhập lý do trễ (bắt buộc). VD: Điện thoại hư, kẹt xe, yếu tố khách quan..."}
                  className={`w-full px-4 py-3 rounded-lg border resize-none ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 ${
                    lateInfo.isEarly ? 'focus:ring-blue-500/20' : 'focus:ring-yellow-500/20'
                  }`}
                  rows={4}
                />
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Lý do này sẽ được gửi đến người quản trị để xem xét và duyệt điểm danh.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowLateModal(false);
                    setLateReason('');
                    setLateInfo(null);
                    setPendingCheckInData(null);
                    // Clear pending check-in data
                    delete (window as any).pendingCheckIn;
                    delete (window as any).photoCheckInTime;
                  }}
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
                    if (!lateReason.trim()) {
                      setError(lateInfo.isEarly ? 'Vui lòng nhập lý do sớm' : 'Vui lòng nhập lý do trễ');
                      return;
                    }
                    if (pendingCheckInData) {
                      // Restore photoCheckInTime from pendingCheckInData if available
                      if (pendingCheckInData.checkInTime) {
                        (window as any).photoCheckInTime = pendingCheckInData.checkInTime;
                      }
                      await proceedWithCheckIn(
                        pendingCheckInData.photoDataUrl,
                        pendingCheckInData.slotName,
                        pendingCheckInData.checkInType,
                        lateReason.trim()
                      );
                    }
                  }}
                  disabled={!lateReason.trim() || isCheckingIn}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                    lateInfo.isEarly
                      ? isDarkMode 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                      : isDarkMode 
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                        : 'bg-yellow-500 text-white hover:bg-yellow-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isCheckingIn ? 'Đang xử lý...' : lateInfo.isEarly ? 'Xác nhận điểm danh sớm' : 'Xác nhận điểm danh trễ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageModal && selectedImageUrl && (
        <div 
          className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => {
            setShowImageModal(false);
            setSelectedImageUrl(null);
          }}
        >
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* Close button */}
            <button
              onClick={() => {
                setShowImageModal(false);
                setSelectedImageUrl(null);
              }}
              className={`absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 ${
                isDarkMode 
                  ? 'bg-gray-800/90 text-white hover:bg-gray-700' 
                  : 'bg-white/90 text-gray-900 hover:bg-white'
              } shadow-lg`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image container */}
            <div 
              className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImageUrl}
                alt="Ảnh điểm danh"
                className="max-w-full max-h-[95vh] object-contain rounded-lg shadow-2xl"
                style={{
                  animation: 'fadeIn 0.3s ease-in-out'
                }}
              />
            </div>

            {/* Download button */}
            <a
              href={selectedImageUrl}
              download={`attendance_photo_${Date.now()}.jpg`}
              onClick={(e) => e.stopPropagation()}
              className={`absolute bottom-4 right-4 z-10 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 hover:scale-105 ${
                isDarkMode 
                  ? 'bg-gray-800/90 text-white hover:bg-gray-700' 
                  : 'bg-white/90 text-gray-900 hover:bg-white'
              } shadow-lg`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="text-sm font-medium">Tải xuống</span>
            </a>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
