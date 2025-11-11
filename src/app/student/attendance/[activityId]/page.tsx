'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import StudentNav from '@/components/student/StudentNav';
import Footer from '@/components/common/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';

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

interface Activity {
  _id: string;
  name: string;
  date: string;
  location: string;
  timeSlots: TimeSlot[];
  locationData?: {
    lat: number;
    lng: number;
    address: string;
    radius: number;
  };
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
  const getVerifierName = (verifiedBy: any): string => {
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

        setActivity({
          _id: rawActivity._id,
          name: rawActivity.name,
          date: rawActivity.date?.$date 
            ? new Date(rawActivity.date.$date).toLocaleDateString('vi-VN')
            : new Date(rawActivity.date).toLocaleDateString('vi-VN'),
          location: rawActivity.location,
          timeSlots: rawActivity.timeSlots?.filter((slot: any) => slot.isActive).map((slot: any) => ({
            name: slot.name,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isActive: slot.isActive,
            activities: slot.activities || '',
            detailedLocation: slot.detailedLocation || ''
          })) || [],
          locationData: rawActivity.locationData,
          multiTimeLocations: rawActivity.multiTimeLocations
        });

        // Set map center based on activity location
        if (rawActivity.locationData) {
          setMapCenter([rawActivity.locationData.lat, rawActivity.locationData.lng]);
        } else if (rawActivity.multiTimeLocations && rawActivity.multiTimeLocations.length > 0) {
          const firstLocation = rawActivity.multiTimeLocations[0];
          setMapCenter([firstLocation.location.lat, firstLocation.location.lng]);
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

  // Check if user location is within allowed radius
  const checkLocationValidity = (userLat: number, userLng: number): { valid: boolean; distance?: number; message?: string } => {
    if (!activity) {
      return { valid: false, message: 'Không tìm thấy thông tin hoạt động' };
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

  // Helper function to get check-in time window for a slot
  // Returns both on-time window (auto-approve) and late window (pending)
  const getCheckInTimeWindow = (slot: TimeSlot, checkInType: 'start' | 'end'): { 
    onTimeStart: string; 
    onTimeEnd: string; 
    lateStart: string; 
    lateEnd: string;
  } | null => {
    if (!activity) return null;
    
    try {
      let activityDate: Date;
      const dateParts = activity.date.split('/');
      if (dateParts.length === 3) {
        activityDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
      } else {
        activityDate = new Date(activity.date);
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
  const calculateLateEarlyForRecord = (record: {
    timeSlot: string;
    checkInType: string;
    checkInTime: string;
    lateReason?: string;
  }): { isLate: boolean; isEarly: boolean; isOnTime?: boolean; minutes?: number; isInLateWindow?: boolean } | null => {
    if (!activity || !activity.timeSlots) return null;
    
    const timeSlot = activity.timeSlots.find(ts => ts.name === record.timeSlot && ts.isActive);
    if (!timeSlot) return null;
    
    const checkInTime = new Date(record.checkInTime);
    
    try {
      let activityDate: Date;
      const dateParts = activity.date.split('/');
      if (dateParts.length === 3) {
        activityDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
      } else {
        activityDate = new Date(activity.date);
      }
      
      const [startHours, startMinutes] = timeSlot.startTime.split(':').map(Number);
      const [endHours, endMinutes] = timeSlot.endTime.split(':').map(Number);
      
      const slotStartTime = new Date(activityDate);
      slotStartTime.setHours(startHours, startMinutes, 0, 0);
      
      const slotEndTime = new Date(activityDate);
      slotEndTime.setHours(endHours, endMinutes, 0, 0);
      
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
  const checkIfLateForTime = (slotName: string, checkInType: string, checkInTime: Date): { 
    isLate: boolean; 
    isEarly?: boolean; 
    minutesLate?: number; 
    minutesEarly?: number; 
    isValid?: boolean; 
    isInLateWindow?: boolean;
    isOnTime?: boolean;
  } => {
    if (!activity || !activity.timeSlots || activity.timeSlots.length === 0) {
      return { isLate: false, isValid: false };
    }

    const now = checkInTime;
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
    
    const slotStartTime = new Date(activityDate);
    slotStartTime.setHours(startHours, startMinutes, 0, 0);
    
    const slotEndTime = new Date(activityDate);
    slotEndTime.setHours(endHours, endMinutes, 0, 0);

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
    if (userLocation) {
      const locationCheck = checkLocationValidity(userLocation.lat, userLocation.lng);
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
          position.coords.longitude
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
          const locationCheck = checkLocationValidity(
            position.coords.latitude,
            position.coords.longitude
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

      // Prepare request body - ensure all required fields are present and valid
      const requestBody: {
        userId: string;
        checkedIn: boolean;
        location: { lat: number; lng: number; address?: string };
        photoUrl?: string | null;
        timeSlot?: string;
        checkInType?: string;
        checkInTime?: string; // ISO string format
        lateReason?: string | null;
      } = {
        userId: (user as any).userId || (user as any)._id,
        checkedIn: true,
        location: {
          lat: location.lat,
          lng: location.lng,
          ...(location.address ? { address: location.address } : {})
        },
        ...(photoUrl ? { photoUrl: photoUrl } : {}),
        ...(finalSlotName ? { timeSlot: finalSlotName } : {}),
        ...(finalCheckInType ? { checkInType: finalCheckInType } : {}),
        ...(checkInTime ? { checkInTime: checkInTime.toISOString() } : {}), // Send checkInTime (when photo was captured)
        ...(lateReasonValue ? { lateReason: lateReasonValue.trim() } : {})
      };

      // Call API to mark attendance
      const response = await fetch(`/api/activities/${activityId}/attendance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Đang tải...</p>
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
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-5 lg:px-6 xl:px-8 py-5 sm:py-6 lg:py-8">
        {/* Header - Compact Modern Design */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className={`mb-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isDarkMode 
                ? 'text-gray-300 hover:text-white hover:bg-gray-800/50 border border-gray-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Quay lại</span>
          </button>

          {/* Compact Header Card */}
          <div className={`relative overflow-hidden rounded-2xl ${
            isDarkMode 
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' 
              : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
          } shadow-xl`}>
            <div className="relative p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`p-2.5 rounded-xl ${
                      isDarkMode 
                        ? 'bg-gradient-to-br from-blue-600 to-purple-600' 
                        : 'bg-gradient-to-br from-blue-500 to-purple-500'
                  } shadow-md`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  <div className="flex-1 min-w-0">
                    <h1 className={`text-xl sm:text-2xl font-bold mb-1 truncate ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                      {activity.name}
                      </h1>
                    <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                      <div className={`flex items-center gap-1.5 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">{activity.date}</span>
                </div>
                      <div className={`flex items-center gap-1.5 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                        <span className="font-medium truncate">{activity.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Success/Error Messages - Compact Design */}
        {(successMessage || error) && !showSuccessModal && (
          <div className="mb-4">
            {successMessage && (
              <div className={`p-3 rounded-lg border shadow-sm ${isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                  }`}>
                    <span className="text-xs">✅</span>
                  </div>
                  <p className={`text-sm font-medium flex-1 ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                    {successMessage}
                  </p>
                  <button
                    onClick={() => setSuccessMessage(null)}
                    className={`w-5 h-5 rounded flex items-center justify-center text-xs transition-all ${
                      isDarkMode ? 'hover:bg-green-500/20 text-green-400' : 'hover:bg-green-100 text-green-600'
                    }`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className={`p-3 rounded-lg border shadow-sm ${isDarkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
                  }`}>
                    <span className="text-xs">⚠️</span>
                  </div>
                  <p className={`text-sm font-medium flex-1 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                    {error}
                  </p>
                  <button
                    onClick={() => setError(null)}
                    className={`w-5 h-5 rounded flex items-center justify-center text-xs transition-all ${
                      isDarkMode ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-600'
                    }`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* NEW DESIGN: Timeline Dashboard Layout */}
        <div className="space-y-6">
          {/* Dashboard Header - Glassmorphism Style */}
          <div className={`relative overflow-hidden rounded-3xl ${
            isDarkMode 
              ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-gray-700/50' 
              : 'bg-gradient-to-br from-white/80 to-blue-50/50 backdrop-blur-xl border border-gray-200/50'
          } shadow-2xl`}>
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
            
            <div className="relative p-6 sm:p-8 lg:p-10">
              {/* Header Info */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg flex items-center justify-center text-3xl`}>
                    📍
                  </div>
                  <div>
                    <h1 className={`text-2xl lg:text-3xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Điểm danh thông minh
                    </h1>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {formattedTime} • {formattedDate}
                    </p>
                  </div>
                </div>
                
                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className={`px-4 py-2 rounded-xl ${
                    isAllCompleted
                      ? isDarkMode ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-100 border border-green-200'
                      : isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-100 border border-gray-200'
                  }`}>
                    <span className={`text-sm font-bold ${
                      isAllCompleted
                        ? isDarkMode ? 'text-green-300' : 'text-green-700'
                        : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {isAllCompleted ? '✅ Đã điểm danh' : '⏸️ Chưa điểm danh'}
                    </span>
                  </div>
                  {locationStatus && (
                    <div className={`px-4 py-2 rounded-xl ${
                      locationStatus.valid
                        ? isDarkMode ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-100 border border-green-200'
                        : isDarkMode ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-100 border border-red-200'
                    }`}>
                      <span className={`text-sm font-bold ${
                        locationStatus.valid
                          ? isDarkMode ? 'text-green-300' : 'text-green-700'
                          : isDarkMode ? 'text-red-300' : 'text-red-700'
                      }`}>
                        {locationStatus.valid ? '✅ Vị trí hợp lệ' : '⚠️ Vị trí không hợp lệ'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline View - Main Content */}
          {activity.timeSlots && activity.timeSlots.length > 0 ? (
            <div className="space-y-4">
              {/* Timeline Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-0.5 flex-1 rounded-full ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}></div>
                <h2 className={`text-lg lg:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Lịch trình điểm danh
                </h2>
                <div className={`h-0.5 flex-1 rounded-full ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}></div>
              </div>

              {/* Summary Card - Tổng quan lịch trình điểm danh */}
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
                  <div className={`mb-6 p-4 rounded-xl border-2 ${
                    isCompleted
                      ? isDarkMode 
                        ? 'bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 border-green-500/40' 
                        : 'bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-green-300'
                      : isDarkMode 
                        ? 'bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-sky-500/20 border-blue-500/40' 
                        : 'bg-gradient-to-r from-blue-50 via-cyan-50 to-sky-50 border-blue-300'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isCompleted
                          ? isDarkMode ? 'bg-green-500/30' : 'bg-green-100'
                          : isDarkMode ? 'bg-blue-500/30' : 'bg-blue-100'
                      }`}>
                        <span className="text-2xl">
                          {isCompleted ? '✅' : '📊'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-sm font-semibold mb-1 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Tổng quan điểm danh
                        </h3>
                        <p className={`text-lg font-bold ${
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
                          <p className={`text-xs mt-1 ${
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

              {/* Timeline Cards - Optimized Size */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
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
                    
                    // Color scheme
                    const slotDesign = {
                      'Buổi Sáng': {
                        bg: isDarkMode ? 'bg-gradient-to-br from-yellow-900/30 via-orange-900/20 to-amber-900/30' : 'bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50',
                        border: isDarkMode ? 'border-yellow-500/40' : 'border-yellow-300',
                        icon: '🌅',
                        iconBg: 'from-yellow-400 to-orange-500',
                        text: isDarkMode ? 'text-yellow-200' : 'text-yellow-800',
                        accent: isDarkMode ? 'text-yellow-300' : 'text-yellow-600'
                      },
                      'Buổi Chiều': {
                        bg: isDarkMode ? 'bg-gradient-to-br from-blue-900/30 via-cyan-900/20 to-sky-900/30' : 'bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50',
                        border: isDarkMode ? 'border-blue-500/40' : 'border-blue-300',
                        icon: '☀️',
                        iconBg: 'from-blue-400 to-cyan-500',
                        text: isDarkMode ? 'text-blue-200' : 'text-blue-800',
                        accent: isDarkMode ? 'text-blue-300' : 'text-blue-600'
                      },
                      'Buổi Tối': {
                        bg: isDarkMode ? 'bg-gradient-to-br from-purple-900/30 via-indigo-900/20 to-violet-900/30' : 'bg-gradient-to-br from-purple-50 via-indigo-50 to-violet-50',
                        border: isDarkMode ? 'border-purple-500/40' : 'border-purple-300',
                        icon: '🌙',
                        iconBg: 'from-purple-400 to-indigo-500',
                        text: isDarkMode ? 'text-purple-200' : 'text-purple-800',
                        accent: isDarkMode ? 'text-purple-300' : 'text-purple-600'
                      }
                    };
                    
                    const design = slotDesign[slot.name as keyof typeof slotDesign] || slotDesign['Buổi Sáng'];
                    
                    return (
                      <div 
                        key={idx} 
                        className={`group relative overflow-hidden rounded-2xl border-2 backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-xl ${
                          design.bg
                        } ${design.border} ${
                          isDarkMode ? 'shadow-lg' : 'shadow-md'
                        }`}
                      >
                        {/* Animated Background Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br opacity-40 group-hover:opacity-60 transition-opacity duration-300"></div>
                        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-xl translate-y-1/2 -translate-x-1/2"></div>
                        
                        <div className="relative p-4 lg:p-5">
                          {/* Header Section */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${design.iconBg} shadow-lg flex items-center justify-center text-2xl transform group-hover:scale-105 transition-transform duration-300`}>
                                {design.icon}
                              </div>
                              <div className="flex-1">
                                <h3 className={`text-lg lg:text-xl font-bold mb-1.5 ${design.text}`}>
                                  {slot.name}
                                </h3>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <div className={`px-3 py-1.5 rounded-lg backdrop-blur-sm ${
                                    isDarkMode ? 'bg-black/20' : 'bg-white/60'
                                  }`}>
                                    <span className={`text-xs font-semibold ${design.accent}`}>
                                      🕐 {slot.startTime} - {slot.endTime}
                                    </span>
                                  </div>
                                  {isDuringSlot && (
                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                      isDarkMode ? 'bg-green-500/30 text-green-300' : 'bg-green-100 text-green-700'
                                    }`}>
                                      ⚡ Đang diễn ra
                                    </span>
                                  )}
                                  {isBeforeSlot && (
                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                      isDarkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      ⏰ Sắp tới
                                    </span>
                                  )}
                                  {isAfterSlot && (
                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                      isDarkMode ? 'bg-gray-700/50 text-gray-500' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                      ✅ Đã kết thúc
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Location Info - Compact Design */}
                          {(slotLocation || activity.locationData) && (
                            <div className={`mb-4 p-3 rounded-xl backdrop-blur-sm border ${
                              isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white/60 border-gray-200/50'
                            }`}>
                              <div className="flex items-start gap-2.5">
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${design.iconBg} flex items-center justify-center text-sm flex-shrink-0`}>
                                  📍
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-bold mb-0.5 ${design.accent}`}>
                                    Vị trí điểm danh
                                  </p>
                                  <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} truncate`}>
                                    {slotLocation?.location.address || 
                                     activity.locationData?.address || 
                                     (slotLocation ? `${slotLocation.location.lat.toFixed(4)}, ${slotLocation.location.lng.toFixed(4)}` : 
                                      activity.locationData ? `${activity.locationData.lat.toFixed(4)}, ${activity.locationData.lng.toFixed(4)}` : 
                                      'Chưa có thông tin')}
                                  </p>
                                  {(slotLocation?.radius || activity.locationData?.radius) && (
                                    <p className={`text-xs mt-0.5 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      📏 {(slotLocation?.radius || activity.locationData?.radius)}m
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Check-in Actions - Compact Design */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Start Check-in Button */}
                            {(() => {
                              const startWindow = getCheckInTimeWindow(slot, 'start');
                              return (
                                <div className={`p-3 rounded-xl backdrop-blur-sm border transition-all ${
                                  slotStatus.start
                                    ? isDarkMode ? 'bg-green-500/20 border-green-500/40' : 'bg-green-50 border-green-300'
                                    : isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white/60 border-gray-200/50'
                                }`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className={`text-xs font-bold ${design.accent}`}>
                                      🌅 Đầu buổi
                                    </span>
                                    {slotStatus.start && (
                                      <span className="text-base">✅</span>
                                    )}
                                  </div>
                                  {startWindow && (
                                    <div className="mb-2 space-y-1">
                                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        ⏰ Đúng giờ (tự duyệt): {startWindow.onTimeStart} - {startWindow.onTimeEnd}
                                      </p>
                                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                        ⏳ Trễ (cần duyệt): {startWindow.lateStart} - {startWindow.lateEnd}
                                      </p>
                                    </div>
                                  )}
                                  {slotStatus.start ? (
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      ✅ Đã điểm danh
                                    </p>
                                  ) : canCheckInStart ? (
                                    <button
                                      onClick={() => handleSlotCheckIn(slot.name, 'start')}
                                      disabled={isCheckingIn}
                                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition-all transform hover:scale-105 ${
                                        isDarkMode 
                                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-md' 
                                          : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-md'
                                      } ${isCheckingIn ? 'opacity-50' : ''}`}
                                    >
                                      {isCheckingIn ? '...' : '📸 Điểm danh'}
                                    </button>
                                  ) : (
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
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
                                <div className={`p-3 rounded-xl backdrop-blur-sm border transition-all ${
                                  slotStatus.end
                                    ? isDarkMode ? 'bg-green-500/20 border-green-500/40' : 'bg-green-50 border-green-300'
                                    : isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white/60 border-gray-200/50'
                                }`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className={`text-xs font-bold ${design.accent}`}>
                                      🌙 Cuối buổi
                                    </span>
                                    {slotStatus.end && (
                                      <span className="text-base">✅</span>
                                    )}
                                  </div>
                                  {endWindow && (
                                    <div className="mb-2 space-y-1">
                                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        ⏰ Đúng giờ (tự duyệt): {endWindow.onTimeStart} - {endWindow.onTimeEnd}
                                      </p>
                                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                        ⏳ Trễ (cần duyệt): {endWindow.lateStart} - {endWindow.lateEnd}
                                      </p>
                                    </div>
                                  )}
                                  {slotStatus.end ? (
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      ✅ Đã điểm danh
                                    </p>
                                  ) : canCheckInEnd ? (
                                    <button
                                      onClick={() => handleSlotCheckIn(slot.name, 'end')}
                                      disabled={isCheckingIn}
                                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition-all transform hover:scale-105 ${
                                        isDarkMode 
                                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-md' 
                                          : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-md'
                                      } ${isCheckingIn ? 'opacity-50' : ''}`}
                                    >
                                      {isCheckingIn ? '...' : '📸 Điểm danh'}
                                    </button>
                                  ) : (
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
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
                              <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${design.iconBg} flex items-center justify-center text-xs`}>
                                📸
                              </div>
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
                                          <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                            🌅 Đầu buổi
                                          </p>
                                          {(() => {
                                            const startWindow = getCheckInTimeWindow(slot, 'start');
                                            return startWindow ? (
                                              <div className="mt-0.5 space-y-0.5">
                                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                  ⏰ Đúng giờ: {startWindow.onTimeStart} - {startWindow.onTimeEnd}
                                                </p>
                                                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                                  ⏳ Trễ: {startWindow.lateStart} - {startWindow.lateEnd}
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
                                              {startRecord.status !== 'rejected' && (
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs shadow-sm transition-all duration-200 ${
                                                  startRecord.status === 'approved'
                                                    ? isDarkMode 
                                                      ? 'bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 text-green-300 border border-green-500/40 backdrop-blur-sm' 
                                                      : 'bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 text-green-700 border border-green-300/60 backdrop-blur-sm'
                                                    : isDarkMode 
                                                      ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-sm' 
                                                      : 'bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 text-amber-700 border border-amber-300/60 backdrop-blur-sm'
                                                }`}>
                                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                                    startRecord.status === 'approved'
                                                      ? isDarkMode ? 'bg-green-500/30' : 'bg-green-200'
                                                      : isDarkMode ? 'bg-amber-500/30' : 'bg-amber-200'
                                                  }`}>
                                                    <span className="text-xs">
                                                      {startRecord.status === 'approved' ? '✅' : '⏳'}
                                                    </span>
                                                  </div>
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
                                            ⏰ {new Date(startRecord.checkInTime).toLocaleString('vi-VN', { 
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
                                          isDarkMode ? 'bg-red-500/10 border-red-500' : 'bg-red-50 border-red-500'
                                        }`}>
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-sm">⚠️</span>
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
                                            isDarkMode ? 'bg-amber-500/10 border-amber-500' : 'bg-amber-50 border-amber-500'
                                          }`}>
                                            <p className={`font-medium mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                                              ⏰ Lý do trễ:
                                            </p>
                                            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                              {startRecord.lateReason}
                                            </p>
                                          </div>
                                        )}
                                        {startRecord.verificationNote && startRecord.status === 'approved' && (
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
                                              {startRecord.verificationNote}
                                            </p>
                                            {startRecord.verifiedBy && (
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
                                                    {getVerifierName(startRecord.verifiedBy)}
                                                  </span>
                                                </div>
                                                {startRecord.verifiedAt && (
                                                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                                                    isDarkMode ? 'bg-gray-700/50' : 'bg-white/80'
                                                  }`}>
                                                    <svg className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
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
                                              className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 ${
                                                isDarkMode 
                                                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600' 
                                                  : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
                                              } ${isCheckingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                              {isCheckingIn ? '⏳ Đang xử lý...' : '📸 Chụp lại'}
                                            </button>
                                            <button
                                              onClick={() => handleDeleteAttendance(slot.name, 'start')}
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
                                  // Chưa điểm danh đầu buổi
                                  <div className={`space-y-2 p-3 rounded-xl border ${
                                    isDarkMode 
                                      ? 'bg-gray-800/50 border-gray-700' 
                                      : 'bg-white/80 backdrop-blur-sm border-gray-200'
                                  }`}>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex-1">
                                        <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                          🌅 Đầu buổi
                                        </p>
                                        {(() => {
                                          const startWindow = getCheckInTimeWindow(slot, 'start');
                                          return startWindow ? (
                                            <div className="mt-0.5 space-y-0.5">
                                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                ⏰ Đúng giờ: {startWindow.onTimeStart} - {startWindow.onTimeEnd}
                                              </p>
                                              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                                ⏳ Trễ: {startWindow.lateStart} - {startWindow.lateEnd}
                                              </p>
                                            </div>
                                          ) : null;
                                        })()}
                                      </div>
                                    </div>
                                    
                                    {/* Status Badge - Chưa điểm danh */}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs shadow-sm transition-all duration-200 ${
                                        isDarkMode 
                                          ? 'bg-gradient-to-r from-gray-500/20 via-gray-600/20 to-gray-700/20 text-gray-300 border border-gray-500/40 backdrop-blur-sm' 
                                          : 'bg-gradient-to-r from-gray-50 via-gray-100 to-gray-200 text-gray-700 border border-gray-300/60 backdrop-blur-sm'
                                      }`}>
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                          isDarkMode ? 'bg-gray-500/30' : 'bg-gray-200'
                                        }`}>
                                          <span className="text-xs">⏸️</span>
                                        </div>
                                        <span className="font-bold">Chưa điểm danh</span>
                                      </div>
                                    </div>
                                    
                                    {/* Empty photo placeholder */}
                                    <div className={`w-full h-32 rounded-xl border-2 flex items-center justify-center ${
                                      isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-100 border-gray-300'
                                    }`}>
                                      <div className="text-center">
                                        <p className={`text-2xl mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>📷</p>
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
                                                    {getVerifierName(endRecord.verifiedBy)}
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
                                    
                                    {/* Status Badge - Chưa điểm danh */}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs shadow-sm transition-all duration-200 ${
                                        isDarkMode 
                                          ? 'bg-gradient-to-r from-gray-500/20 via-gray-600/20 to-gray-700/20 text-gray-300 border border-gray-500/40 backdrop-blur-sm' 
                                          : 'bg-gradient-to-r from-gray-50 via-gray-100 to-gray-200 text-gray-700 border border-gray-300/60 backdrop-blur-sm'
                                      }`}>
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                          isDarkMode ? 'bg-gray-500/30' : 'bg-gray-200'
                                        }`}>
                                          <span className="text-xs">⏸️</span>
                                        </div>
                                        <span className="font-bold">Chưa điểm danh</span>
                                      </div>
                                    </div>
                                    
                                    {/* Empty photo placeholder */}
                                    <div className={`w-full h-32 rounded-xl border-2 flex items-center justify-center ${
                                      isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-100 border-gray-300'
                                    }`}>
                                      <div className="text-center">
                                        <p className={`text-2xl mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>📷</p>
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
                            <div className={`mt-4 pt-4 border-t border-dashed`} style={{
                              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                            }}>
                              {isBeforeSlot && (
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                                  isDarkMode 
                                    ? 'bg-gray-700/50 border border-gray-600' 
                                    : 'bg-gray-100 border border-gray-300'
                                }`}>
                                  <span className="text-base">⏰</span>
                                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Chưa đến thời gian buổi này
                                  </p>
                                </div>
                              )}
                              {isAfterSlot && (
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                                  isDarkMode 
                                    ? 'bg-gray-700/50 border border-gray-600' 
                                    : 'bg-gray-100 border border-gray-300'
                                }`}>
                                  <span className="text-base">✅</span>
                                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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
            <div className={`text-center py-12 rounded-2xl ${
              isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'
            }`}>
              <p className={`text-4xl mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>📅</p>
              <p className={`text-base font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Không có buổi nào được lên lịch
              </p>
            </div>
          )}
          
          {/* Map Section - Full Width Below Timeline */}
          {((activity.locationData || (activity.multiTimeLocations && activity.multiTimeLocations.length > 0)) || userLocation) && !showCamera && (
            <div className="mt-6">
            {/* Interactive Map - Simplified Design */}
            <div className={`rounded-2xl lg:rounded-3xl overflow-hidden ${
              isDarkMode 
                ? 'bg-gray-800/90 border border-gray-700' 
                : 'bg-white border border-gray-200'
            } shadow-xl lg:shadow-2xl`}>
                {/* Map Header - Compact */}
                <div className={`p-4 sm:p-5 border-b ${
                  isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                      }`}>
                        <span className="text-xl">🗺️</span>
                      </div>
                      <div>
                        <h3 className={`text-base lg:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Bản đồ tương tác
                        </h3>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Xem vị trí trên bản đồ
                        </p>
                      </div>
                    </div>
                    {locationStatus && (
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        locationStatus.valid
                          ? isDarkMode 
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                            : 'bg-green-100 text-green-700 border border-green-200'
                          : isDarkMode 
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                            : 'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {locationStatus.valid ? '✅' : '⚠️'}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="relative overflow-hidden" style={{ height: '400px' }}>
                  <MapContainer
                    center={mapCenter}
                    zoom={13}
                    style={{ height: '100%', width: '100%', zIndex: 1 }}
                    zoomControl={true}
                    doubleClickZoom={false}
                    dragging={true}
                    scrollWheelZoom={true}
                    key={`map-${mapCenter[0]}-${mapCenter[1]}`}
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
                      
                      // Add activity locations to bounds
                      if (activity.locationData) {
                        bounds.push([activity.locationData.lat, activity.locationData.lng]);
                      }
                      if (activity.multiTimeLocations) {
                        activity.multiTimeLocations.forEach(mtl => {
                          bounds.push([mtl.location.lat, mtl.location.lng]);
                        });
                      }
                      
                      // Add user location to bounds
                      if (userLocation) {
                        bounds.push([userLocation.lat, userLocation.lng]);
                      }
                      
                      return bounds.length > 0 ? <FitBounds bounds={bounds} /> : null;
                    })()}

                    {/* Activity Location Marker - Larger and more visible */}
                    {activity.locationData && (
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
                    {userLocation && (
                      <>
                        <Marker 
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
                        {activity?.locationData && 
                         typeof activity.locationData.lat === 'number' && 
                         typeof activity.locationData.lng === 'number' &&
                         !isNaN(activity.locationData.lat) &&
                         !isNaN(activity.locationData.lng) && (
                          <Polyline
                            key={`polyline-${userLocation.lat}-${userLocation.lng}-${activity.locationData.lat}-${activity.locationData.lng}`}
                            positions={[
                              [userLocation.lat, userLocation.lng],
                              [activity.locationData.lat, activity.locationData.lng]
                            ]}
                            pathOptions={{
                              color: locationStatus?.valid ? '#10b981' : '#ef4444',
                              weight: 3,
                              opacity: 0.6,
                              dashArray: '10, 5'
                            }}
                          />
                        )}
                      </>
                    )}
                  </MapContainer>
                </div>
                
                {/* Legend - Compact Design */}
                <div className={`p-3 sm:p-4 border-t ${
                  isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    {/* User Location Status */}
                    {userLocation && locationStatus && (
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          locationStatus.valid 
                            ? 'bg-gradient-to-br from-green-500 to-green-600' 
                            : 'bg-gradient-to-br from-red-500 to-red-600'
                        }`}>
                          👤
                        </div>
                        <div>
                          <span className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Vị trí của bạn
                          </span>
                          {locationStatus.distance !== undefined && (
                            <p className={`text-xs font-medium ${
                              locationStatus.valid 
                                ? isDarkMode ? 'text-green-400' : 'text-green-600'
                                : isDarkMode ? 'text-red-400' : 'text-red-600'
                            }`}>
                              {locationStatus.valid ? '✅' : '⚠️'} {locationStatus.distance.toFixed(0)}m
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
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
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
                        
                        // Check if late or early before proceeding (using photo capture time)
                        if (pendingCheckIn?.slotName && pendingCheckIn?.checkInType && photoCheckInTime) {
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
                        proceedWithCheckIn(capturedPhoto, pendingCheckIn?.slotName, pendingCheckIn?.checkInType);
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
