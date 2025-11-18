'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, MapPin, AlertCircle, CheckCircle, XCircle, Ruler, Lightbulb, Info, X, ZoomIn, Maximize2, Move, MousePointer2 } from 'lucide-react';

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

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface LocationData {
  lat: number;
  lng: number;
  address: string;
  radius: number;
}

interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  activities: string;
  detailedLocation: string;
}

interface OpenStreetMapPickerProps {
  onLocationChange: (location: LocationData) => void;
  initialLocation?: LocationData;
  isDarkMode?: boolean;
  activeTimeSlots?: TimeSlot[];
  isReadOnly?: boolean;
  enforceActiveTimeSlots?: boolean;
  locationContext?: 'global' | 'perDay' | 'perSlot';
  dayLabel?: string; // Label cho PerDay mode (ví dụ: "Thứ 2")
  slotLabel?: string; // Label cho PerSlot mode (ví dụ: "Buổi Sáng")
}

export default function OpenStreetMapPicker({
  onLocationChange,
  initialLocation,
  isDarkMode = false,
  activeTimeSlots = [],
  isReadOnly = false,
  enforceActiveTimeSlots = true,
  locationContext = 'global',
  dayLabel,
  slotLabel
}: OpenStreetMapPickerProps) {
  const [tempLocation, setTempLocation] = useState<LocationData | null>(null);
  const [showLocationConfirm, setShowLocationConfirm] = useState(false);
  const [radius, setRadius] = useState(200);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(16);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapHeight, setMapHeight] = useState(400); // Default height in pixels
  const [isResizing, setIsResizing] = useState(false);
  const [showTimeSlotWarning, setShowTimeSlotWarning] = useState(false);
  const mapRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Default center (TDMU coordinates)
  const defaultCenter: [number, number] = [10.7325, 106.6992];
  
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(initialLocation ? { ...initialLocation, radius: (initialLocation.radius && !isNaN(initialLocation.radius)) ? initialLocation.radius : 200 } : null);

  // Effect để thiết lập selectedLocation và zoom bản đồ khi initialLocation thay đổi hoặc component mount
  // Đây là ưu tiên chính, nếu có initialLocation thì sẽ dùng nó
  useEffect(() => {
    if (initialLocation) {
      setSelectedLocation(initialLocation);
      setSearchQuery(initialLocation.address); // Cập nhật searchQuery khi có initialLocation
      if (mapRef.current) {
        mapRef.current.setView([initialLocation.lat, initialLocation.lng], 16, {
          animate: true,
          duration: 1.5
        });
      }
    } else {
      // Nếu không có initialLocation, thử lấy vị trí hiện tại
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            console.log('📍 Current location obtained (fallback):', latitude, longitude);
            if (mapRef.current) {
              mapRef.current.setView([latitude, longitude], 16, {
                animate: true,
                duration: 1.5
              });
            }
            // Cập nhật defaultCenter để sử dụng cho các lần sau nếu không có initialLocation
            defaultCenter[0] = latitude;
            defaultCenter[1] = longitude;
          },
          (error) => {
            console.log('📍 Could not get current location (fallback):', error.message);
            // Giữ nguyên defaultCenter (TDMU) nếu không lấy được vị trí hiện tại
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      }
    }
  }, [initialLocation]); // Chạy lại khi initialLocation thay đổi (để ưu tiên nó)

  // Effect để cập nhật searchQuery khi selectedLocation thay đổi
  useEffect(() => {
    if (selectedLocation && selectedLocation.address) {
      setSearchQuery(selectedLocation.address);
    }
  }, [selectedLocation]);

  // Get current location when component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('📍 Current location obtained:', latitude, longitude);
          
          // Update map center to current location CHỈ KHI KHÔNG CÓ initialLocation
          if (mapRef.current && !initialLocation) {
            mapRef.current.setView([latitude, longitude], 16, {
              animate: true,
              duration: 1.5
            });
          }
          
          // Update default center for future use
          defaultCenter[0] = latitude;
          defaultCenter[1] = longitude;
        },
        (error) => {
          console.log('📍 Could not get current location:', error.message);
          // Keep using TDMU coordinates as fallback
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    }
  }, [initialLocation]); // Thêm initialLocation vào dependency array để đảm bảo nó không ghi đè vị trí ban đầu

  // Effect to monitor activeTimeSlots changes and clear location if no active slots
  // Skip this check if isReadOnly (for viewing existing locations)
  useEffect(() => {
    if (!enforceActiveTimeSlots) {
      return;
    }
    // Nếu là read-only mode, không cần kiểm tra activeTimeSlots
    if (isReadOnly && initialLocation) {
      return;
    }
    
    console.log('🔄 OpenStreetMapPicker: activeTimeSlots changed:', activeTimeSlots);
    console.log('🔍 DEBUG: activeTimeSlots.length =', activeTimeSlots?.length);
    console.log('🔍 DEBUG: activeTimeSlots.some(slot => slot.isActive) =', activeTimeSlots?.some(slot => slot.isActive));
    
    const hasActiveTimeSlots = activeTimeSlots && 
                              activeTimeSlots.length > 0 && 
                              activeTimeSlots.some(slot => slot.isActive);
    
    if (!hasActiveTimeSlots && selectedLocation) {
      console.log('⚠️ No active time slots detected - CLEARING SELECTED LOCATION');
      setSelectedLocation(null);
      setTempLocation(null);
      setShowLocationConfirm(false);
      setSearchQuery('');
      onLocationChange({
        lat: 0,
        lng: 0,
        address: '',
        radius: 200
      });
    }
  }, [activeTimeSlots, selectedLocation, onLocationChange, isReadOnly, initialLocation, enforceActiveTimeSlots]);

  // Helper function to safely format coordinates
  const formatCoordinates = (lat: any, lng: any): string => {
    try {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      
      if (isNaN(latNum) || isNaN(lngNum)) {
        return 'Invalid coordinates';
      }
      
      return `${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`;
    } catch (error) {
      console.error('Error formatting coordinates:', error);
      return 'Invalid coordinates';
    }
  };

  useEffect(() => {
    // Fix Leaflet icon issue
    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    }

    // Prevent page zoom when Ctrl+wheel is used on map
    const preventPageZoom = (e: WheelEvent) => {
      if (e.ctrlKey && mapContainerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    document.addEventListener('wheel', preventPageZoom, { passive: false });

    return () => {
      document.removeEventListener('wheel', preventPageZoom);
    };
  }, []);

  // Handle single click to select location
  const handleMapClick = async (e: any) => {
    if (isReadOnly) {
      console.log('ℹ️ Map is in read-only mode, ignoring click.');
      return;
    }
    console.log('🎯 Single click detected!', e);
    console.log('🎯 Event type:', e.type);
    console.log('🎯 Event latlng:', e.latlng);
    console.log('🔍 DEBUG: activeTimeSlots =', activeTimeSlots);
    console.log('🔍 DEBUG: activeTimeSlots.length =', activeTimeSlots?.length);
    console.log('🔍 DEBUG: activeTimeSlots.some(slot => slot.isActive) =', activeTimeSlots?.some(slot => slot.isActive));
    
    if (!e.latlng) {
      console.error('❌ No latlng in event:', e);
      return;
    }
    
    const { lat, lng } = e.latlng;
    
    // Skip time slot check if read-only mode
    if (!isReadOnly && enforceActiveTimeSlots) {
      // Check if any time slots are active - IMPROVED CHECK for TimeSlot[]
      const hasActiveTimeSlots = activeTimeSlots && 
                                activeTimeSlots.length > 0 && 
                                activeTimeSlots.some(slot => slot.isActive);
      
      console.log('🔍 DEBUG: hasActiveTimeSlots =', hasActiveTimeSlots);
      
      if (!hasActiveTimeSlots) {
        console.log('⚠️ No active time slots selected - BLOCKING LOCATION SELECTION');
        console.log('⚠️ activeTimeSlots:', activeTimeSlots);
        console.log('⚠️ activeTimeSlots.length:', activeTimeSlots?.length);
        console.log('⚠️ activeTimeSlots.some(slot => slot.isActive):', activeTimeSlots?.some(slot => slot.isActive));
        if (!showTimeSlotWarning) {
          setShowTimeSlotWarning(true);
          setTimeout(() => setShowTimeSlotWarning(false), 5000); // Hide warning after 5 seconds
        }
        return;
      }
    }
    
    // Prevent multiple rapid clicks
    if (isLoading) {
      console.log('⏳ Already loading, ignoring click');
      return;
    }
    
    console.log('🔄 Starting single-click location selection...');
    setIsLoading(true);
    
    try {
      // Show immediate feedback
      const tempLocation: LocationData = {
        lat,
        lng,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        radius
      };
      
      console.log('📍 Setting temporary location:', tempLocation);
      setSelectedLocation(tempLocation);
      onLocationChange(tempLocation);
      setSearchQuery(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      
      // Try to get the full address
      console.log('🌐 Fetching address from coordinates...');
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        
        const newLocation: LocationData = {
          lat,
          lng,
          address,
          radius
        };
        
        console.log('✅ Got full address:', address);
        setTempLocation(newLocation);
        setSearchQuery(address); // Cập nhật searchQuery với địa chỉ đầy đủ
        setShowLocationConfirm(true);
      } else {
        throw new Error('Failed to get address');
      }
    } catch (error) {
      console.error('❌ Error getting address:', error);
      // Keep the temporary location if address lookup fails
      const newLocation: LocationData = {
        lat,
        lng,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        radius
      };
      setTempLocation(newLocation);
      setShowLocationConfirm(true);
    } finally {
      setIsLoading(false);
      console.log('✅ Location confirmation dialog shown');
    }
  };

  // Handle location confirmation
  const handleConfirmLocation = () => {
    console.log('🔍 handleConfirmLocation called');
    console.log('🔍 DEBUG: activeTimeSlots =', activeTimeSlots);
    console.log('🔍 DEBUG: activeTimeSlots.length =', activeTimeSlots?.length);
    console.log('🔍 DEBUG: activeTimeSlots.some(slot => slot.isActive) =', activeTimeSlots?.some(slot => slot.isActive));
    
    // Double-check that we have active time slots before confirming (skip if read-only)
    if (!isReadOnly && enforceActiveTimeSlots) {
      const hasActiveTimeSlots = activeTimeSlots && 
                                activeTimeSlots.length > 0 && 
                                activeTimeSlots.some(slot => slot.isActive);
      
      if (!hasActiveTimeSlots) {
        console.log('⚠️ No active time slots - CANNOT CONFIRM LOCATION');
        if (!showTimeSlotWarning) {
          setShowTimeSlotWarning(true);
          setTimeout(() => setShowTimeSlotWarning(false), 5000);
        }
        return;
      }
    }
    
    if (tempLocation) {
      setSelectedLocation(tempLocation);
      onLocationChange(tempLocation);
      setSearchQuery(tempLocation.address);
      setShowLocationConfirm(false);
      setTempLocation(null);
      
      console.log('✅ Đã chọn địa điểm:', tempLocation.address);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    }
  };

  // Handle location cancellation
  const handleCancelLocation = () => {
    setShowLocationConfirm(false);
    setTempLocation(null);
    console.log('❌ Đã hủy chọn địa điểm');
  };

  // Handle zoom end
  const handleZoomEnd = () => {
    if (mapRef.current) {
      setCurrentZoom(mapRef.current.getZoom());
    }
  };

  // Attach map event listeners when map is ready
  useEffect(() => {
    if (mapRef.current && isMapReady) {
      const map = mapRef.current;
      
      const handleClick = (e: any) => {
        console.log('🎯 Single click event triggered (useEffect)!', e);
        if (!isLoading) {
          handleMapClick(e);
        }
      };

      const handleSingleClick = (e: any) => {
        console.log('🖱️ Single click detected (useEffect)!', e.latlng);
      };

      const handleZoomEndEvent = () => {
        handleZoomEnd();
      };

      // Add event listeners
      map.on('click', handleClick);
      map.on('zoomend', handleZoomEndEvent);
      
      console.log('✅ Map event listeners attached');
      
      return () => {
        map.off('click', handleClick);
        map.off('zoomend', handleZoomEndEvent);
        console.log('🔄 Map event listeners removed');
      };
    }
  }, [isLoading, isMapReady]); // Only re-attach when loading state changes or map is ready

  const searchAddress = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=vn&viewbox=102.0,8.0,110.0,23.0&bounded=1`
      );
      
      if (!response.ok) {
        throw new Error('Search request failed');
      }
      
      const data = await response.json();
      
      // Validate and filter results
      const validResults = data.filter((result: any) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        return !isNaN(lat) && !isNaN(lng) && result.display_name;
      });
      
      setSearchResults(validResults);
      setShowSearchResults(true);
      
      console.log('🔍 Tìm thấy', validResults.length, 'kết quả hợp lệ cho:', query);
    } catch (error) {
      console.error('Error searching address:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(query);
    }, 500);
  };

  const handleSearchResultSelect = (result: any) => {
    console.log('🔍 Search result selected:', result);
    console.log('🔍 DEBUG: activeTimeSlots =', activeTimeSlots);
    console.log('🔍 DEBUG: activeTimeSlots.length =', activeTimeSlots?.length);
    console.log('🔍 DEBUG: activeTimeSlots.some(slot => slot.isActive) =', activeTimeSlots?.some(slot => slot.isActive));
    
    // Skip time slot check if read-only mode
    if (!isReadOnly && enforceActiveTimeSlots) {
      // Check if any time slots are active - IMPROVED CHECK for TimeSlot[]
      const hasActiveTimeSlots = activeTimeSlots && 
                                activeTimeSlots.length > 0 && 
                                activeTimeSlots.some(slot => slot.isActive);
      
      console.log('🔍 DEBUG: hasActiveTimeSlots =', hasActiveTimeSlots);
      
      if (!hasActiveTimeSlots) {
        console.log('⚠️ No active time slots selected - BLOCKING SEARCH RESULT SELECTION');
        console.log('⚠️ activeTimeSlots:', activeTimeSlots);
        console.log('⚠️ activeTimeSlots.length:', activeTimeSlots?.length);
        console.log('⚠️ activeTimeSlots.some(slot => slot.isActive):', activeTimeSlots?.some(slot => slot.isActive));
        if (!showTimeSlotWarning) {
          setShowTimeSlotWarning(true);
          setTimeout(() => setShowTimeSlotWarning(false), 5000); // Hide warning after 5 seconds
        }
        return;
      }
    }
    
    // Safely parse coordinates
    const lat = parseFloat(result.lat) || 0;
    const lng = parseFloat(result.lon) || 0;
    const address = result.display_name || 'Unknown location';
    
    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      console.error('Invalid coordinates:', result);
      return;
    }
    
    const newLocation: LocationData = {
      lat,
      lng,
      address,
      radius
    };
    
    setSelectedLocation(newLocation);
    onLocationChange(newLocation);
    setSearchQuery(address);
    setShowSearchResults(false);
    
    // Pan map to the selected location with appropriate zoom level
    if (mapRef.current) {
      const map = mapRef.current;
      
      // Determine appropriate zoom level based on address type
      let zoomLevel = 16; // Default zoom
      
      // Adjust zoom based on address details
      if (result.address) {
        const address = result.address;
        if (address.house_number || address.building) {
          zoomLevel = 18; // Very close for specific buildings
        } else if (address.street) {
          zoomLevel = 17; // Street level
        } else if (address.city || address.town) {
          zoomLevel = 14; // City level
        } else if (address.state || address.county) {
          zoomLevel = 10; // State/County level
        } else if (address.country) {
          zoomLevel = 6; // Country level
        }
      }
      
      // Ensure zoom level is within bounds
      zoomLevel = Math.max(6, Math.min(18, zoomLevel));
      
      map.setView([lat, lng], zoomLevel, {
        animate: true,
        duration: 1.5
      });
      
      // Update current zoom state
      setCurrentZoom(zoomLevel);
    }
    
    // Show success message
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
    
    console.log('✅ Đã chọn địa điểm từ tìm kiếm:', address);
  };

  const handleRadiusChange = (newRadiusValue: number) => {
    const safeNewRadius = isNaN(newRadiusValue) ? 200 : newRadiusValue;
    setRadius(safeNewRadius);
    if (selectedLocation) {
      const updatedLocation = { ...selectedLocation, radius: safeNewRadius };
      setSelectedLocation(updatedLocation);
      onLocationChange(updatedLocation);
    }
  };

  // Handle circle drag start
  const handleCircleDragStart = () => {
    setIsDragging(true);
  };

  // Handle circle drag end
  const handleCircleDragEnd = (e: any) => {
    setIsDragging(false);
    const lat = e.target.getLatLng().lat;
    const lng = e.target.getLatLng().lng;
    
    // Get address for new location
    getAddressFromCoordinates(lat, lng);
  };

  // Get address from coordinates
  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      
      const newLocation: LocationData = {
        lat,
        lng,
        address,
        radius
      };
      
      setSelectedLocation(newLocation);
      onLocationChange(newLocation);
      setSearchQuery(address);
    } catch (error) {
      console.error('Error getting address:', error);
      const newLocation: LocationData = {
        lat,
        lng,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        radius
      };
      setSelectedLocation(newLocation);
      onLocationChange(newLocation);
      setSearchQuery(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  };

  // Center map on initialLocation if available, otherwise use selectedLocation, otherwise defaultCenter
  const center: [number, number] = initialLocation 
    ? [initialLocation.lat, initialLocation.lng]
    : selectedLocation 
      ? [selectedLocation.lat, selectedLocation.lng] 
      : defaultCenter;

  // Handle mouse wheel zoom with Ctrl key
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey && mapRef.current) {
      e.preventDefault();
      e.stopPropagation();
      const map = mapRef.current;
      const delta = e.deltaY > 0 ? -1 : 1;
      const zoom = map.getZoom();
      const newZoom = Math.max(1, Math.min(18, zoom + delta));
      map.setZoom(newZoom);
      setCurrentZoom(newZoom);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mapRef.current) {
      const map = mapRef.current;
      const zoom = map.getZoom();
      
      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault();
          e.stopPropagation();
          const newZoomIn = Math.min(18, zoom + 1);
          map.setZoom(newZoomIn);
          setCurrentZoom(newZoomIn);
          break;
        case '-':
          e.preventDefault();
          e.stopPropagation();
          const newZoomOut = Math.max(1, zoom - 1);
          map.setZoom(newZoomOut);
          setCurrentZoom(newZoomOut);
          break;
        case '0':
          e.preventDefault();
          e.stopPropagation();
          map.setZoom(16);
          setCurrentZoom(16);
          break;
      }
    }
  };

  // Handle resize functionality
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    document.body.style.cursor = 'nw-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || !mapContainerRef.current) return;
    
    const containerRect = mapContainerRef.current.getBoundingClientRect();
    const newHeight = e.clientY - containerRect.top;
    
    // Limit height between 200px and 600px
    const clampedHeight = Math.max(200, Math.min(600, newHeight));
    setMapHeight(clampedHeight);
    
    // Force map to update its size
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 10);
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  // Add resize event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing]);

  return (
    <div className="w-full space-y-6">
      {!isReadOnly && (
        <div className={`relative overflow-hidden rounded-2xl ${
          isDarkMode 
            ? 'bg-gradient-to-br from-gray-800/90 to-gray-900/90 border border-gray-700/50'
            : 'bg-gradient-to-br from-white/90 to-gray-50/90 border border-gray-200/50'
        } backdrop-blur-xl shadow-xl`}>
          {/* Search Header */}
          <div className="p-2.5 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}>
                <Search size={16} className="text-blue-500" />
              </div>
              <div>
                <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Tìm kiếm địa chỉ
                </h3>
                <p className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Tìm kiếm địa điểm tại Việt Nam
                </p>
                {enforceActiveTimeSlots && (!activeTimeSlots || activeTimeSlots.length === 0 || !activeTimeSlots.some(slot => slot.isActive)) && (
                  <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    <AlertCircle size={12} /> Vui lòng chọn buổi trước khi chọn địa điểm
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Search Input */}
          <div className="p-2.5">
            <div className="relative">
              <div className={`absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Nhập tên địa chỉ, đường phố, quận huyện, thành phố..."
                className={`w-full pl-9 pr-9 py-2 rounded-lg border text-sm transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    : 'bg-white/80 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'
                } focus:outline-none backdrop-blur-sm`}
              />
              {isSearching && (
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Search Results */}
            {showSearchResults && searchResults.length > 0 && (
              <div className={`mt-1.5 border rounded-lg max-h-40 overflow-y-auto ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}>
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchResultSelect(result)}
                    className={`w-full text-left px-2 py-1.5 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                      isDarkMode 
                        ? 'text-gray-300 hover:bg-gray-600 hover:text-blue-400'
                        : 'text-gray-700'
                    } ${index !== searchResults.length - 1 ? 'border-b border-gray-200 dark:border-gray-600' : ''}`}
                  >
                    <div className="flex items-start space-x-1.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                      }`}>
                        <MapPin size={12} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{result.display_name}</div>
                        <div className={`text-[10px] ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {formatCoordinates(result.lat, result.lon)}
                        </div>
                        {result.address && (
                          <div className={`text-[10px] mt-0.5 ${
                            isDarkMode ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            {result.address.city || result.address.town || result.address.state || result.address.country || 'Việt Nam'}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* No Results Message */}
            {showSearchResults && searchResults.length === 0 && searchQuery.trim() && !isSearching && (
              <div className={`mt-1.5 p-2 text-center rounded-lg ${
                isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className={`text-xs flex flex-col items-center ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <Search size={16} className="mb-0.5" />
                  Không tìm thấy địa điểm nào
                </div>
                <div className={`text-[10px] ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Thử tìm kiếm với từ khóa khác hoặc click trên bản đồ
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Time Slot Warning - Only show if not read-only and enforceActiveTimeSlots is true */}
      {showTimeSlotWarning && !isReadOnly && enforceActiveTimeSlots && (
        <div className="w-full mb-4">
          <div className={`p-4 rounded-xl shadow-xl max-w-md mx-auto animate-pulse ${
            isDarkMode ? 'bg-yellow-900/20 border border-yellow-500/30' : 'bg-yellow-50/80 border border-yellow-200/50'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-100'
              }`}>
                <AlertCircle size={20} className={isDarkMode ? 'text-yellow-400' : 'text-yellow-600'} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${
                  isDarkMode ? 'text-yellow-400' : 'text-yellow-700'
                }`}>
                  Vui lòng chọn buổi trước khi chọn địa điểm
                </p>
                <p className={`text-xs ${
                  isDarkMode ? 'text-yellow-300' : 'text-yellow-600'
                }`}>
                  Bạn cần bật ít nhất một buổi (Sáng/Chiều/Tối) trong phần "3. Các buổi"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Confirmation */}
      {showLocationConfirm && tempLocation && (
        <div className="w-full mb-4">
          <div className={`p-4 rounded-xl shadow-xl max-w-md mx-auto ${isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'}`}>
            <div className="text-center mb-3">
              <div className="mb-2 flex justify-center">
                <MapPin size={32} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
              </div>
              <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Xác nhận địa điểm
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {locationContext === 'perDay' 
                  ? `Địa điểm cho ${dayLabel || 'ngày này'}`
                  : locationContext === 'perSlot'
                  ? `Địa điểm cho ${slotLabel || 'buổi này'}`
                  : 'Địa điểm chung cho tất cả các buổi'}
              </p>
            </div>
            
            <div className={`p-3 rounded-lg mb-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {tempLocation.address}
              </p>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {tempLocation.lat.toFixed(6)}, {tempLocation.lng.toFixed(6)}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleConfirmLocation}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} /> Chọn
              </button>
              <button
                onClick={handleCancelLocation}
                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle size={18} /> Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="w-full mb-4">
          <div className="bg-green-500 text-white px-6 py-4 rounded-xl shadow-xl max-w-md mx-auto animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle size={20} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-lg">Đã chọn địa điểm thành công!</div>
                <div className="text-sm opacity-90">
                  {locationContext === 'perDay' 
                    ? `Địa điểm cho ${dayLabel || 'ngày này'}`
                    : locationContext === 'perSlot'
                    ? `Địa điểm cho ${slotLabel || 'buổi này'}`
                    : 'Địa điểm chung cho tất cả các buổi'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapContainerRef}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className={`relative rounded-xl overflow-hidden border-2 focus:outline-none mb-4 ${
          isDarkMode ? 'border-gray-600' : 'border-gray-300'
        }`}
      >
        <div 
          className={`w-full map-container relative ${isResizing ? 'resizing' : ''}`}
          style={{ height: `${mapHeight}px` }}
        >
          <MapContainer
            center={center}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
                          doubleClickZoom={false}
            dragging={true}
            zoomControl={false}
            whenReady={() => {
              console.log('🗺️ Map is ready, setting up event listeners...');
              setIsMapReady(true);
              // Force re-attachment of event listeners
              setTimeout(() => {
                if (mapRef.current) {
                  const map = mapRef.current;
                  
                  const handleZoomEndEvent = () => {
                    handleZoomEnd();
                  };

                  // Remove existing listeners first
                  map.off('dblclick');
                  map.off('click');
                  map.off('zoomend');
                  
                  // Add event listeners - only single click for location selection
                  map.on('click', (e: any) => {
                    console.log('🎯 Single click event triggered!', e);
                    if (!isLoading) {
                      handleMapClick(e);
                    }
                  });
                  map.on('zoomend', handleZoomEndEvent);
                  
                  console.log('✅ Map event listeners attached after map ready');
                }
              }, 100);
            }}
          >
            <TileLayer
              url={isDarkMode 
                ? "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              }
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {selectedLocation && (
              <>
                <Marker 
                  position={[selectedLocation.lat, selectedLocation.lng]}
                  draggable={!isReadOnly}
                  eventHandlers={{
                    dragstart: handleCircleDragStart,
                    dragend: handleCircleDragEnd
                  }}
                >
                                     <Popup>
                     <div className="text-center min-w-[280px] p-4">
                       <h3 className="font-bold text-lg mb-3">Địa điểm đã chọn</h3>
                       
                       {/* Address */}
                       <div className="mb-3 text-left">
                         <div className="flex items-center space-x-2 mb-1">
                           <MapPin size={16} className="text-blue-500" />
                           <span className="text-sm font-medium">Địa chỉ:</span>
                         </div>
                         <p className="text-sm text-gray-600 pl-6">{selectedLocation.address}</p>
                       </div>
                       
                       {/* Radius Control */}
                       {!isReadOnly && (
                         <div className="mb-3">
                           <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center space-x-2">
                               <Ruler size={16} className="text-green-500" />
                               <span className="text-sm font-medium">Bán kính:</span>
                             </div>
                             <span className="text-sm font-bold text-green-600">{selectedLocation.radius}m</span>
                           </div>
                           
                           {/* Slider */}
                           <input
                             type="range"
                             min="50"
                             max="1000"
                             step="50"
                             value={selectedLocation.radius}
                             onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                             className="w-full h-2 rounded-lg appearance-none cursor-pointer slider slider-light"
                           />
                           <div className="flex justify-between text-xs text-gray-500 mt-1">
                             <span>50m</span>
                             <span>1000m</span>
                           </div>
                         </div>
                       )}
                       
                       {/* Instruction */}
                       {!isReadOnly && (
                         <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                           <div className="flex items-center space-x-2">
                             <Lightbulb size={14} className="text-blue-500" />
                             <span className="text-xs text-blue-700">Kéo marker để di chuyển vị trí</span>
                           </div>
                         </div>
                       )}
                     </div>
                   </Popup>
                </Marker>
                <Circle
                  center={[selectedLocation.lat, selectedLocation.lng]}
                  radius={selectedLocation.radius}
                  pathOptions={{
                    color: isDragging ? '#EF4444' : '#3B82F6',
                    fillColor: isDragging ? '#EF4444' : '#3B82F6',
                    fillOpacity: isDragging ? 0.3 : 0.2,
                    weight: isDragging ? 3 : 2,
                    dashArray: isDragging ? '5, 5' : undefined
                  }}
                />
                
                {/* Radius increase marker (+)*/}
                {!isReadOnly && (
                  <Marker
                    position={[
                      selectedLocation.lat + (selectedLocation.radius / 111320) * Math.cos(Math.PI / 4),
                      selectedLocation.lng + (selectedLocation.radius / (111320 * Math.cos(selectedLocation.lat * Math.PI / 180))) * Math.sin(Math.PI / 4)
                    ]}
                    icon={(() => {
                      if (typeof window !== 'undefined') {
                        const L = require('leaflet');
                        return L.divIcon({
                          className: 'radius-control-marker radius-increase',
                          html: '<div style="background-color: #10B981; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">+</div>',
                          iconSize: [24, 24],
                          iconAnchor: [12, 12]
                        });
                      }
                      return undefined;
                    })()}
                    eventHandlers={{
                      click: () => {
                        const newRadius = Math.min(1000, selectedLocation.radius + 50);
                        handleRadiusChange(newRadius);
                      }
                    }}
                  >
                    <Popup>
                      <div className="text-center min-w-[200px] p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
                            <Ruler size={14} className="text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-green-700">Tăng bán kính</p>
                            <p className="text-xs text-green-600">+50m</p>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-600 mb-2">
                          Hiện tại: <span className="font-bold">{selectedLocation.radius}m</span>
                        </div>
                        
                        {/* Quick Slider */}
                        <input
                          type="range"
                          min="50"
                          max="1000"
                          step="50"
                          value={selectedLocation.radius}
                          onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer slider slider-light"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>50m</span>
                          <span>1000m</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Radius decrease marker (-)*/}
                {!isReadOnly && (
                  <Marker
                    position={[
                      selectedLocation.lat - (selectedLocation.radius / 111320) * Math.cos(Math.PI / 4),
                      selectedLocation.lng - (selectedLocation.radius / (111320 * Math.cos(selectedLocation.lat * Math.PI / 180))) * Math.sin(Math.PI / 4)
                    ]}
                    icon={(() => {
                      if (typeof window !== 'undefined') {
                        const L = require('leaflet');
                        return L.divIcon({
                          className: 'radius-control-marker radius-decrease',
                          html: '<div style="background-color: #EF4444; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">−</div>',
                          iconSize: [24, 24],
                          iconAnchor: [12, 12]
                        });
                      }
                      return undefined;
                    })()}
                    eventHandlers={{
                      click: () => {
                        const newRadius = Math.max(50, selectedLocation.radius - 50);
                        handleRadiusChange(newRadius);
                      }
                    }}
                  >
                    <Popup>
                      <div className="text-center min-w-[200px] p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
                            <Ruler size={14} className="text-red-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-red-700">Giảm bán kính</p>
                            <p className="text-xs text-red-600">-50m</p>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-600 mb-2">
                          Hiện tại: <span className="font-bold">{selectedLocation.radius}m</span>
                        </div>
                        
                        {/* Quick Slider */}
                        <input
                          type="range"
                          min="50"
                          max="1000"
                          step="50"
                          value={selectedLocation.radius}
                          onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer slider slider-light"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>50m</span>
                          <span>1000m</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </>
            )}
          </MapContainer>
        </div>

                                                    {/* Modern Resize Handle */}
          {!isReadOnly && (
            <div
              ref={resizeRef}
              onMouseDown={handleResizeStart}
              className={`absolute bottom-0 right-0 w-8 h-8 cursor-nw-resize group transition-all duration-300 z-[9999] ${
                isResizing 
                  ? isDarkMode
                    ? 'bg-blue-500/90 shadow-lg scale-110' 
                    : 'bg-blue-500/90 shadow-lg scale-110'
                  : isDarkMode
                    ? 'bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/50 shadow-md hover:shadow-lg'
                    : 'bg-white/90 hover:bg-gray-100/90 border border-gray-300/50 shadow-md hover:shadow-lg'
              } rounded-lg`}
              title="Kéo để thay đổi kích thước bản đồ"
            >
              {/* Resize handle icon */}
              <div className="w-full h-full flex items-center justify-center relative">
                {/* Diagonal lines pattern */}
                <div className="relative w-4 h-4">
                  {/* Main diagonal line */}
                  <div className={`absolute inset-0 transform rotate-45 transition-all duration-300 ${
                    isResizing 
                      ? 'text-white' 
                      : isDarkMode ? 'text-gray-300 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-800'
                  }`}>
                    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  </div>
                  
                  {/* Corner dots */}
                  <div className={`absolute top-0 right-0 w-1 h-1 rounded-full transition-all duration-300 ${
                    isResizing 
                      ? 'bg-white' 
                      : isDarkMode ? 'bg-gray-400 group-hover:bg-white' : 'bg-gray-400 group-hover:bg-gray-800'
                  }`} />
                  <div className={`absolute bottom-0 left-0 w-1 h-1 rounded-full transition-all duration-300 ${
                    isResizing 
                      ? 'bg-white' 
                      : isDarkMode ? 'bg-gray-400 group-hover:bg-white' : 'bg-gray-400 group-hover:bg-gray-800'
                  }`} />
                </div>
              </div>
              
              {/* Hover tooltip */}
              <div className={`absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs font-medium transition-all duration-300 opacity-0 group-hover:opacity-100 ${
                isDarkMode 
                  ? 'bg-gray-800/90 text-gray-200 border border-gray-600/50' 
                  : 'bg-white/90 text-gray-700 border border-gray-300/50'
              } backdrop-blur-sm whitespace-nowrap`}>
                Resize Map
              </div>
            </div>
          )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
            <div className="text-center">
              <div className="w-8 h-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-white text-sm">Đang lấy địa chỉ...</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-30 animate-pulse">
            <div className="flex items-center space-x-2">
              <CheckCircle size={18} className="text-white" />
              <span className="font-medium">Đã chọn địa điểm thành công!</span>
            </div>
          </div>
        )}

                                                       {/* Modern Map Guide Overlay */}
           <div className={`absolute inset-0 pointer-events-none z-[9999] guide-overlay ${selectedLocation ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}>
             {/* Background overlay */}
             <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 backdrop-blur-[1px]"></div>
             
             {/* Center guide - Only show when no location selected and not read-only */}
             {!selectedLocation && !initialLocation && !isReadOnly && (
               <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-float">
                 {/* Pulsing circle */}
                 <div className="relative animate-glow">
                   <div className={`w-24 h-24 rounded-full border-4 border-blue-400/50 animate-ping absolute inset-0`}></div>
                   <div className={`w-24 h-24 rounded-full border-4 border-blue-500/70 animate-pulse`}></div>
                   <div className={`absolute inset-0 flex items-center justify-center`}>
                     <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg`}>
                       <MapPin size={24} className="text-white" />
                     </div>
                   </div>
                 </div>
                 
                 {/* Guide text */}
                 <div className={`mt-6 text-center`}>
                   <div className={`inline-flex items-center space-x-3 px-6 py-3 rounded-2xl bg-white/90 backdrop-blur-md shadow-xl border border-white/20 animate-float`}>
                     <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center`}>
                       <Info size={16} className="text-white" />
                     </div>
                     <div className="text-left">
                       <p className="text-sm font-semibold text-gray-800">Click để chọn địa điểm</p>
                       <p className="text-xs text-gray-600">Hoặc tìm kiếm địa chỉ ở trên</p>
                       {(!activeTimeSlots || activeTimeSlots.length === 0 || !activeTimeSlots.some(slot => slot.isActive)) && (
                         <p className="text-xs text-yellow-600 mt-1 font-medium flex items-center gap-1">
                           <AlertCircle size={12} /> Cần chọn buổi trước
                         </p>
                       )}
                     </div>
                   </div>
                 </div>
               </div>
             )}
             
             {/* Corner guides */}
             <div className={`absolute top-4 left-4 pointer-events-auto`}>
               <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/90 backdrop-blur-md shadow-lg border border-white/20 corner-guide`}>
                 <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center`}>
                   <Search size={12} className="text-white" />
                 </div>
                 <span className="text-xs font-medium text-gray-700">Tìm kiếm</span>
               </div>
             </div>
             
             <div className={`absolute top-4 right-4 pointer-events-auto`}>
               <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/90 backdrop-blur-md shadow-lg border border-white/20 corner-guide`}>
                 <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center`}>
                   <ZoomIn size={12} className="text-white" />
                 </div>
                 <span className="text-xs font-medium text-gray-700">Zoom</span>
               </div>
             </div>
             
             <div className={`absolute bottom-4 right-4 pointer-events-auto`}>
               <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/90 backdrop-blur-md shadow-lg border border-white/20 corner-guide`}>
                 <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center`}>
                   <Maximize2 size={12} className="text-white" />
                 </div>
                 <span className="text-xs font-medium text-gray-700">Resize</span>
               </div>
             </div>
             
             {/* Floating elements */}
             <div className={`absolute top-1/4 left-1/4 animate-bounce`}>
               <div className={`w-2 h-2 rounded-full bg-blue-400/60`}></div>
             </div>
             <div className={`absolute top-1/3 right-1/3 animate-bounce delay-1000`}>
               <div className={`w-1.5 h-1.5 rounded-full bg-purple-400/60`}></div>
             </div>
             <div className={`absolute bottom-1/4 right-1/4 animate-bounce delay-2000`}>
               <div className={`w-2.5 h-2.5 rounded-full bg-green-400/60`}></div>
             </div>
           </div>

                  {/* Compact Map Guide - Top Left */}
          <div className={`absolute top-2 left-2 z-[9999] pointer-events-auto`}>
            <div className={`group relative`}>
              {/* Guide Button */}
              <button className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-gray-800/90 hover:bg-gray-700/90 border border-gray-600/50 text-gray-300 hover:text-white' 
                  : 'bg-white/90 hover:bg-gray-100/90 border border-gray-300/50 text-gray-600 hover:text-gray-800'
              } shadow-lg hover:shadow-xl backdrop-blur-sm`}>
                <Info size={16} />
              </button>
              
              {/* Hover Guide */}
              <div className={`absolute top-full left-0 mt-2 w-80 p-4 rounded-xl shadow-2xl transition-all duration-300 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto ${
                isDarkMode 
                  ? 'bg-gray-800/95 border border-gray-600/50 backdrop-blur-xl' 
                  : 'bg-white/95 border border-gray-300/50 backdrop-blur-xl'
              }`}>
                <div className="space-y-2 text-xs">
                  <div className={`flex items-center space-x-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                    <MapPin size={14} />
                    <span><strong>Click</strong> để chọn địa điểm</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                    <Move size={14} />
                    <span><strong>Kéo marker</strong> để di chuyển</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                    <Ruler size={14} />
                    <span><strong>Click +/-</strong> để thay đổi bán kính</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                    <MousePointer2 size={14} />
                    <span><strong>Click & kéo</strong> để di chuyển bản đồ</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                    <Search size={14} />
                    <span><strong>Nút +/-</strong> hoặc <strong>phím + / - / 0</strong> để zoom</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
                    <Ruler size={14} />
                    <span><strong>Kéo handle</strong> góc phải để resize</span>
                  </div>
                  <div className={`pt-2 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <div className={`flex items-center space-x-2 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
                      <Lightbulb size={14} />
                      <span><strong>Tip:</strong> Click để chọn ngay!</span>
                    </div>
                  </div>
                </div>
                
                {/* Arrow */}
                <div className={`absolute -top-2 left-4 w-4 h-4 transform rotate-45 ${
                  isDarkMode ? 'bg-gray-800 border-l border-t border-gray-600' : 'bg-white border-l border-t border-gray-300'
                }`}></div>
              </div>
            </div>
          </div>

                  {/* Map Controls */}
          <div className={`absolute top-2 right-2 flex flex-col gap-1 z-[9999] ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {/* Current Location Button */}
            <button
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      const { latitude, longitude } = position.coords;
                      console.log('📍 Updating to current location:', latitude, longitude);
                      
                      if (mapRef.current) {
                        mapRef.current.setView([latitude, longitude], 16, {
                          animate: true,
                          duration: 1.5
                        });
                      }
                    },
                    (error) => {
                      console.log('📍 Could not get current location:', error.message);
                      alert('Không thể lấy vị trí hiện tại. Vui lòng kiểm tra quyền truy cập vị trí.');
                    },
                    {
                      enableHighAccuracy: true,
                      timeout: 10000,
                      maximumAge: 300000
                    }
                  );
                } else {
                  alert('Trình duyệt không hỗ trợ định vị địa lý.');
                }
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                isDarkMode 
                  ? 'bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600' 
                  : 'bg-white/80 hover:bg-gray-100/80 border border-gray-300'
              }`}
              title="Vị trí hiện tại"
            >
              <MapPin size={18} />
            </button>
          <button
            onClick={() => {
              if (mapRef.current) {
                const map = mapRef.current;
                const zoom = map.getZoom();
                const newZoom = Math.min(18, zoom + 1);
                map.setZoom(newZoom);
                setCurrentZoom(newZoom);
              }
            }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold transition-all ${
              isDarkMode 
                ? 'bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600' 
                : 'bg-white/80 hover:bg-gray-100/80 border border-gray-300'
            }`}
            title="Phóng to"
          >
            +
          </button>
          <div className={`w-8 h-6 rounded text-xs flex items-center justify-center font-medium ${
            isDarkMode 
              ? 'bg-gray-800/80 border border-gray-600' 
              : 'bg-white/80 border border-gray-300'
          }`}>
            {currentZoom}
          </div>
          <button
            onClick={() => {
              if (mapRef.current) {
                const map = mapRef.current;
                const zoom = map.getZoom();
                const newZoom = Math.max(1, zoom - 1);
                map.setZoom(newZoom);
                setCurrentZoom(newZoom);
              }
            }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold transition-all ${
              isDarkMode 
                ? 'bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600' 
                : 'bg-white/80 hover:bg-gray-100/80 border border-gray-300'
            }`}
            title="Thu nhỏ"
          >
            −
          </button>
        </div>
      </div>

      

      <style dangerouslySetInnerHTML={{
        __html: `
          .radius-control-marker {
            cursor: pointer !important;
          }

          .radius-control-marker:hover {
            cursor: pointer !important;
          }

          .radius-control-marker:active {
            cursor: pointer !important;
          }

          /* Map container cursor for better UX */
          .map-container {
            cursor: crosshair;
          }

          .map-container:hover {
            cursor: crosshair;
          }

          /* Smooth transitions for better double-click experience */
          .leaflet-container {
            transition: all 0.2s ease-in-out;
          }

          .leaflet-container:active {
            cursor: grabbing !important;
          }

                     /* Modern Resize Handle */
           .cursor-nw-resize {
             cursor: nw-resize !important;
           }

           /* Prevent text selection during resize */
           .map-container.resizing {
             user-select: none;
             -webkit-user-select: none;
             -moz-user-select: none;
             -ms-user-select: none;
           }

           /* Resize handle styles */
           .map-container .cursor-nw-resize {
             transition: all 0.3s ease-in-out;
           }

           .map-container .cursor-nw-resize:hover {
             transform: scale(1.1);
             box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
           }

           .map-container .cursor-nw-resize:active {
             transform: scale(1.15);
             box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
           }

           /* Smooth resize transitions */
           .map-container {
             transition: all 0.3s ease-in-out;
           }

                       /* Dark mode specific styles */
            .dark .map-container .cursor-nw-resize {
              background: rgba(31, 41, 55, 0.9);
              border: 1px solid rgba(75, 85, 99, 0.5);
            }

            .dark .map-container .cursor-nw-resize:hover {
              background: rgba(55, 65, 81, 0.9);
              border: 1px solid rgba(107, 114, 128, 0.6);
            }

            /* Modern guide overlay animations */
            @keyframes float {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-10px) rotate(5deg); }
            }

            @keyframes glow {
              0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
              50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.6); }
            }

            .map-container .animate-float {
              animation: float 3s ease-in-out infinite;
            }

            .map-container .animate-glow {
              animation: glow 2s ease-in-out infinite;
            }

            /* Guide overlay hover effects */
            .map-container .guide-overlay .corner-guide {
              transition: all 0.3s ease-in-out;
            }

            .map-container .guide-overlay .corner-guide:hover {
              transform: scale(1.05);
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
            }

            /* Dark mode guide adjustments */
            .dark .map-container .guide-overlay .corner-guide {
              background: rgba(31, 41, 55, 0.9) !important;
              border-color: rgba(75, 85, 99, 0.5) !important;
            }

            .dark .map-container .guide-overlay .corner-guide span {
              color: rgba(209, 213, 219, 1) !important;
            }
        `
      }} />
    </div>
  );
}
