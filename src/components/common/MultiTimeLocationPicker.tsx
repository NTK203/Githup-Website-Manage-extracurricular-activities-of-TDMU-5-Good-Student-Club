'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Sunrise, Sun, Moon, Search, MapPin, AlertCircle, CheckCircle, XCircle, Ruler, Lightbulb, Tag, Clipboard, X } from 'lucide-react';

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
  id: string;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  radius: number;
}

interface MultiTimeLocationPickerProps {
  onLocationsChange: (locations: LocationData[]) => void;
  initialLocations?: LocationData[];
  isDarkMode?: boolean;
  selectedTimeSlot?: 'morning' | 'afternoon' | 'evening' | null;
  onTimeSlotSelect?: (timeSlot: 'morning' | 'afternoon' | 'evening' | null) => void;
  activeTimeSlots?: ('morning' | 'afternoon' | 'evening')[];
  isAdmin?: boolean; // true = có quyền chỉnh sửa, false = chỉ đọc
}

// Helper function to render time slot icon
const renderTimeSlotIcon = (timeSlot: 'morning' | 'afternoon' | 'evening', size: number = 20) => {
  switch (timeSlot) {
    case 'morning':
      return <Sunrise size={size} className="text-yellow-600 dark:text-yellow-400" />;
    case 'afternoon':
      return <Sun size={size} className="text-orange-600 dark:text-orange-400" />;
    case 'evening':
      return <Moon size={size} className="text-blue-600 dark:text-blue-400" />;
    default:
      return null;
  }
};

const timeSlotConfig = {
  morning: {
    label: 'Buổi sáng',
    color: '#FFD700',
    icon: '🌅', // Keep for backward compatibility in HTML strings
    timeRange: '06:00 - 12:00',
    description: 'Hoạt động buổi sáng',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-700',
    textColor: 'text-yellow-800 dark:text-yellow-200'
  },
  afternoon: {
    label: 'Buổi chiều', 
    color: '#FF6B35',
    icon: '☀️', // Keep for backward compatibility in HTML strings
    timeRange: '12:00 - 18:00',
    description: 'Hoạt động buổi chiều',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-700',
    textColor: 'text-orange-800 dark:text-orange-200'
  },
  evening: {
    label: 'Buổi tối',
    color: '#4A90E2',
    icon: '🌙', // Keep for backward compatibility in HTML strings
    timeRange: '18:00 - 22:00',
    description: 'Hoạt động buổi tối',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-700',
    textColor: 'text-blue-800 dark:text-blue-200'
  }
};

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

export default function MultiTimeLocationPicker({
  onLocationsChange,
  initialLocations = [],
  isDarkMode = false,
  selectedTimeSlot,
  onTimeSlotSelect,
  activeTimeSlots = ['morning', 'afternoon', 'evening'],
  isAdmin = true // Mặc định là admin có quyền chỉnh sửa
}: MultiTimeLocationPickerProps) {
  const [locations, setLocations] = useState<LocationData[]>(initialLocations.map((loc, idx) => ({
    ...loc,
    id: loc.id || `location-init-${idx}-${loc.timeSlot}-${Date.now()}`,
    radius: isNaN(loc.radius) ? 200 : loc.radius
  })));
  const [activeTimeSlot, setActiveTimeSlot] = useState<keyof typeof timeSlotConfig>(activeTimeSlots[0] || 'morning');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(16);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapHeight, setMapHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [isSwitchingTimeSlot, setIsSwitchingTimeSlot] = useState(false);
  const [tempLocation, setTempLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [showLocationConfirm, setShowLocationConfirm] = useState(false);
  const [showTimeSlotLabels, setShowTimeSlotLabels] = useState(true);
  const [labelPosition, setLabelPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const [isUserTyping, setIsUserTyping] = useState(false); // New state to track user typing
  const mapRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const activeTimeSlotRef = useRef<keyof typeof timeSlotConfig>(activeTimeSlots[0] || 'morning');
  const isClearingRef = useRef(false); // Track when user is manually clearing
  const prevInitialLocationsRef = useRef<LocationData[]>(initialLocations); // Track previous initialLocations to prevent unnecessary updates
  const latestOnLocationsChangeRef = useRef(onLocationsChange);

  useEffect(() => {
    latestOnLocationsChangeRef.current = onLocationsChange;
  }, [onLocationsChange]);

  // Default center (TDMU coordinates)
  const defaultCenter: [number, number] = [10.7325, 106.6992];
  
  // Get current location when component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('📍 Current location obtained:', latitude, longitude);
          
          // Update map center to current location
          if (mapRef.current) {
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
  }, []);

  // Sync locations with initialLocations when component re-renders
  useEffect(() => {
    console.log('🔄 Initial locations changed:', initialLocations);
    
    // Check if initialLocations actually changed (deep comparison)
    const prevLength = prevInitialLocationsRef.current.length;
    const currentLength = initialLocations.length;
    const lengthChanged = prevLength !== currentLength;
    
    // If lengths are different, definitely changed
    let initialLocationsChanged = lengthChanged;
    
    // If lengths are same, check each location
    if (!lengthChanged && currentLength > 0) {
      initialLocationsChanged = prevInitialLocationsRef.current.some((prevLoc, index) => {
        const currentLoc = initialLocations[index];
        return !currentLoc || 
               prevLoc.id !== currentLoc.id ||
               prevLoc.timeSlot !== currentLoc.timeSlot ||
               prevLoc.location.lat !== currentLoc.location.lat ||
               prevLoc.location.lng !== currentLoc.location.lng ||
               prevLoc.location.address !== currentLoc.location.address ||
               prevLoc.radius !== currentLoc.radius;
      });
    }
    
    if (!initialLocationsChanged) {
      console.log('⏸️ Initial locations unchanged, skipping sync');
      return;
    }
    
    // Don't sync if user is manually clearing or typing
    if (isClearingRef.current || isUserTyping) {
      console.log('⏸️ Skipping initial locations sync because user is clearing/typing');
      prevInitialLocationsRef.current = [...initialLocations]; // Update ref even if we skip
      return;
    }
    
    prevInitialLocationsRef.current = [...initialLocations]; // Update ref before setState
    // Ensure all locations have valid IDs
    const locationsWithIds = initialLocations.map((loc, idx) => ({
      ...loc,
      id: loc.id || `location-sync-${idx}-${loc.timeSlot}-${Date.now()}`
    }));
    setLocations(locationsWithIds);
    
    // Reset search query if initial locations are empty
    if (initialLocations.length === 0) {
      setSearchQuery('');
      setShowSearchResults(false);
      console.log('🗑️ Initial locations empty, resetting search query');
    } else {
      // Update search query for current active time slot
      const currentLocation = initialLocations.find(loc => loc.timeSlot === activeTimeSlotRef.current);
      if (currentLocation && !isUserTyping) {
        setSearchQuery(currentLocation.location.address);
        console.log('📍 Updated search query from initial locations:', currentLocation.location.address);
      }
    }
  }, [initialLocations, isUserTyping]);

  // Update parent component when locations change
  useEffect(() => {
    console.log('🔄 Locations changed, updating parent:', locations);
    latestOnLocationsChangeRef.current(locations);
    
    // Don't auto-update search query if user is manually clearing
    if (isClearingRef.current) {
      console.log('⏸️ Skipping auto-update because user is clearing');
      return;
    }
    
    // Reset search query if all locations are cleared
    if (locations.length === 0) {
      setSearchQuery('');
      setShowSearchResults(false);
      console.log('🗑️ All locations cleared, resetting search query');
    } else {
      // Update search query with the current active time slot's location
      const currentLocation = locations.find(loc => loc.timeSlot === activeTimeSlotRef.current);
      if (currentLocation && !isUserTyping) {
        setSearchQuery(currentLocation.location.address);
        console.log('📍 Updated search query with current location:', currentLocation.location.address);
      }
    }
  }, [locations, isUserTyping]);



  // Debug activeTimeSlot changes and update search query
  useEffect(() => {
    console.log('🔄 Active time slot changed to:', activeTimeSlot);
    activeTimeSlotRef.current = activeTimeSlot;
    
    // Don't auto-update search query if user is manually clearing
    if (isClearingRef.current) {
      console.log('⏸️ Skipping auto-update because user is clearing');
      setShowSearchResults(false);
      return;
    }
    
    // Only update search query if the user is not currently typing
    if (!isUserTyping) {
      const currentLocation = locations.find(loc => loc.timeSlot === activeTimeSlot);
      console.log('🔄 Current locations for this time slot:', currentLocation);
      
      if (currentLocation) {
        setSearchQuery(currentLocation.location.address);
        console.log('📍 Updated search query for current time slot:', currentLocation.location.address);
      } else {
        setSearchQuery('');
        console.log('📍 No location selected for current time slot, cleared search query');
      }
    } else {
      console.log('Skipping searchQuery update because user is typing.');
    }
    
    // Clear search results when switching time slots, regardless of typing state
    setShowSearchResults(false);
  }, [activeTimeSlot, locations, isUserTyping]); // Added isUserTyping to dependencies



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



  // Effect to handle external time slot selection
  useEffect(() => {
    // Don't auto-update if user is manually clearing
    if (isClearingRef.current) {
      console.log('⏸️ Skipping external time slot update because user is clearing');
      return;
    }
    
    if (selectedTimeSlot && selectedTimeSlot !== activeTimeSlot) {
      console.log('🕐 External time slot selection:', selectedTimeSlot);
      setActiveTimeSlot(selectedTimeSlot);
      
      // Update search query to show the selected location for this time slot
      const locationForTimeSlot = locations.find(loc => loc.timeSlot === selectedTimeSlot);
      if (locationForTimeSlot) {
        setSearchQuery(locationForTimeSlot.location.address);
        console.log('📍 Updated search query with selected location:', locationForTimeSlot.location.address);
        
        // Pan map to the location when editing existing location
        setTimeout(() => {
          if (mapRef.current && locationForTimeSlot.location.lat && locationForTimeSlot.location.lng) {
            console.log('🗺️ Panning map to location:', locationForTimeSlot.location.lat, locationForTimeSlot.location.lng);
            mapRef.current.setView(
              [locationForTimeSlot.location.lat, locationForTimeSlot.location.lng], 
              16, 
              {
                animate: true,
                duration: 1.5
              }
            );
          }
        }, 300); // Wait for map to be ready and activeTimeSlot to update
      } else {
        setSearchQuery('');
        console.log('📍 No location found for selected time slot, cleared search query');
      }
      
      // Auto focus to search input after a short delay
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
        
        // Scroll to map section smoothly
        if (mapSectionRef.current) {
          mapSectionRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 100);
    } else if (selectedTimeSlot && selectedTimeSlot === activeTimeSlot) {
      // If selectedTimeSlot is already active, still pan to location if it exists
      const locationForTimeSlot = locations.find(loc => loc.timeSlot === selectedTimeSlot);
      if (locationForTimeSlot && mapRef.current && locationForTimeSlot.location.lat && locationForTimeSlot.location.lng) {
        console.log('🗺️ Panning map to existing location for active time slot:', locationForTimeSlot.location.lat, locationForTimeSlot.location.lng);
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.setView(
              [locationForTimeSlot.location.lat, locationForTimeSlot.location.lng], 
              16, 
              {
                animate: true,
                duration: 1.5
              }
            );
          }
        }, 300);
      }
    } else if (!selectedTimeSlot && activeTimeSlot) {
      // When external selection is cleared, show the current active time slot's location
      const currentLocation = locations.find(loc => loc.timeSlot === activeTimeSlot);
      if (currentLocation && !isUserTyping) {
        setSearchQuery(currentLocation.location.address);
        console.log('📍 Showing current active time slot location:', currentLocation.location.address);
      } else {
        setSearchQuery('');
        console.log('📍 No location for current active time slot, cleared search query');
      }
      setShowSearchResults(false);
    }
  }, [selectedTimeSlot, locations, activeTimeSlot, isUserTyping]);

  // Priority effect for selectedTimeSlot changes
  useEffect(() => {
    if (selectedTimeSlot && activeTimeSlots.includes(selectedTimeSlot)) {
      console.log('🕐 Priority: External time slot selection detected:', selectedTimeSlot);
      if (selectedTimeSlot !== activeTimeSlot) {
        setActiveTimeSlot(selectedTimeSlot);
        console.log('🕐 Priority: Switched active time slot to:', selectedTimeSlot);
        
        // Pan to location if it exists
        const locationForTimeSlot = locations.find(loc => loc.timeSlot === selectedTimeSlot);
        if (locationForTimeSlot && locationForTimeSlot.location.lat && locationForTimeSlot.location.lng) {
          setTimeout(() => {
            if (mapRef.current && isMapReady) {
              console.log('🗺️ Priority: Panning map to location:', locationForTimeSlot.location.lat, locationForTimeSlot.location.lng);
              mapRef.current.setView(
                [locationForTimeSlot.location.lat, locationForTimeSlot.location.lng], 
                16, 
                {
                  animate: true,
                  duration: 1.5
                }
              );
            }
          }, 400);
        }
      } else {
        // Even if already active, pan to location when clicking "Sửa địa điểm"
        const locationForTimeSlot = locations.find(loc => loc.timeSlot === selectedTimeSlot);
        if (locationForTimeSlot && locationForTimeSlot.location.lat && locationForTimeSlot.location.lng) {
          setTimeout(() => {
            if (mapRef.current && isMapReady) {
              console.log('🗺️ Priority: Panning map to existing location (edit mode):', locationForTimeSlot.location.lat, locationForTimeSlot.location.lng);
              mapRef.current.setView(
                [locationForTimeSlot.location.lat, locationForTimeSlot.location.lng], 
                16, 
                {
                  animate: true,
                  duration: 1.5
                }
              );
            }
          }, 400);
        }
      }
    }
  }, [selectedTimeSlot, activeTimeSlots, isMapReady, locations]);

  // Auto-switch to new time slot when it's added (if no external selection)
  useEffect(() => {
    if (!selectedTimeSlot && activeTimeSlots && activeTimeSlots.length > 1) {
      // Find the most recently added time slot (last in the array)
      const lastAddedTimeSlot = activeTimeSlots[activeTimeSlots.length - 1];
      
      // Only switch if this time slot doesn't have a location yet
      const hasLocation = locations.find(loc => loc.timeSlot === lastAddedTimeSlot);
      
      if (!hasLocation && lastAddedTimeSlot !== activeTimeSlotRef.current) {
        console.log('🔄 Auto-switching to newly added time slot:', lastAddedTimeSlot);
        setActiveTimeSlot(lastAddedTimeSlot);
      }
    }
  }, [activeTimeSlots, selectedTimeSlot, locations]);

  // Auto-update activeTimeSlot when activeTimeSlots changes (only if no external selection)
  useEffect(() => {
    console.log('🔄 Active time slots changed:', activeTimeSlots);
    
    // If there's an external selection, always prioritize it
    if (selectedTimeSlot && activeTimeSlots && activeTimeSlots.includes(selectedTimeSlot)) {
      if (selectedTimeSlot !== activeTimeSlotRef.current) {
        console.log('🔄 External selection detected, switching to:', selectedTimeSlot);
        setActiveTimeSlot(selectedTimeSlot);
      }
      return; // Don't auto-update when there's an external selection
    }
    
    // Only auto-update if there's no external selection
    if (!selectedTimeSlot) {
      // If current activeTimeSlot is not in activeTimeSlots, switch to first available
      if (activeTimeSlots && activeTimeSlots.length > 0 && !activeTimeSlots.includes(activeTimeSlotRef.current)) {
        const newActiveTimeSlot = activeTimeSlots[0];
        console.log('🔄 Switching active time slot from', activeTimeSlotRef.current, 'to', newActiveTimeSlot);
        setActiveTimeSlot(newActiveTimeSlot);
      } else if (!activeTimeSlots || activeTimeSlots.length === 0) {
        // If no active time slots, clear the active time slot
        console.log('🔄 No active time slots, clearing active time slot');
        setActiveTimeSlot('morning'); // Fallback to morning
      } else if (activeTimeSlots.length === 1) {
        // If only one time slot is active, automatically select it
        const singleTimeSlot = activeTimeSlots[0];
        if (singleTimeSlot !== activeTimeSlotRef.current) {
          console.log('🔄 Only one time slot active, auto-selecting:', singleTimeSlot);
          setActiveTimeSlot(singleTimeSlot);
        }
      } else if (activeTimeSlots.length > 1) {
        // If multiple time slots are active, check if we should switch to a new one
        // Find the first time slot that doesn't have a location yet
        const timeSlotWithoutLocation = activeTimeSlots.find(slot => 
          !locations.find(loc => loc.timeSlot === slot)
        );
        
        if (timeSlotWithoutLocation && timeSlotWithoutLocation !== activeTimeSlotRef.current) {
          console.log('🔄 Multiple time slots active, switching to slot without location:', timeSlotWithoutLocation);
          setActiveTimeSlot(timeSlotWithoutLocation);
        }
      }
    }
  }, [activeTimeSlots, selectedTimeSlot, locations]);

  // Function to add or update location with improved logic
  const addOrUpdateLocation = (lat: number, lng: number, address: string, timeSlot: keyof typeof timeSlotConfig, radiusValue: number = 200) => {
    const safeRadius = isNaN(radiusValue) ? 200 : radiusValue;
    
    // Final safety check: ensure the time slot is active - IMPROVED CHECK
    if (!activeTimeSlots || !activeTimeSlots.includes(timeSlot)) {
      console.log('⚠️ Cannot add location: Time slot is not active:', timeSlot, 'Active slots:', activeTimeSlots);
      return;
    }
    
    const newLocation: LocationData = {
      id: `${timeSlot}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timeSlot: timeSlot,
      location: { lat, lng, address },
      radius: safeRadius
    };

    setLocations(prevLocations => {
      const existingIndex = prevLocations.findIndex(loc => loc.timeSlot === timeSlot);
      
      if (existingIndex >= 0) {
        const updatedLocations = [...prevLocations];
        updatedLocations[existingIndex] = newLocation;
        return updatedLocations;
      } else {
        const newLocations = [...prevLocations, newLocation];
        return newLocations;
      }
    });

    // Show success message with specific time slot
    const config = timeSlotConfig[timeSlot];
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);

    // Update search query to show the newly selected location immediately
    setSearchQuery(address);
    console.log('📍 Updated search query with newly selected location:', address);
    
    // Update activeTimeSlotRef to reflect the current time slot
    activeTimeSlotRef.current = timeSlot;

    // Auto switch to next time slot after successful location selection
    setTimeout(() => {
      // Check if there are any active time slots - IMPROVED CHECK
      if (!activeTimeSlots || activeTimeSlots.length === 0) {
        console.log('⚠️ No active time slots selected. Cannot auto-switch.');
        return;
      }
      
      // Only switch to next active time slot (not all time slots)
      const currentIndex = activeTimeSlots.indexOf(timeSlot);
      if (currentIndex >= 0 && currentIndex < activeTimeSlots.length - 1) {
        const nextTimeSlot = activeTimeSlots[currentIndex + 1];
        
        console.log('🔄 Auto switching from', timeSlot, 'to', nextTimeSlot, '(active time slots:', activeTimeSlots, ')');
        setActiveTimeSlot(nextTimeSlot);
        
        // Notify parent component about the switch
        if (onTimeSlotSelect) {
          onTimeSlotSelect(nextTimeSlot);
        }
        
        // Clear search query for next time slot
        setSearchQuery('');
        setShowSearchResults(false);
        
        // Focus on search input for next time slot
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }, 100);
      } else {
        console.log('🎯 No more active time slots to switch to. Current:', timeSlot, 'Active slots:', activeTimeSlots);
        // Clear external selection when done
        if (onTimeSlotSelect) {
          onTimeSlotSelect(null);
        }
      }
    }, 1500); // Wait 1.5 seconds after success message
  };

  const handleMapClick = async (e: any) => {
    console.log('🎯 MultiTime handleMapClick called');
    console.log('🔍 DEBUG: activeTimeSlots =', activeTimeSlots);
    console.log('🔍 DEBUG: activeTimeSlots.length =', activeTimeSlots?.length);
    
    if (!e.latlng || isLoading) {
      return;
    }
    
    // Check if there are any active time slots - IMPROVED CHECK
    const hasActiveTimeSlots = activeTimeSlots && 
                              activeTimeSlots.length > 0;
    
    console.log('🔍 DEBUG: hasActiveTimeSlots =', hasActiveTimeSlots);
    
    if (!hasActiveTimeSlots) {
      console.log('⚠️ Cannot select location: No active time slots - BLOCKING LOCATION SELECTION');
      console.log('⚠️ activeTimeSlots:', activeTimeSlots);
      console.log('⚠️ activeTimeSlots.length:', activeTimeSlots?.length);
      return;
    }
    
    // Auto-switch to time slot without location if current one has location
    const currentTimeSlotHasLocation = locations.find(loc => loc.timeSlot === activeTimeSlotRef.current);
    if (currentTimeSlotHasLocation) {
      // Find first time slot without location
      const timeSlotWithoutLocation = activeTimeSlots.find(slot => 
        !locations.find(loc => loc.timeSlot === slot)
      );
      
      if (timeSlotWithoutLocation && timeSlotWithoutLocation !== activeTimeSlotRef.current) {
        console.log('🔄 Auto-switching to time slot without location:', timeSlotWithoutLocation);
        setActiveTimeSlot(timeSlotWithoutLocation);
        
        // Wait a bit for the switch to complete
        setTimeout(() => {
          handleMapClick(e);
        }, 100);
        return;
      }
    }
    
    const { lat, lng } = e.latlng;
    setIsLoading(true);
    
    try {
      // Get address from coordinates
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        
        // Set temporary location for confirmation
        setTempLocation({ lat, lng, address });
        setShowLocationConfirm(true);
      }
    } catch (error) {
      console.error('Error getting address:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmLocation = () => {
    console.log('🔍 MultiTime handleConfirmLocation called');
    console.log('🔍 DEBUG: activeTimeSlots =', activeTimeSlots);
    console.log('🔍 DEBUG: activeTimeSlots.length =', activeTimeSlots?.length);
    
    // Double-check that we have active time slots before confirming
    const hasActiveTimeSlots = activeTimeSlots && 
                              activeTimeSlots.length > 0;
    
    if (!hasActiveTimeSlots) {
      console.log('⚠️ No active time slots - CANNOT CONFIRM LOCATION');
      return;
    }
    
    if (tempLocation) {
      // Double-check that the current active time slot is in the activeTimeSlots list
      if (!activeTimeSlots.includes(activeTimeSlotRef.current)) {
        console.log('⚠️ Cannot confirm location: Current time slot is not active:', activeTimeSlotRef.current);
        setTempLocation(null);
        setShowLocationConfirm(false);
        return;
      }
      
      addOrUpdateLocation(tempLocation.lat, tempLocation.lng, tempLocation.address, activeTimeSlotRef.current, 200);
      setTempLocation(null);
      setShowLocationConfirm(false);
      setIsUserTyping(false); // User is no longer typing after confirming location
    }
  };

  const handleCancelLocation = () => {
    setTempLocation(null);
    setShowLocationConfirm(false);
  };

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
      
      if (response.ok) {
        const data = await response.json();
        const validResults = data.filter((result: any) => {
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          return !isNaN(lat) && !isNaN(lng) && result.display_name;
        });
        
        setSearchResults(validResults);
        setShowSearchResults(true);
        
        console.log('🔍 Tìm thấy', validResults.length, 'kết quả hợp lệ cho:', query);
      }
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
    setIsUserTyping(true); // User is typing - prevent auto-updates
    isClearingRef.current = false; // Reset clearing flag when user starts typing
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(query);
    }, 500);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim() && !isSearching && activeTimeSlots && activeTimeSlots.length > 0) {
      e.preventDefault();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchAddress(searchQuery);
    }
  };

  const handleSearchResultSelect = async (result: any) => {
    console.log('🔍 MultiTime Search result selected:', result);
    console.log('🔍 DEBUG: activeTimeSlots =', activeTimeSlots);
    console.log('🔍 DEBUG: activeTimeSlots.length =', activeTimeSlots?.length);
    console.log('🔍 Active time slot:', activeTimeSlotRef.current);
    
    // Check if there are any active time slots - IMPROVED CHECK
    const hasActiveTimeSlots = activeTimeSlots && 
                              activeTimeSlots.length > 0;
    
    console.log('🔍 DEBUG: hasActiveTimeSlots =', hasActiveTimeSlots);
    
    if (!hasActiveTimeSlots) {
      console.log('⚠️ Cannot select location: No active time slots - BLOCKING SEARCH RESULT SELECTION');
      console.log('⚠️ activeTimeSlots:', activeTimeSlots);
      console.log('⚠️ activeTimeSlots.length:', activeTimeSlots?.length);
      return;
    }
    
    const lat = parseFloat(result.lat) || 0;
    const lng = parseFloat(result.lon) || 0;
    
    // Get existing location for this time slot to preserve radius
    const existingLocation = locations.find(loc => loc.timeSlot === activeTimeSlotRef.current);
    const radius = (existingLocation?.radius && !isNaN(existingLocation.radius)) ? existingLocation.radius : 200;
    const address = result.display_name || 'Unknown location';
    
    if (isNaN(lat) || isNaN(lng)) return;
    
    // Use the current active time slot
    await addOrUpdateLocation(lat, lng, address, activeTimeSlotRef.current, radius);
    
    setSearchQuery(address);
    setShowSearchResults(false);
    setIsUserTyping(false); // User is no longer typing after selecting a result
    
    // Pan map to location
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 16, {
        animate: true,
        duration: 1.5
      });
    }
  };

  const handleRadiusChange = (locationId: string, newRadiusValue: number) => {
    const safeNewRadius = isNaN(newRadiusValue) ? 200 : newRadiusValue;
    setLocations(locations.map(loc => 
      loc.id === locationId ? { ...loc, radius: safeNewRadius } : loc
    ));
  };

  const handleRemoveLocation = (locationId: string) => {
    const locationToRemove = locations.find(loc => loc.id === locationId);
    setLocations(locations.filter(loc => loc.id !== locationId));
    
    // Clear search query if the removed location was for the current time slot
    if (locationToRemove && locationToRemove.timeSlot === activeTimeSlotRef.current) {
      setSearchQuery('');
      console.log('🗑️ Cleared search query after removing location for current time slot');
    }
  };

  const handleClearAll = () => {
    setLocations([]);
  };

  // Handle clear current location for active time slot
  const handleClearCurrentLocation = () => {
    // Set flag to prevent auto-update from useEffect
    isClearingRef.current = true;
    setIsUserTyping(true); // Prevent auto-update during clearing
    
    const currentLocation = locations.find(loc => loc.timeSlot === activeTimeSlotRef.current);
    if (currentLocation) {
      handleRemoveLocation(currentLocation.id);
    }
    setSearchQuery('');
    setShowSearchResults(false);
    console.log('🗑️ Cleared current location for time slot:', activeTimeSlotRef.current);
    
    // Reset flag after a delay to allow effects to skip and user to start typing
    setTimeout(() => {
      isClearingRef.current = false;
      // Keep isUserTyping true if user is typing, false otherwise
      // This allows user to immediately start typing after clearing
    }, 500);
  };

  // Handle clear search input
  const handleClearSearch = () => {
    // Set flag to prevent auto-update from useEffect
    isClearingRef.current = true;
    setIsUserTyping(true); // Prevent auto-update during clearing
    
    setSearchQuery('');
    setShowSearchResults(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    
    // Reset flag after a delay to allow effects to skip and user to start typing
    setTimeout(() => {
      isClearingRef.current = false;
      // Keep isUserTyping true to allow immediate typing
    }, 500);
  };

  // Handle circle drag start
  const handleCircleDragStart = () => {
    setIsDragging(true);
  };

  // Handle circle drag end
  const handleCircleDragEnd = (e: any, locationId: string) => {
    setIsDragging(false);
    const lat = e.target.getLatLng().lat;
    const lng = e.target.getLatLng().lng;
    
    // Update location coordinates
    setLocations(locations.map(loc => 
      loc.id === locationId 
        ? { ...loc, location: { ...loc.location, lat, lng } }
        : loc
    ));
  };

  // Handle marker drag start
  const handleMarkerDragStart = (locationId: string) => {
    setIsDragging(true);
  };

  // Handle marker drag end
  const handleMarkerDragEnd = async (e: any, locationId: string) => {
    setIsDragging(false);
    const lat = e.target.getLatLng().lat;
    const lng = e.target.getLatLng().lng;
    
    // Get address for new location
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      
      // Update location with new coordinates and address
      setLocations(locations.map(loc => 
        loc.id === locationId 
          ? { ...loc, location: { lat, lng, address } }
          : loc
      ));
      
      // Update search query if this is the current active time slot
      const updatedLocation = locations.find(loc => loc.id === locationId);
      if (updatedLocation && updatedLocation.timeSlot === activeTimeSlotRef.current) {
        setSearchQuery(address);
        console.log('📍 Updated search query after marker drag:', address);
      }
    } catch (error) {
      console.error('Error getting address:', error);
      // Update location with just coordinates if address fetch fails
      setLocations(locations.map(loc => 
        loc.id === locationId 
          ? { ...loc, location: { ...loc.location, lat, lng } }
          : loc
      ));
    }
  };

  // Function to calculate label position based on selected position
  const getLabelPosition = (lat: number, lng: number, radiusValue: number, position: 'top' | 'bottom' | 'left' | 'right'): [number, number] => {
    const safeRadius = isNaN(radiusValue) ? 200 : radiusValue;
    const offset = (safeRadius / 111320) * 1.2; // Convert radius to degrees and add some spacing
    
    switch (position) {
      case 'top':
        return [lat + offset, lng];
      case 'bottom':
        return [lat - offset, lng];
      case 'left':
        return [lat, lng - offset];
      case 'right':
        return [lat, lng + offset];
      default:
        return [lat + offset, lng];
    }
  };

  // Function to get icon anchor based on position
  const getIconAnchor = (position: 'top' | 'bottom' | 'left' | 'right'): [number, number] => {
    switch (position) {
      case 'top':
        return [50, 40]; // Bottom center
      case 'bottom':
        return [50, 0]; // Top center
      case 'left':
        return [100, 20]; // Right center
      case 'right':
        return [0, 20]; // Left center
      default:
        return [50, 40];
    }
  };

  const center: [number, number] = locations.length > 0 
    ? [locations[0].location.lat, locations[0].location.lng] 
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

  // Effect to monitor activeTimeSlots changes and clear locations if no active slots
  useEffect(() => {
    console.log('🔄 MultiTimeLocationPicker: activeTimeSlots changed:', activeTimeSlots);
    console.log('🔍 DEBUG: activeTimeSlots.length =', activeTimeSlots?.length);
    
    const hasActiveTimeSlots = activeTimeSlots && 
                              activeTimeSlots.length > 0;
    
    if (!hasActiveTimeSlots && locations.length > 0) {
      console.log('⚠️ No active time slots detected - CLEARING ALL LOCATIONS');
      setLocations([]);
      setTempLocation(null);
      setShowLocationConfirm(false);
      setSearchQuery('');
      onLocationsChange([]);
    }
  }, [activeTimeSlots, locations.length, onLocationsChange]);

  return (
    <div className="space-y-4">
      {/* Search Bar - Compact */}
      <div className="mb-3">
        <div className="mb-2">
          <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Tìm kiếm địa điểm cho {timeSlotConfig[activeTimeSlot].label}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onBlur={(e) => {
                const currentValue = e.target.value.trim();
                if (!currentValue) {
                  setTimeout(() => {
                    setIsUserTyping(false);
                  }, 200);
                }
              }}
              disabled={!activeTimeSlots || activeTimeSlots.length === 0}
              placeholder={!activeTimeSlots || activeTimeSlots.length === 0 ? 'Vui lòng chọn buổi trước...' : `Tìm kiếm địa chỉ cho ${timeSlotConfig[activeTimeSlot].label}...`}
              className={`w-full pl-10 ${searchQuery ? 'pr-24' : 'pr-10'} py-2 rounded-lg border text-xs transition-all duration-300 ${
                !activeTimeSlots || activeTimeSlots.length === 0
                  ? isDarkMode 
                    ? 'bg-gray-600/30 border-gray-500/30 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-100/50 border-gray-200/50 text-gray-400 cursor-not-allowed'
                  : isDarkMode 
                    ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                    : 'bg-white/80 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'
              } focus:outline-none`}
            />
            
            {/* Right side buttons */}
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1.5">
              {/* Clear button */}
              {searchQuery && !isSearching && (activeTimeSlots && activeTimeSlots.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    const hasLocation = locations.find(loc => loc.timeSlot === activeTimeSlotRef.current);
                    if (hasLocation) {
                      handleClearCurrentLocation();
                    } else {
                      handleClearSearch();
                    }
                  }}
                  className={`p-1 rounded transition-all duration-200 ${
                    isDarkMode
                      ? 'hover:bg-gray-600/50 text-gray-300 hover:text-white'
                      : 'hover:bg-gray-200/50 text-gray-500 hover:text-gray-700'
                  }`}
                  title={locations.find(loc => loc.timeSlot === activeTimeSlotRef.current) ? 'Xóa địa điểm' : 'Xóa tìm kiếm'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              
              {/* Search button */}
              {searchQuery && !isSearching && (activeTimeSlots && activeTimeSlots.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    if (searchQuery.trim()) {
                      searchAddress(searchQuery);
                    }
                  }}
                  className={`p-1 rounded transition-all duration-200 ${
                    isDarkMode
                      ? 'hover:bg-blue-600/50 text-blue-300 hover:text-blue-200'
                      : 'hover:bg-blue-500/50 text-blue-600 hover:text-blue-700'
                  }`}
                  title="Tìm kiếm"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              )}
              
              {/* Loading spinner */}
              {isSearching && (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
          </div>
        </div>

        {/* Active time slot indicator - Compact */}
        {
          !activeTimeSlots || activeTimeSlots.length === 0 ? (
            <div className="mt-2">
              <p className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                Vui lòng chọn buổi trước khi tìm kiếm
              </p>
            </div>
          ) : (
            <div className="mt-2">
              <div className="flex items-center space-x-2">
                {renderTimeSlotIcon(activeTimeSlot, 16)}
                <div>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {timeSlotConfig[activeTimeSlot].label} ({timeSlotConfig[activeTimeSlot].timeRange})
                  </p>
                  {(() => {
                    const unassignedSlots = activeTimeSlots.filter(slot => 
                      slot !== activeTimeSlot && !locations.find(loc => loc.timeSlot === slot)
                    );
                    return unassignedSlots.length > 0 && (
                      <p className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        Chưa có địa điểm: {unassignedSlots.map(slot => timeSlotConfig[slot].label).join(', ')}
                      </p>
                    );
                  })()}
                </div>
              </div>
            </div>
          )
        }
      </div>

      {/* Search Results */}
      {showSearchResults && searchResults.length > 0 && (
            <div className={`mt-2 border rounded-lg max-h-48 overflow-y-auto ${
              isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
            }`}>
              {searchResults.map((result, index) => (
                <button
                  key={`${result.lat}-${result.lon}-${index}`}
                  onClick={() => handleSearchResultSelect(result)}
                  className={`w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                    isDarkMode 
                      ? 'text-gray-300 hover:bg-gray-600 hover:text-blue-400' 
                      : 'text-gray-700'
                  } ${index !== searchResults.length - 1 ? 'border-b border-gray-200 dark:border-gray-600' : ''}`}
                >
                  <div className="flex items-start space-x-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                    }`}>
                      <MapPin size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{result.display_name}</div>
                      <div className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {formatCoordinates(result.lat, result.lon)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* No Results Message */}
          {showSearchResults && searchResults.length === 0 && searchQuery.trim() && !isSearching && (
            <div className={`mt-2 p-3 text-center rounded-lg ${
              isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className={`text-sm flex flex-col items-center ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <Search size={20} className="mb-1" />
                Không tìm thấy địa điểm nào
              </div>
              <div className={`text-xs ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`}>
                                Thử tìm kiếm với từ khóa khác hoặc click trên bản đồ
              </div>
            </div>
          )}

      {/* Notifications above map */}
      <div className="relative mb-4">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="w-full bg-black/20 flex items-center justify-center py-4 rounded-lg">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Đang xử lý...</span>
              </div>
            </div>
          </div>
        )}

        {/* Location Confirmation */}
        {showLocationConfirm && tempLocation && (
          <div className="w-full mb-4">
            <div className={`p-4 rounded-xl shadow-xl max-w-md mx-auto ${isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'}`}>
              <div className="text-center mb-3">
                <div className="text-2xl mb-2">🎯</div>
                <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Xác nhận địa điểm
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Buổi: {timeSlotConfig[activeTimeSlot].label}
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
                    Buổi: {timeSlotConfig[activeTimeSlot].label}
                  </div>
                   <div className="text-xs opacity-75 mt-1">
                     Địa chỉ: {searchQuery}
                   </div>
                  <div className="text-xs opacity-75 mt-1">
                    Sẽ tự động chuyển sang buổi tiếp theo...
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div 
        ref={mapSectionRef}
        className="space-y-4"
      >
        <div 
          ref={mapContainerRef}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          className={`relative rounded-xl overflow-hidden border-2 focus:outline-none ${
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
              console.log('🗺️ Multi-time map is ready, setting up event listeners...');
              setIsMapReady(true);
              // Force re-attachment of event listeners
              setTimeout(() => {
                if (mapRef.current) {
                  const map = mapRef.current;
                  
                  const handleClick = (e: any) => {
                    console.log('🎯 Click event triggered for multi-time!', e);
                    handleMapClick(e);
                  };
                  
                  map.off('click', handleClick);
                  map.on('click', handleClick);
                  
                  console.log('✅ Click event listener attached for multi-time map');
                }
              }, 100);
            }}
          >
            <TileLayer
              key="base-tile-layer"
              url={isDarkMode 
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              }
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* Render markers for each location */}
            {locations.map((location, index) => {
              // Ensure we have a valid unique key
              const uniqueKey = location.id || `location-${index}-${location.timeSlot}`;
              return (
                <React.Fragment key={uniqueKey}>
                  {/* Draggable Marker */}
                  <Marker 
                    key={`marker-${uniqueKey}`}
                    position={[location.location.lat, location.location.lng]}
                    draggable={true}
                    eventHandlers={{
                      dragstart: () => handleMarkerDragStart(location.id),
                      dragend: (e) => handleMarkerDragEnd(e, location.id)
                    }}
                  >
                    <Popup key={`popup-marker-${uniqueKey}`} className={`modern-popup ${isDarkMode ? 'dark' : ''}`}>
                      <div className="min-w-[280px] max-w-[320px] p-0">
                        {/* Header */}
                        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center space-x-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                              {renderTimeSlotIcon(location.timeSlot, 20)}
                            </div>
                            <div>
                              <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {timeSlotConfig[location.timeSlot].label}
                              </h3>
                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {timeSlotConfig[location.timeSlot].timeRange}
                              </p>
                            </div>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-green-400' : 'bg-green-500'}`} title="Đã chọn"></div>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-3">
                          {/* Address */}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <MapPin size={14} className="text-blue-500" />
                              <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Địa chỉ:</span>
                            </div>
                            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} pl-6`}>
                              {location.location.address}
                            </p>
                          </div>

                          {/* Coordinates */}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-purple-500">🎯</span>
                              <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Tọa độ:</span>
                            </div>
                            <div className={`text-xs font-mono p-2 rounded pl-6 ${
                              isDarkMode 
                                ? 'bg-blue-900/20 border border-blue-500/30 text-blue-300' 
                                : 'bg-blue-50 border border-blue-200 text-blue-700'
                            }`}>
                              {location.location.lat.toFixed(6)}, {location.location.lng.toFixed(6)}
                            </div>
                          </div>

                          {/* Radius */}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-green-500">📏</span>
                              <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Bán kính:</span>
                              <span className={`text-xs font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                {location.radius}m
                              </span>
                            </div>
                          </div>

                          {/* Radius Control */}
                          {isAdmin && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="text-green-500">📏</span>
                                  <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Bán kính:</span>
                                </div>
                                <span className={`text-sm font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                  {location.radius}m
                                </span>
                              </div>
                              
                              {/* Modern Slider */}
                              <div className="space-y-2">
                                <input
                                  type="range"
                                  min="50"
                                  max="1000"
                                  step="50"
                                  value={location.radius}
                                  onChange={(e) => handleRadiusChange(location.id, parseInt(e.target.value))}
                                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer slider ${
                                    isDarkMode 
                                      ? 'slider-dark' 
                                      : 'slider-light'
                                  }`}
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>50m</span>
                                  <span>1000m</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Instruction */}
                          {isAdmin && (
                            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                              <div className="flex items-center space-x-2">
                                <span className="text-blue-500">💡</span>
                                <span className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                                  Kéo marker để di chuyển vị trí
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                  
                  {/* Circle overlay */}
                  <Circle
                    key={`circle-${uniqueKey}`}
                    center={[location.location.lat, location.location.lng]}
                    radius={isNaN(location.radius) ? 200 : location.radius}
                    pathOptions={{
                      color: isDragging ? '#EF4444' : timeSlotConfig[location.timeSlot].color,
                      fillColor: isDragging ? '#EF4444' : timeSlotConfig[location.timeSlot].color,
                      fillOpacity: isDragging ? 0.3 : 0.2,
                      weight: isDragging ? 3 : 2,
                      dashArray: isDragging ? '5, 5' : undefined
                    }}
                  >
                    
                                        {/* Text label showing time slot name - positioned based on user preference */}
                    {showTimeSlotLabels && (
                      <Marker
                        key={`label-${uniqueKey}`}
                        position={getLabelPosition(location.location.lat, location.location.lng, isNaN(location.radius) ? 200 : location.radius, labelPosition)}
                        icon={(() => {
                          if (typeof window !== 'undefined') {
                            const L = require('leaflet');
                            return L.divIcon({
                              className: 'time-slot-label-marker',
                              html: `<div style="
                                background: ${isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)'};
                                color: ${isDarkMode ? '#ffffff' : '#000000'};
                                padding: 4px 8px;
                                border-radius: 12px;
                                font-size: 11px;
                                font-weight: bold;
                                border: 2px solid ${timeSlotConfig[location.timeSlot].color};
                                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                                white-space: nowrap;
                                z-index: 1000;
                                backdrop-filter: blur(4px);
                                text-align: center;
                                pointer-events: none;
                              ">
                                <div style="font-size: 10px; margin-bottom: 1px;">${timeSlotConfig[location.timeSlot].icon}</div>
                                <div style="font-size: 9px; line-height: 1;">${timeSlotConfig[location.timeSlot].label}</div>
                                <div style="font-size: 8px; opacity: 0.8; margin-top: 1px;">${isNaN(location.radius) ? 200 : location.radius}m</div>
                              </div>`,
                              iconSize: [100, 40],
                              iconAnchor: getIconAnchor(labelPosition)
                            });
                          }
                          return undefined;
                        })()}
                      />
                    )}
                    <Popup key={`popup-circle-${uniqueKey}`} className={`modern-popup ${isDarkMode ? 'dark' : ''}`}>
                      <div className="min-w-[260px] max-w-[300px] p-0">
                        {/* Header */}
                        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center space-x-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                              {renderTimeSlotIcon(location.timeSlot, 20)}
                            </div>
                            <div>
                              <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {timeSlotConfig[location.timeSlot].label}
                              </h3>
                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Điều chỉnh bán kính
                              </p>
                            </div>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-green-400' : 'bg-green-500'}`} title="Đã chọn"></div>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-4">
                          {/* Address */}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <MapPin size={14} className="text-blue-500" />
                              <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Địa chỉ:</span>
                            </div>
                            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} pl-6`}>
                              {location.location.address}
                            </p>
                          </div>

                          {/* Coordinates */}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-purple-500">🎯</span>
                              <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Tọa độ:</span>
                            </div>
                            <div className={`text-xs font-mono p-2 rounded pl-6 ${
                              isDarkMode 
                                ? 'bg-blue-900/20 border border-blue-500/30 text-blue-300' 
                                : 'bg-blue-50 border border-blue-200 text-blue-700'
                            }`}>
                              {location.location.lat.toFixed(6)}, {location.location.lng.toFixed(6)}
                            </div>
                          </div>

                          {/* Radius Control */}
                          {isAdmin && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="text-green-500">📏</span>
                                  <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Bán kính:</span>
                                </div>
                                <span className={`text-sm font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                  {location.radius}m
                                </span>
                              </div>
                              
                              {/* Modern Slider */}
                              <div className="space-y-2">
                                <input
                                  type="range"
                                  min="50"
                                  max="1000"
                                  step="50"
                                  value={location.radius}
                                  onChange={(e) => handleRadiusChange(location.id, parseInt(e.target.value))}
                                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer slider ${
                                    isDarkMode 
                                      ? 'slider-dark' 
                                      : 'slider-light'
                                  }`}
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>50m</span>
                                  <span>1000m</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Instruction */}
                          {isAdmin && (
                            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                              <div className="flex items-center space-x-2">
                                <span className="text-blue-500">💡</span>
                                <span className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                                  Kéo marker để di chuyển vị trí
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Circle>

                  {/* Radius increase marker (+)*/}
                  {isAdmin && (
                    <Marker
                      key={`radius-increase-${uniqueKey}`}
                      position={[
                        location.location.lat + (isNaN(location.radius) ? 200 : location.radius / 111320) * Math.cos(Math.PI / 4),
                        location.location.lng + (isNaN(location.radius) ? 200 : location.radius / (111320 * Math.cos(location.location.lat * Math.PI / 180))) * Math.sin(Math.PI / 4)
                      ]}
                      icon={(() => {
                        if (typeof window !== 'undefined') {
                          const L = require('leaflet');
                          return L.divIcon({
                            className: 'radius-control-marker radius-increase',
                            html: '<div style="background-color: #10B981; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4); cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; z-index: 1000;">+</div>',
                            iconSize: [28, 28],
                            iconAnchor: [14, 14]
                          });
                        }
                        return undefined;
                      })()}
                      eventHandlers={{
                        click: () => {
                          const newRadius = Math.min(1000, isNaN(location.radius) ? 200 : location.radius + 50);
                          handleRadiusChange(location.id, newRadius);
                        }
                      }}
                    >
                      <Popup key={`popup-increase-${uniqueKey}`} className={`modern-popup ${isDarkMode ? 'dark' : ''}`}>
                        <div className="min-w-[180px] p-0">
                          <div className={`p-3 ${isDarkMode ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
                            <div className="flex items-center space-x-2 mb-2">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-sm ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                                📏
                              </div>
                              <div>
                                <p className={`font-semibold text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                                  Tăng bán kính
                                </p>
                                <p className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                  +50m
                                </p>
                              </div>
                            </div>
                            <div className={`text-xs ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                              Hiện tại: <span className="font-bold">{isNaN(location.radius) ? 200 : location.radius}m</span>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Radius decrease marker (-)*/}
                  {isAdmin && (
                    <Marker
                      key={`radius-decrease-${uniqueKey}`}
                      position={[
                        location.location.lat - (isNaN(location.radius) ? 200 : location.radius / 111320) * Math.cos(Math.PI / 4),
                        location.location.lng - (isNaN(location.radius) ? 200 : location.radius / (111320 * Math.cos(location.location.lat * Math.PI / 180))) * Math.sin(Math.PI / 4)
                      ]}
                      icon={(() => {
                        if (typeof window !== 'undefined') {
                          const L = require('leaflet');
                          return L.divIcon({
                            className: 'radius-control-marker radius-decrease',
                            html: '<div style="background-color: #EF4444; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4); cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; z-index: 1000;">−</div>',
                            iconSize: [28, 28],
                            iconAnchor: [14, 14]
                          });
                        }
                        return undefined;
                      })()}
                      eventHandlers={{
                        click: () => {
                          const newRadius = Math.max(50, isNaN(location.radius) ? 200 : location.radius - 50);
                          handleRadiusChange(location.id, newRadius);
                        }
                      }}
                    >
                      <Popup key={`popup-decrease-${uniqueKey}`} className={`modern-popup ${isDarkMode ? 'dark' : ''}`}>
                        <div className="min-w-[180px] p-0">
                          <div className={`p-3 ${isDarkMode ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
                            <div className="flex items-center space-x-2 mb-2">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-sm ${isDarkMode ? 'bg-red-500/20' : 'bg-red-100'}`}>
                                📏
                              </div>
                              <div>
                                <p className={`font-semibold text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                                  Giảm bán kính
                                </p>
                                <p className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                  -50m
                                </p>
                              </div>
                            </div>
                            <div className={`text-xs ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                              Hiện tại: <span className="font-bold">{isNaN(location.radius) ? 200 : location.radius}m</span>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </React.Fragment>
              );
            })}

            {/* Temporary marker for location selection */}
            {tempLocation && (
              <Circle
                key="temp-circle"
                center={[tempLocation.lat, tempLocation.lng]}
                radius={200}
                pathOptions={{
                  color: '#FF6B35',
                  fillColor: '#FF6B35',
                  fillOpacity: 0.2,
                  weight: 3,
                  dashArray: '5, 5'
                }}
              >
                <Popup key="temp-popup" className={`modern-popup ${isDarkMode ? 'dark' : ''}`}>
                  <div className="p-3">
                    <h3 className="font-semibold mb-2 text-orange-600">
                      🎯 Địa điểm tạm thời
                    </h3>
                    <p className="text-sm mb-2">{tempLocation.address}</p>
                    <p className="text-xs text-gray-500 mb-3">
                      Buổi: {timeSlotConfig[activeTimeSlot].label}
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={handleConfirmLocation}
                        className="w-full bg-green-500 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-green-600 transition-colors"
                      >
                        ✅ Chọn địa điểm này
                      </button>
                      <button
                        onClick={handleCancelLocation}
                        className="w-full bg-gray-500 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-gray-600 transition-colors"
                      >
                        ❌ Hủy bỏ
                      </button>
                    </div>
                  </div>
                </Popup>
              </Circle>
            )}
          </MapContainer>
        </div>

        {/* Modern Resize Handle */}
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
      </div>



                 {/* Map Controls */}
         {isAdmin && (
           <div className={`absolute top-2 right-2 flex flex-col gap-1 z-[9999] ${
             isDarkMode ? 'text-gray-300' : 'text-gray-600'
           }`}>
                                    {/* Label Position Dropdown */}
             {showTimeSlotLabels && (
               <div className="relative">
                 <select
                   value={labelPosition}
                   onChange={(e) => setLabelPosition(e.target.value as 'top' | 'bottom' | 'left' | 'right')}
                   className={`w-8 h-8 rounded-lg text-xs font-bold transition-all appearance-none cursor-pointer ${
                     isDarkMode 
                       ? 'bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600 text-gray-300' 
                       : 'bg-white/80 hover:bg-gray-100/80 border border-gray-300 text-gray-600'
                   }`}
                   title="Vị trí hiển thị tên buổi"
                 >
                   <option value="top">⬆️</option>
                   <option value="bottom">⬇️</option>
                   <option value="left">⬅️</option>
                   <option value="right">➡️</option>
                 </select>
               </div>
             )}

             {/* Toggle Labels Button */}
             <button
               onClick={() => setShowTimeSlotLabels(!showTimeSlotLabels)}
               className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold transition-all ${
                 isDarkMode 
                   ? 'bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600' 
                   : 'bg-white/80 hover:bg-gray-100/80 border border-gray-300'
               } ${showTimeSlotLabels ? 'bg-blue-500/20 border-blue-400' : ''}`}
               title={showTimeSlotLabels ? 'Ẩn tên buổi' : 'Hiển thị tên buổi'}
             >
               {showTimeSlotLabels ? '🏷️' : '📋'}
             </button>

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
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold transition-all ${
                isDarkMode 
                  ? 'bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600' 
                  : 'bg-white/80 hover:bg-gray-100/80 border border-gray-300'
              }`}
              title="Vị trí hiện tại"
            >
              📍
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
        )}
      </div>



      <style dangerouslySetInnerHTML={{
        __html: `
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

          /* Modern popup styles */
          .modern-popup {
            background: white !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 12px !important;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1) !important;
            padding: 0 !important;
            overflow: hidden !important;
          }

          .modern-popup.dark {
            background: #1f2937 !important;
            border-color: #374151 !important;
            color: white !important;
          }

          /* Map container cursor for better UX */
          .map-container {
            cursor: crosshair;
          }

          .map-container:hover {
            cursor: crosshair;
          }

          /* Smooth transitions for better click experience */
          .leaflet-container {
            transition: all 0.2s ease-in-out;
          }

          .leaflet-container:active {
            cursor: grabbing !important;
           }

           /* Time slot label marker styles */
           .time-slot-label-marker {
             z-index: 1000 !important;
           }

           .time-slot-label-marker div {
             pointer-events: none;
             user-select: none;
             -webkit-user-select: none;
             -moz-user-select: none;
             -ms-user-select: none;
           }

                       /* Ensure label is always visible above other elements */
            .leaflet-marker-icon.time-slot-label-marker {
              z-index: 1000 !important;
            }

            /* Custom select styling */
            .map-container select {
              background-image: none !important;
              padding-right: 8px !important;
            }

            .map-container select option {
              background: rgba(255, 255, 255, 0.9);
              color: #000;
              font-size: 12px;
              padding: 4px;
            }

            .dark .map-container select option {
              background: rgba(31, 41, 55, 0.9);
              color: #fff;
          }
        `
      }} />
    </div>
  );
}
