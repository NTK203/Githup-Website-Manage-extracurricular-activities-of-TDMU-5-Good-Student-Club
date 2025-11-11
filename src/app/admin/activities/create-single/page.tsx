'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import { ITimeSlot, IParticipant, ActivityType, ParticipantRole } from '@/models/Activity';
import dynamic from 'next/dynamic';
import LoadingSpinner, { TimeSlotValidationLoading, LocationSelectionLoading, SearchLoading } from '@/components/common/LoadingSpinner';

// Dynamically import OpenStreetMapPicker with SSR disabled
const OpenStreetMapPicker = dynamic(() => import('@/components/common/OpenStreetMapPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-xl border-2 border-gray-300 bg-gray-50/50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 bg-gray-200/50">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">Đang tải OpenStreetMap...</p>
      </div>
    </div>
  )
});

// Dynamically import MultiTimeLocationPicker with SSR disabled
const MultiTimeLocationPicker = dynamic(() => import('@/components/common/MultiTimeLocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-xl border-2 border-gray-300 bg-gray-50/50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 bg-gray-200/50">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">Đang tải MultiTimeLocationPicker...</p>
      </div>
    </div>
  )
});

interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  activities: string;
  detailedLocation: string; // Thêm trường địa điểm chi tiết
}

interface LocationData {
  lat: number;
  lng: number;
  address: string;
  radius: number;
}

interface Participant {
  id: string;
  userId: string;
  name: string;
  role: ParticipantRole;
  email: string;
}

export default function CreateSingleActivityPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if this is edit mode
  const activityId = params.id as string;
  const isEditMode = activityId && activityId !== 'new';
  
  console.log('CreateSingleActivityPage - activityId:', activityId);
  console.log('CreateSingleActivityPage - isEditMode:', isEditMode);

  // Form states for single day activity
  const [form, setForm] = useState({
    name: '',
    description: '',
    date: '',
    location: '',
    detailedLocation: '', // Thêm trường địa điểm chi tiết
    maxParticipants: '',
    visibility: 'public', // 'public' or 'private'
    responsiblePerson: '',
    status: 'draft', // 'draft', 'published', 'ongoing', 'completed', 'cancelled', 'postponed'
    imageUrl: '',
    overview: ''
  });

  // Location state for map picker
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  
  // Multi-time location state
  const [multiTimeLocations, setMultiTimeLocations] = useState<any[]>([]);
  const [useMultiTimeLocation, setUseMultiTimeLocation] = useState(false);
  const [selectedTimeSlotForLocation, setSelectedTimeSlotForLocation] = useState<'morning' | 'afternoon' | 'evening' | null>(null);
  const [locationPickerKey, setLocationPickerKey] = useState(0); // Key để force re-render MultiTimeLocationPicker

  // Image upload states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  // Image upload state removed - images will be uploaded when form is submitted

  // Time slots management
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { id: '1', name: 'Buổi Sáng', startTime: '07:00', endTime: '11:30', isActive: true, activities: '', detailedLocation: '' },
    { id: '2', name: 'Buổi Chiều', startTime: '12:30', endTime: '17:00', isActive: false, activities: '', detailedLocation: '' },
    { id: '3', name: 'Buổi Tối', startTime: '17:00', endTime: '22:00', isActive: false, activities: '', detailedLocation: '' }
  ]);

  // Ensure timeSlots never contains undefined/null values and all slots have valid structure
  // This runs on mount and when isEditMode changes to ensure it always has exactly 3 valid slots
  useEffect(() => {
    setTimeSlots(prev => {
      const defaultSlots: TimeSlot[] = [
        { id: '1', name: 'Buổi Sáng', startTime: '07:00', endTime: '11:30', isActive: true, activities: '', detailedLocation: '' },
        { id: '2', name: 'Buổi Chiều', startTime: '12:30', endTime: '17:00', isActive: false, activities: '', detailedLocation: '' },
        { id: '3', name: 'Buổi Tối', startTime: '17:00', endTime: '22:00', isActive: false, activities: '', detailedLocation: '' }
      ];
      
      // Filter and validate existing slots
      const filtered = prev
        .filter((slot): slot is TimeSlot => 
          slot != null && 
          slot.id != null && 
          typeof slot.id === 'string' &&
          typeof slot.name === 'string' &&
          typeof slot.isActive === 'boolean'
        )
        .map(slot => ({
          ...slot,
          isActive: slot.isActive ?? false,
          name: slot.name || '',
          startTime: slot.startTime || '',
          endTime: slot.endTime || '',
          activities: slot.activities || '',
          detailedLocation: slot.detailedLocation || ''
        }));
      
      // If we don't have exactly 3 valid slots, merge with defaults
      if (filtered.length !== 3) {
        const result: TimeSlot[] = [];
        for (let i = 0; i < 3; i++) {
          const existingSlot = filtered.find(s => 
            (s.name === defaultSlots[i].name) || 
            (i === 0 && s.name.includes('Sáng')) ||
            (i === 1 && s.name.includes('Chiều')) ||
            (i === 2 && s.name.includes('Tối'))
          );
          result[i] = existingSlot || defaultSlots[i];
        }
        return result;
      }
      
      // Ensure we have all 3 slots in correct order
      const slotNameMap: { [key: string]: number } = {
        'Buổi Sáng': 0,
        'Buổi Chiều': 1,
        'Buổi Tối': 2
      };
      
      const ordered: TimeSlot[] = [...defaultSlots];
      filtered.forEach(slot => {
        const index = slotNameMap[slot.name];
        if (index !== undefined && index >= 0 && index < 3) {
          ordered[index] = slot;
        }
      });
      
      return ordered;
    });
  }, [isEditMode]); // Run on mount and when edit mode changes

  // Participants management
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    userId: '',
    name: '',
    role: 'Người Tham Gia' as ParticipantRole,
    email: ''
  });

  // Club students management
  const [clubStudents, setClubStudents] = useState<Array<{
    _id: string;
    name: string;
    email: string;
    studentId: string;
    faculty?: string;
    role: string;
    isClubMember?: boolean;
  }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const studentsPerPage = 10; // Hiển thị 10 thành viên mỗi trang



  // Additional notes toggle - show by default if in edit mode or if there's existing overview
  const [showAdditionalNotes, setShowAdditionalNotes] = useState(isEditMode);
  
  // Clear all locations modal
  const [showClearLocationsModal, setShowClearLocationsModal] = useState(false);
  
  // Success notification modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Handle clear all locations
  const handleClearAllLocations = () => {
    // Xóa tất cả địa điểm đã chọn
    setMultiTimeLocations([]);
    // Reset selected time slot
    setSelectedTimeSlotForLocation(null);
    // Reset detailed locations cho tất cả buổi
    setTimeSlots(prevSlots => prevSlots
      .filter(slot => slot != null)
      .map(slot => ({
        ...slot,
        detailedLocation: ''
      })));
    // Force re-render MultiTimeLocationPicker
    setLocationPickerKey(prev => prev + 1);
    // Đóng modal
    setShowClearLocationsModal(false);
  };

  // Loading states for edit mode
  const [isLoadingActivity, setIsLoadingActivity] = useState(isEditMode);
  const [submitError, setSubmitError] = useState('');

  // Responsible persons state
  const [responsiblePersons, setResponsiblePersons] = useState<Array<{
    _id: string;
    name: string;
    email: string;
    role: string;
    studentId: string;
    status: string;
  }>>([]);
  const [loadingResponsiblePersons, setLoadingResponsiblePersons] = useState(false);

  // Function to convert role names to Vietnamese
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

  // Helper function to map timeSlots to MultiTimeLocationPicker timeSlot values
  const getTimeSlotKey = (index: number): 'morning' | 'afternoon' | 'evening' => {
    switch(index) {
      case 0: return 'morning';
      case 1: return 'afternoon';
      case 2: return 'evening';
      default: return 'morning';
    }
  };

  // Function to handle click on location to select time slot
  const handleLocationDoubleClick = (timeSlotKey: 'morning' | 'afternoon' | 'evening') => {
    // Check if this time slot is active
    const timeSlotIndex = timeSlotKey === 'morning' ? 0 : timeSlotKey === 'afternoon' ? 1 : 2;
    const timeSlot = timeSlots.find((slot, idx) => idx === timeSlotIndex && slot != null && slot.id != null) || timeSlots[timeSlotIndex];
    
    if (!timeSlot || typeof timeSlot !== 'object' || !('isActive' in timeSlot) || !timeSlot.isActive) {
      console.log('⚠️ Cannot select location for inactive time slot:', timeSlotKey);
      return; // Don't allow selection for inactive time slots
    }
    
    setSelectedTimeSlotForLocation(timeSlotKey);
    
    // Scroll to map section (thống nhất với button click)
    setTimeout(() => {
      const mapSection = document.getElementById('map-section');
      if (mapSection) {
        mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Function to handle time slot selection for location (thống nhất logic)
  const handleTimeSlotLocationSelect = (timeSlotKey: 'morning' | 'afternoon' | 'evening') => {
    // Check if this time slot is active
    const timeSlotIndex = timeSlotKey === 'morning' ? 0 : timeSlotKey === 'afternoon' ? 1 : 2;
    const timeSlot = timeSlots.find((slot, idx) => idx === timeSlotIndex && slot != null && slot.id != null) || timeSlots[timeSlotIndex];
    
    if (!timeSlot || typeof timeSlot !== 'object' || !('isActive' in timeSlot) || !timeSlot.isActive) {
      console.log('⚠️ Cannot select location for inactive time slot:', timeSlotKey);
      return; // Don't allow selection for inactive time slots
    }
    
    setSelectedTimeSlotForLocation(timeSlotKey);
    
    // Scroll to map section
    setTimeout(() => {
      const mapSection = document.getElementById('map-section');
      if (mapSection) {
        mapSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };

  // Function to clear time slot selection
  const handleClearTimeSlotSelection = () => {
    setSelectedTimeSlotForLocation(null);
  };

  // Function to convert status to Vietnamese
  const getStatusDisplayName = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'active': 'Hoạt động',
      'inactive': 'Không hoạt động',
      'suspended': 'Tạm ngưng',
      'pending': 'Chờ xác nhận'
    };
    return statusMap[status] || status;
  };

  // Function to get status color
  const getStatusColor = (status: string): string => {
    const statusColorMap: { [key: string]: string } = {
      'active': isDarkMode ? 'text-green-400' : 'text-green-600',
      'inactive': isDarkMode ? 'text-gray-400' : 'text-gray-600',
      'suspended': isDarkMode ? 'text-red-400' : 'text-red-600',
      'pending': isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
    };
    return statusColorMap[status] || (isDarkMode ? 'text-gray-400' : 'text-gray-600');
  };

  // Helper function to get today's date in local timezone (YYYY-MM-DD format)
  const getTodayDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle location change from map picker
  const handleLocationChange = (location: LocationData) => {
    setLocationData(location);
    // Only set form.location when NOT in multi-time mode
    if (!useMultiTimeLocation) {
      setForm(prev => ({
        ...prev,
        location: location.address
      }));
    }
  };

  const handleTimeSlotChange = (id: string, field: keyof TimeSlot, value: string | boolean) => {
    console.log('🔄 handleTimeSlotChange called:', { id, field, value });
    
    setTimeSlots(prev => {
      const updated = prev
        .filter(slot => slot != null)
        .map(slot => 
          slot.id === id ? { ...slot, [field]: value } : slot
        );
      
      console.log('🔄 Updated timeSlots:', updated);
      console.log('🔄 Active time slots:', updated.filter((slot): slot is TimeSlot => slot != null && typeof slot === 'object' && 'isActive' in slot && slot.isActive === true));
      
      return updated;
    });
  };

  const handleAddParticipant = () => {
    if (newParticipant.name && newParticipant.role) {
      setParticipants(prev => [...prev, {
        id: Date.now().toString(),
        ...newParticipant
      }]);
      setNewParticipant({ userId: '', name: '', role: 'Người Tham Gia', email: '' });
      setShowAddParticipant(false);
    }
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  };

  // Function to change participant role
  const handleChangeParticipantRole = (participantId: string, newRole: ParticipantRole) => {
    setParticipants(prev => prev.map(p => 
      p.id === participantId ? { ...p, role: newRole } : p
    ));
  };

  // Image upload handlers
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file hình ảnh');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Kích thước file không được vượt quá 10MB');
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Image will be uploaded when form is submitted

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview('');
    setForm(prev => ({
      ...prev,
      imageUrl: ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (!form.name.trim()) {
        throw new Error('Tên hoạt động là bắt buộc');
      }
      
      if (!form.description.trim()) {
        throw new Error('Mô tả hoạt động là bắt buộc');
      }
      
      if (!form.date) {
        throw new Error('Ngày diễn ra là bắt buộc');
      }
      
      // Validate time slots first (needed for location validation)
      const activeTimeSlots = timeSlots.filter((slot): slot is TimeSlot => slot != null && typeof slot === 'object' && 'isActive' in slot && slot.isActive === true);
      if (activeTimeSlots.length === 0) {
        throw new Error('Phải có ít nhất một buổi được kích hoạt');
      }
      
      // Location validation based on mode
      if (!useMultiTimeLocation) {
        // Single location mode - validate locationData (from map) or form.location
        if (!locationData && (!form.location || !form.location.trim())) {
          throw new Error('Vui lòng chọn địa điểm trên bản đồ');
        }
      } else {
        // Multi-time location mode - validate that we have locations for all active time slots
        if (multiTimeLocations.length === 0) {
          throw new Error('Vui lòng chọn ít nhất một địa điểm cho các thời gian');
        }
        // Validate that each active time slot has a location
        const activeTimeSlotKeys = activeTimeSlots.map((slot, index) => {
          const timeSlotMap: { [key: string]: 'morning' | 'afternoon' | 'evening' } = {
            'Buổi Sáng': 'morning',
            'Buổi Chiều': 'afternoon', 
            'Buổi Tối': 'evening'
          };
          return timeSlotMap[slot.name] || (index === 0 ? 'morning' : index === 1 ? 'afternoon' : 'evening');
        });
        const missingLocations = activeTimeSlotKeys.filter(key => 
          !multiTimeLocations.find(loc => loc.timeSlot === key)
        );
        if (missingLocations.length > 0) {
          throw new Error(`Vui lòng chọn địa điểm cho các buổi: ${missingLocations.map(key => 
            key === 'morning' ? 'Sáng' : key === 'afternoon' ? 'Chiều' : 'Tối'
          ).join(', ')}`);
        }
      }
      
      if (!form.responsiblePerson) {
        throw new Error('Người phụ trách là bắt buộc');
      }

      // Upload image to Cloudinary if selected
      let imageUrl = form.imageUrl; // Keep existing URL if no new image selected
      if (selectedImage) {
        // Always upload new image if selected, even in edit mode
        console.log('📤 Uploading new image to Cloudinary...');
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        }

        const formData = new FormData();
        formData.append('activityImage', selectedImage);

        const uploadResponse = await fetch('/api/upload/activity-image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!uploadResponse.ok) {
          throw new Error('Lỗi khi tải ảnh lên Cloudinary');
        }

        const uploadResult = await uploadResponse.json();
        imageUrl = uploadResult.url;
        console.log('✅ New image uploaded successfully:', imageUrl);
      }

      // Prepare activity data according to the Activity model
      // Determine location string - use locationData.address if form.location is empty
      const finalLocation = useMultiTimeLocation 
        ? 'Nhiều địa điểm' 
        : (form.location && form.location.trim()) 
          ? form.location 
          : (locationData ? locationData.address : '');
      
      // Create date object - ensure it represents the selected date correctly
      // form.date is in format "YYYY-MM-DD"
      // Create as ISO string with UTC time 00:00:00 to avoid timezone conversion issues
      // When server receives this, it will parse it correctly regardless of server timezone
      const activityDate = form.date ? (() => {
        // Create date string in ISO format: "YYYY-MM-DDTHH:mm:ss.sssZ"
        // This ensures the date is interpreted correctly on the server
        const dateString = `${form.date}T00:00:00.000Z`;
        return new Date(dateString);
      })() : null;
      
      console.log('📅 Activity date:', activityDate);
      console.log('📅 Form date:', form.date);
      console.log('📅 Date ISO string:', activityDate?.toISOString());
      
      const activityData = {
        name: form.name,
        description: form.description,
        date: activityDate,
        location: finalLocation,
        locationData: useMultiTimeLocation ? undefined : (locationData ? {
          lat: locationData.lat,
          lng: locationData.lng,
          address: locationData.address,
          radius: locationData.radius
        } : undefined),
        multiTimeLocations: useMultiTimeLocation ? multiTimeLocations : undefined,
        maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants) : undefined,
        visibility: form.visibility as 'public' | 'private',
        responsiblePerson: form.responsiblePerson,
        status: form.status as 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled' | 'postponed',
        type: 'single_day' as ActivityType,
        imageUrl: imageUrl || undefined,
        overview: form.overview || undefined,
        timeSlots: timeSlots
          .filter((slot): slot is TimeSlot => slot != null && slot.id != null && slot.isActive === true)
          .map(slot => {
            const detailedLocation = useMultiTimeLocation ? (slot.detailedLocation || '') : (form.detailedLocation || '');
            console.log(`🕐 Time slot ${slot.name} detailedLocation:`, detailedLocation);
            console.log(`🕐 Time slot ${slot.name} raw slot.detailedLocation:`, slot.detailedLocation);
            console.log(`🕐 Time slot ${slot.name} form.detailedLocation:`, form.detailedLocation);
            console.log(`🕐 Time slot ${slot.name} useMultiTimeLocation:`, useMultiTimeLocation);
            
            return {
              id: slot.id,
              name: slot.name || '',
              startTime: slot.startTime || '',
              endTime: slot.endTime || '',
              isActive: slot.isActive ?? true,
              activities: slot.activities || '',
              detailedLocation: detailedLocation
            };
          }),
        participants: participants.map(participant => {
          console.log(`👥 Participant ${participant.name} role:`, participant.role);
          return {
            userId: participant.userId,
            name: participant.name,
            email: participant.email,
            role: participant.role
          };
        })
      };

      console.log('Submitting single day activity:', activityData);
      console.log('Activity data JSON:', JSON.stringify(activityData, null, 2));
      console.log('MultiTimeLocations data:', multiTimeLocations);
      console.log('UseMultiTimeLocation:', useMultiTimeLocation);
      
      // Call API to create activity
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
      }

      // Submit to API - use PUT for edit, POST for create
      const url = isEditMode ? `/api/activities/${activityId}` : '/api/activities';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(activityData)
      });

      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);
        console.error('Response headers:', Object.fromEntries(response.headers.entries()));
        
        let errorData;
        try {
          const responseText = await response.text();
          console.error('Raw response text:', responseText);
          
          if (responseText) {
            errorData = JSON.parse(responseText);
            console.error('Parsed API Error:', errorData);
          } else {
            console.error('Empty response body');
            throw new Error(`HTTP ${response.status}: ${response.statusText} - Empty response`);
          }
        } catch (jsonError) {
          console.error('Failed to parse error response as JSON:', jsonError);
          throw new Error(`HTTP ${response.status}: ${response.statusText} - Invalid JSON response`);
        }
        
        if (errorData.details && Array.isArray(errorData.details)) {
          throw new Error(`Dữ liệu không hợp lệ: ${errorData.details.join(', ')}`);
        }
        throw new Error(errorData.error || errorData.message || `Failed to ${isEditMode ? 'update' : 'create'} activity`);
      }

      const result = await response.json();
      console.log(`Activity ${isEditMode ? 'updated' : 'created'}:`, result);
      
      // Show success modal instead of alert
      setSuccessMessage(`Hoạt động đã được ${isEditMode ? 'cập nhật' : 'tạo'} thành công!`);
      setShowSuccessModal(true);
      
      // Only reset form if creating new activity
      if (!isEditMode) {
        setForm({
          name: '',
          description: '',
          date: '',
          location: '',
          detailedLocation: '',
          maxParticipants: '',
          visibility: 'public',
          responsiblePerson: '',
          status: 'draft',
          imageUrl: '',
          overview: ''
        });
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
      // Only reset other states if creating new activity
      if (!isEditMode) {
        setLocationData(null);
        setMultiTimeLocations([]);
        setUseMultiTimeLocation(false);
        setTimeSlots([
          { id: '1', name: 'Buổi Sáng', startTime: '07:00', endTime: '11:30', isActive: true, activities: '', detailedLocation: '' },
          { id: '2', name: 'Buổi Chiều', startTime: '12:30', endTime: '17:00', isActive: false, activities: '', detailedLocation: '' },
          { id: '3', name: 'Buổi Tối', startTime: '17:00', endTime: '22:00', isActive: false, activities: '', detailedLocation: '' }
        ]);
        setParticipants([]);
        
        // Reset image upload states
        setSelectedImage(null);
        setImagePreview('');
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} activity:`, error);
      const errorMessage = error instanceof Error ? error.message : `Có lỗi xảy ra khi ${isEditMode ? 'cập nhật' : 'tạo'} hoạt động!`;
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
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
      console.log('Loading activity data for ID:', id);
      
      const response = await fetch(`/api/activities/${id}`);
      const result = await response.json();
      
      console.log('API response:', result);
      
      if (result.success && result.data.activity) {
        const activity = result.data.activity;
        console.log('Loaded activity data:', activity);
        
        // Fill form data - handle MongoDB data structure
        setForm({
          name: activity.name || '',
          description: activity.description || '',
          date: activity.date ? new Date(activity.date).toISOString().split('T')[0] : '',
          location: activity.location || '',
          detailedLocation: activity.detailedLocation || '',
          maxParticipants: activity.maxParticipants?.toString() || '50',
          visibility: activity.visibility || 'public',
          responsiblePerson: activity.responsiblePerson?._id || activity.responsiblePerson || '',
          status: activity.status || 'draft',
          imageUrl: activity.imageUrl || '',
          overview: activity.overview || '',
        });
        
        console.log('Form data set:', {
          name: activity.name || '',
          description: activity.description || '',
          date: activity.date ? new Date(activity.date).toISOString().split('T')[0] : '',
          location: activity.location || '',
          detailedLocation: activity.detailedLocation || '',
          maxParticipants: activity.maxParticipants?.toString() || '50',
          visibility: activity.visibility || 'public',
          responsiblePerson: activity.responsiblePerson?._id || activity.responsiblePerson || '',
          status: activity.status || 'draft',
          imageUrl: activity.imageUrl || '',
          overview: activity.overview || '',
        });
        
        console.log('📝 Raw overview from activity:', activity.overview);
        console.log('📝 Form overview set to:', activity.overview || '');
        
        // Auto-show additional notes if there's existing overview data
        if (activity.overview && activity.overview.trim()) {
          setShowAdditionalNotes(true);
          console.log('📝 Auto-showing additional notes because overview exists:', activity.overview);
        }
        
        console.log('🖼️ Image URL from activity:', activity.imageUrl);
        console.log('🖼️ Form imageUrl set to:', activity.imageUrl || '');

        // Fill time slots - handle MongoDB data structure
        console.log('🕐 Raw time slots from activity:', activity.timeSlots);
        
        // Default time slots structure
        const defaultTimeSlots: TimeSlot[] = [
          { id: '1', name: 'Buổi Sáng', startTime: '07:00', endTime: '11:30', isActive: true, activities: '', detailedLocation: '' },
          { id: '2', name: 'Buổi Chiều', startTime: '12:30', endTime: '17:00', isActive: false, activities: '', detailedLocation: '' },
          { id: '3', name: 'Buổi Tối', startTime: '17:00', endTime: '22:00', isActive: false, activities: '', detailedLocation: '' }
        ];
        
        if (activity.timeSlots && activity.timeSlots.length > 0) {
          // Map slot names to indices
          const slotNameMap: { [key: string]: number } = {
            'Buổi Sáng': 0,
            'Buổi Chiều': 1,
            'Buổi Tối': 2
          };
          
          // Start with default slots
          const formattedTimeSlots: TimeSlot[] = [...defaultTimeSlots];
          
          // Update with data from activity
          activity.timeSlots
            .filter((slot: any) => slot != null && slot.name) // Filter out null/undefined slots
            .forEach((slot: any) => {
              const slotIndex = slotNameMap[slot.name];
              if (slotIndex !== undefined && slotIndex >= 0 && slotIndex < 3) {
                formattedTimeSlots[slotIndex] = {
                  id: slot.id || formattedTimeSlots[slotIndex].id,
                  name: slot.name || formattedTimeSlots[slotIndex].name,
                  startTime: slot.startTime || formattedTimeSlots[slotIndex].startTime,
                  endTime: slot.endTime || formattedTimeSlots[slotIndex].endTime,
                  isActive: slot.isActive !== undefined ? slot.isActive : formattedTimeSlots[slotIndex].isActive,
                  activities: slot.activities || formattedTimeSlots[slotIndex].activities,
                  detailedLocation: slot.detailedLocation || formattedTimeSlots[slotIndex].detailedLocation
                };
              }
            });
          
          // Ensure all 3 slots exist and are valid
          const finalTimeSlots = formattedTimeSlots.map((slot, index) => ({
            id: slot?.id || `${index + 1}`,
            name: slot?.name || defaultTimeSlots[index].name,
            startTime: slot?.startTime || defaultTimeSlots[index].startTime,
            endTime: slot?.endTime || defaultTimeSlots[index].endTime,
            isActive: slot?.isActive !== undefined ? slot.isActive : defaultTimeSlots[index].isActive,
            activities: slot?.activities || '',
            detailedLocation: slot?.detailedLocation || ''
          }));
          
          setTimeSlots(finalTimeSlots);
          console.log('🕐 Formatted time slots set:', finalTimeSlots);
        } else {
          // If no time slots, use default ones
          setTimeSlots(defaultTimeSlots);
          console.log('🕐 Default time slots set:', defaultTimeSlots);
        }

        // Fill participants - handle MongoDB data structure
        if (activity.participants && activity.participants.length > 0) {
          const formattedParticipants = activity.participants.map((participant: any, index: number) => ({
            // Ensure unique ID - use existing _id, or fallback to index-based unique id
            id: participant._id || `participant-${index}-${Date.now()}`,
            userId: participant.userId?._id || participant.userId || '',
            name: participant.name || '',
            email: participant.email || '',
            role: participant.role || 'Người Tham Gia',
            phone: participant.phone || ''
          }));
          setParticipants(formattedParticipants);
          console.log('Participants set:', formattedParticipants);
        } else {
          // If no participants, start with empty array
          setParticipants([]);
          console.log('No participants found, set empty array');
        }

        // Fill location data - handle MongoDB data structure
        console.log('📍 Raw location data from activity:', activity.locationData);
        console.log('📍 Raw location field from activity:', activity.location);
        if (activity.locationData) {
          const locationData = {
            lat: activity.locationData.lat || 0,
            lng: activity.locationData.lng || 0,
            address: activity.locationData.address || activity.location || '',
            radius: activity.locationData.radius || 100
          };
          setLocationData(locationData);
          console.log('📍 Location data set:', locationData);
        } else if (activity.location) {
          const locationData = {
            lat: 0,
            lng: 0,
            address: activity.location,
            radius: 100
          };
          setLocationData(locationData);
          console.log('📍 Location data set from location field:', locationData);
        } else {
          console.log('📍 No location data found');
        }

        // Fill multi-time locations
        console.log('📍 Raw multiTimeLocations from activity:', activity.multiTimeLocations);
        
        // Check if this is a multi-time location activity
        const isMultiTimeMode = activity.location === 'Nhiều địa điểm' || 
                               (activity.multiTimeLocations && activity.multiTimeLocations.length > 0);
        console.log('📍 Is multi-time mode:', isMultiTimeMode);
        
        if (isMultiTimeMode) {
          setUseMultiTimeLocation(true);
          if (activity.multiTimeLocations && activity.multiTimeLocations.length > 0) {
            // Ensure each location has a unique ID
            const locationsWithUniqueIds = activity.multiTimeLocations.map((loc: any, index: number) => ({
              ...loc,
              id: loc.id || `location-${loc.timeSlot || 'unknown'}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }));
            setMultiTimeLocations(locationsWithUniqueIds);
            console.log('📍 MultiTimeLocations set with unique IDs:', locationsWithUniqueIds);
          }
          console.log('📍 Set useMultiTimeLocation to true');
        } else {
          console.log('📍 Single location mode');
        }

        // Set image preview if exists
        if (activity.imageUrl) {
          setImagePreview(activity.imageUrl);
          console.log('Image preview set:', activity.imageUrl);
        } else {
          console.log('No image URL found');
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

  // Load responsible persons on component mount (only when user is authenticated)
  useEffect(() => {
    const loadResponsiblePersons = async () => {
      const token = localStorage.getItem('token');
      if (!token || !user) {
        console.warn('Không tìm thấy token hoặc user, bỏ qua loadResponsiblePersons');
        return;
      }

      setLoadingResponsiblePersons(true);
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };
        
        const response = await fetch('/api/users/responsible-persons', {
          method: 'GET',
          headers,
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.responsiblePersons && Array.isArray(data.responsiblePersons)) {
            setResponsiblePersons(data.responsiblePersons);
          } else {
            console.warn('⚠️ Invalid data format for responsible persons:', data);
            setResponsiblePersons([]);
          }
        } else {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          try {
            const errorData = await response.json();
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (Object.keys(errorData).length > 0) {
              errorMessage = JSON.stringify(errorData);
            }
          } catch (e) {
            // If JSON parsing fails, use default message
          }
          console.warn('⚠️ Failed to load responsible persons:', errorMessage);
          setResponsiblePersons([]);
        }
      } catch (error) {
        console.warn('⚠️ Error loading responsible persons:', error instanceof Error ? error.message : 'Unknown error');
        setResponsiblePersons([]);
      } finally {
        setLoadingResponsiblePersons(false);
      }
    };

    loadResponsiblePersons();
  }, [user]);

  // Auto-load club students on component mount (only when user is authenticated)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && user) {
      fetchClubStudents();
    }
  }, [user]);

  // Check if desktop
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Load sidebar state from localStorage on component mount
  useEffect(() => {
    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState !== null) {
      setIsSidebarOpen(savedSidebarState === 'true');
    }

    // Listen for sidebar state changes via custom event
    const handleSidebarChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen: boolean }>;
      if (customEvent.detail) {
        setIsSidebarOpen(customEvent.detail.isOpen);
      }
    };

    window.addEventListener('sidebarStateChange', handleSidebarChange);
    
    // Also check localStorage periodically as fallback
    const checkSidebarState = () => {
      const currentSidebarState = localStorage.getItem('sidebarOpen');
      if (currentSidebarState !== null) {
        const newState = currentSidebarState === 'true';
        setIsSidebarOpen(prev => {
          if (prev !== newState) {
            return newState;
          }
          return prev;
        });
      }
    };
    
    checkSidebarState();
    const intervalId = setInterval(checkSidebarState, 100);

    return () => {
      window.removeEventListener('sidebarStateChange', handleSidebarChange);
      clearInterval(intervalId);
    };
  }, []);

  const roles = [
    'Trưởng Nhóm',
    'Phó Trưởng Nhóm', 
    'Thành Viên Ban Tổ Chức',
    'Người Tham Gia',
    'Người Giám Sát'
  ];

  // Function to fetch club students from API
  const fetchClubStudents = async (page: number = 1) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Không tìm thấy token xác thực, bỏ qua fetchClubStudents');
      return;
    }

    setLoading(true);
    try {

      // Get users with CLUB_STUDENT and CLUB_MEMBER roles with pagination
      const params = new URLSearchParams({
        page: page.toString(),
        limit: studentsPerPage.toString(),
        sortBy: 'name',
        sortOrder: 'asc'
      });
      
      // Add multiple role parameters
      params.append('role', 'CLUB_STUDENT');
      params.append('role', 'CLUB_MEMBER');

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Lỗi khi tải danh sách thành viên CLB');
      }

      const data = await response.json();
      if (data.success && data.data.users) {
        // Filter to ensure we only get CLUB_STUDENT and CLUB_MEMBER users
        const clubUsersOnly = data.data.users.filter((user: any) => 
          user.role === 'CLUB_STUDENT' || user.role === 'CLUB_MEMBER'
        );
        setClubStudents(clubUsersOnly);
        setCurrentPage(page);
        setTotalPages(data.data.pagination.totalPages);
        setTotalCount(data.data.pagination.totalCount);
        console.log('📋 Found club users (students + members):', clubUsersOnly.length, 'of', data.data.pagination.totalCount);
      } else {
        setClubStudents([]);
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Error fetching club students:', error);
      alert('Lỗi khi tải danh sách thành viên CLB');
      setClubStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle search
  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page when searching
    fetchClubStudents(1);
  };

  // Function to handle page change
  const handlePageChange = (page: number) => {
    fetchClubStudents(page);
  };

  // Function to add club student to participants
  const handleAddClubStudent = (student: any) => {
    // Check if student is already in participants
    const isAlreadyAdded = participants.some(p => p.userId === student._id);
    if (isAlreadyAdded) {
      alert('Thành viên này đã được thêm vào danh sách tham gia');
      return;
    }

    const newParticipant: Participant = {
      id: Date.now().toString(),
      userId: student._id,
      name: student.name,
      email: student.email,
      role: 'Người Tham Gia' as ParticipantRole // Mặc định vai trò
    };

    setParticipants(prev => [...prev, newParticipant]);
    alert(`Đã thêm ${student.name} vào danh sách tham gia`);
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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header */}
            <div className="mb-6">
               <div className="text-center mb-4">
                 <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${isDarkMode ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30' : 'bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200'}`}>
                  <span className="text-xl">📅</span>
                </div>
                 <h1 className={`text-2xl font-bold mb-2 bg-gradient-to-r ${isDarkMode ? 'from-blue-400 to-purple-400' : 'from-blue-600 to-purple-600'} bg-clip-text text-transparent`}>
                    {isEditMode ? 'Chỉnh Sửa Hoạt Động' : 'Tạo Hoạt Động 1 Ngày'}
                  </h1>
                 <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} max-w-xl mx-auto`}>
                   {isEditMode ? 'Chỉnh sửa thông tin hoạt động' : 'Tạo hoạt động diễn ra trong một ngày duy nhất'}
                  </p>
              </div>
            </div>

            {/* Error Display */}
            {submitError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{submitError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 1. Ảnh mô tả hoạt động */}
              <div className={`p-5 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-gray-700/50' : 'bg-gradient-to-br from-white/90 to-blue-50/50 backdrop-blur-xl border border-gray-200/50'} shadow-lg hover:shadow-xl transition-all duration-300`}>
              
              {/* Header với icon đẹp */}
              <div className="flex items-center mb-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${isDarkMode ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/20' : 'bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200'}`}>
                  <span className="text-lg">🖼️</span>
                </div>
                <div>
                  <h2 className={`text-lg font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    1. Ảnh mô tả hoạt động
                  </h2>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Chọn ảnh đại diện cho hoạt động
                  </p>
                </div>
              </div>

              {/* Main Content Area - Một khung duy nhất */}
              <div className={`relative overflow-hidden rounded-2xl ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-gray-700/50 to-gray-800/50 border border-gray-600/50' 
                  : 'bg-gradient-to-br from-white/80 to-gray-50/50 border border-gray-200/50'
              } shadow-lg transition-all duration-500`}>
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer ${selectedImage ? 'z-0' : 'z-10'}`}
                />

                {/* Trạng thái CHƯA có ảnh */}
                {!selectedImage && !form.imageUrl && (
                  <div className="p-8 text-center">
                    <div className="space-y-4">
                      {/* Icon trung tâm */}
                      <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${
                        isDarkMode 
                          ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/30' 
                          : 'bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-200'
                      }`}>
                        <span className="text-2xl">📷</span>
                      </div>
                      
                      {/* Tiêu đề mời gọi */}
                      <div className="space-y-2">
                        <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Tải ảnh mô tả hoạt động
                        </h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Kéo & thả ảnh vào đây hoặc click để chọn file
                        </p>
                      </div>
                      
                      {/* Thông tin hỗ trợ */}
                      <div className={`p-3 rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-600/30 border border-gray-500/30' 
                          : 'bg-gray-100/50 border border-gray-200/50'
                      }`}>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className="font-semibold">Hỗ trợ:</span> JPG, PNG, GIF • <span className="font-semibold">Tối đa:</span> 10MB
                        </p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'} font-medium`}>
                          ✨ Ảnh sẽ được tải lên khi tạo hoạt động
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trạng thái ĐÃ có ảnh */}
                {(selectedImage || form.imageUrl) && (
                  <div className="relative">
                    {/* Debug info */}
                    {(() => { console.log('🖼️ Render check - selectedImage:', selectedImage, 'form.imageUrl:', form.imageUrl, 'imagePreview:', imagePreview); return null; })()}
                    {/* Ảnh Preview */}
                    {(imagePreview || form.imageUrl) && (
                      <div className="relative">
                        <img 
                          src={imagePreview || form.imageUrl} 
                          alt="Preview" 
                          className="w-full h-64 object-cover"
                        />
                        
                        {/* Overlay gradient cho text dễ đọc */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>
                        
                        {/* Thông tin file (Overlay) */}
                        <div className="absolute bottom-4 left-4 text-white">
                          <div className={`px-3 py-2 rounded-lg ${
                            isDarkMode ? 'bg-black/80 backdrop-blur-sm border border-white/20' : 'bg-white/90 backdrop-blur-sm border border-gray-200/50'
                          }`}>
                            <p className={`text-sm font-semibold ${isDarkMode ? 'text-yellow-300' : 'text-blue-700'}`}>
                              {selectedImage ? selectedImage.name : 'Ảnh hiện tại'}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-yellow-200' : 'text-blue-600'}`}>
                              {selectedImage ? `${(selectedImage.size / 1024 / 1024).toFixed(2)} MB` : 'Ảnh từ database'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Nút hành động (Overlay) */}
                        <div className="absolute top-4 right-4 flex space-x-2 z-50">
                          {/* Nút "Đổi ảnh" */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // Trigger file input click
                              const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                              if (fileInput) {
                                fileInput.click();
                              }
                            }}
                            className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 cursor-pointer z-50 ${
                              isDarkMode ? 'bg-black/60 backdrop-blur-sm hover:bg-blue-500/80' : 'bg-white/80 backdrop-blur-sm hover:bg-blue-500/80'
                            }`}
                            style={{ position: 'relative', zIndex: 50 }}
                            title="Đổi ảnh"
                          >
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                          </button>
                          
                          {/* Nút "Xóa ảnh" */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemoveImage();
                            }}
                            className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 cursor-pointer z-50 ${
                              isDarkMode ? 'bg-black/60 backdrop-blur-sm hover:bg-red-500/80' : 'bg-white/80 backdrop-blur-sm hover:bg-red-500/80'
                            }`}
                            style={{ position: 'relative', zIndex: 50 }}
                            title="Xóa ảnh"
                          >
                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Status indicator bên dưới ảnh */}
                    <div className={`p-4 ${
                      isDarkMode 
                        ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-t border-green-500/30' 
                        : 'bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200'
                    }`}>
                      <div className="flex items-center justify-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                        }`}>
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                          Ảnh sẽ được tải lên khi tạo hoạt động
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

              {/* 2. Thông tin cơ bản */}
              <div className={`p-5 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-gray-700/50' : 'bg-gradient-to-br from-white/90 to-blue-50/50 backdrop-blur-xl border border-gray-200/50'} shadow-lg hover:shadow-xl transition-all duration-300`}>
                
                {/* Header */}
                <div className="flex items-center mb-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'}`}>
                    <span className="text-lg text-white">📋</span>
                    </div>
                    <div>
                    <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      2. Thông tin cơ bản
                      </h2>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Điền đầy đủ thông tin cần thiết
                      </p>
                  </div>
                </div>

                {/* Form Grid */}
                <div className="space-y-4">
                  {/* Row 1: Tên hoạt động và Ngày diễn ra */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Tên hoạt động */}
                    <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/50 border border-gray-600/50' : 'bg-white/80 border border-gray-200/50'} backdrop-blur-sm`}>
                      <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className="text-blue-500 mr-1">📝</span>
                        Tên hoạt động *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        className={`w-full px-3 py-2.5 rounded-lg border text-base ${
                          isDarkMode 
                            ? 'bg-gray-600/50 border-gray-500/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                            : 'bg-white/90 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'
                        } focus:outline-none transition-all duration-300 backdrop-blur-sm`}
                        placeholder="Nhập tên hoạt động..."
                      />
                    </div>

                    {/* Ngày diễn ra */}
                    <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/50 border border-gray-600/50' : 'bg-white/80 border border-gray-200/50'} backdrop-blur-sm`}>
                      <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className="text-green-500 mr-1">📅</span>
                        Ngày diễn ra *
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={form.date}
                        onChange={handleChange}
                        required
                        min={getTodayDate()}
                        className={`w-full px-3 py-2.5 rounded-lg border text-base ${
                          isDarkMode 
                            ? 'bg-gray-600/50 border-gray-500/50 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20' 
                            : 'bg-white/90 border-gray-300/50 text-gray-900 focus:border-green-400 focus:ring-2 focus:ring-green-500/20'
                        } focus:outline-none transition-all duration-300 backdrop-blur-sm`}
                      />
                      <p className={`mt-1.5 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        💡 Có thể chọn ngày hôm nay hoặc tương lai
                      </p>
                    </div>
                  </div>

                  {/* Row 2: Loại hoạt động và Số lượng tối đa */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Loại hoạt động */}
                    <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/50 border border-gray-600/50' : 'bg-white/80 border border-gray-200/50'} backdrop-blur-sm`}>
                      <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className="text-purple-500 mr-1">🌐</span>
                        Loại hoạt động *
                    </label>
                    <select
                      name="visibility"
                      value={form.visibility}
                      onChange={handleChange}
                      required
                        className={`w-full px-3 py-2.5 rounded-lg border text-base ${
                        isDarkMode 
                            ? 'bg-gray-600/50 border-gray-500/50 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20' 
                            : 'bg-white/90 border-gray-300/50 text-gray-900 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20'
                        } focus:outline-none transition-all duration-300 backdrop-blur-sm`}
                      >
                        <option value="public">🌍 Public - Tất cả đều xem được</option>
                        <option value="private">🔒 Private - Chỉ thành viên CLB</option>
                    </select>
                      <div className={`mt-2 p-2 rounded-lg ${
                        form.visibility === 'public' 
                          ? isDarkMode ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50/80 border border-green-200/50'
                          : isDarkMode ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50/80 border border-blue-200/50'
                      }`}>
                        <div className="flex items-center">
                          <span className={`text-sm mr-2 ${form.visibility === 'public' ? 'text-green-500' : 'text-blue-500'}`}>
                            {form.visibility === 'public' ? '🌍' : '🔒'}
                          </span>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {form.visibility === 'public' 
                        ? 'Tất cả người dùng đều có thể xem hoạt động này'
                              : 'Chỉ thành viên CLB mới có thể xem hoạt động này'
                      }
                    </p>
                  </div>
                      </div>
                    </div>

                    {/* Số lượng tối đa */}
                    <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/50 border border-gray-600/50' : 'bg-white/80 border border-gray-200/50'} backdrop-blur-sm`}>
                      <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className="text-pink-500 mr-1">👥</span>
                        Số lượng tối đa
                      </label>
                      <input
                        type="number"
                        name="maxParticipants"
                        value={form.maxParticipants}
                        onChange={handleChange}
                        min="1"
                        max="1000"
                        className={`w-full px-3 py-2.5 rounded-lg border text-base ${
                          isDarkMode 
                            ? 'bg-gray-600/50 border-gray-500/50 text-white placeholder-gray-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20' 
                            : 'bg-white/90 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-pink-400 focus:ring-2 focus:ring-pink-500/20'
                        } focus:outline-none transition-all duration-300 backdrop-blur-sm`}
                        placeholder="Nhập số lượng tối đa..."
                      />
                    </div>
                  </div>

                  {/* Row 3: Người phụ trách */}
                  <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/50 border border-gray-600/50' : 'bg-white/80 border border-gray-200/50'} backdrop-blur-sm`}>
                    <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="text-orange-500 mr-1">👤</span>
                      Người phụ trách *
                     </label>
                    <select
                      name="responsiblePerson"
                      value={form.responsiblePerson}
                      onChange={handleChange}
                      required
                      className={`w-full px-3 py-2.5 rounded-lg border text-base ${
                        isDarkMode 
                          ? 'bg-gray-600/50 border-gray-500/50 text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20' 
                          : 'bg-white/90 border-gray-300/50 text-gray-900 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20'
                      } focus:outline-none transition-all duration-300 backdrop-blur-sm`}
                    >
                      <option value="">Chọn người phụ trách...</option>
                       {loadingResponsiblePersons ? (
                        <option value="" disabled>⏳ Đang tải danh sách...</option>
                       ) : responsiblePersons.length === 0 ? (
                        <option value="" disabled>❌ Không có người phụ trách nào</option>
                       ) : (
                         responsiblePersons.map((person, index) => (
                           <option key={person._id || `person-${index}-${person.name || 'unknown'}`} value={person._id}>
                            {person.name} ({getRoleDisplayName(person.role)}) - {getStatusDisplayName(person.status)}
                           </option>
                         ))
                       )}
                    </select>
                    
                    {/* Selected person details */}
                    {form.responsiblePerson && (
                      <div className="mt-3">
                        {(() => {
                          const selectedPerson = responsiblePersons.find(p => p._id === form.responsiblePerson);
                          if (!selectedPerson) return null;
                          
                          return (
                            <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-orange-900/20 border-orange-500/30' : 'bg-orange-50/80 border-orange-200/50'} backdrop-blur-sm`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                                    <span className="text-base font-bold text-orange-600">
                                      {selectedPerson.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                  <div>
                                    <p className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {selectedPerson.name}
                                    </p>
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                      {getRoleDisplayName(selectedPerson.role)}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    selectedPerson.status === 'active' 
                                      ? isDarkMode ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'bg-green-100 text-green-800'
                                      : selectedPerson.status === 'inactive'
                                      ? isDarkMode ? 'bg-gray-700/50 text-gray-400 border border-gray-600/50' : 'bg-gray-100 text-gray-800'
                                      : selectedPerson.status === 'suspended'
                                      ? isDarkMode ? 'bg-red-900/30 text-red-400 border border-red-500/30' : 'bg-red-100 text-red-800'
                                      : isDarkMode ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                      selectedPerson.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                                    }`}></span>
                                    {getStatusDisplayName(selectedPerson.status)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Mô tả hoạt động */}
                  <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/50 border border-gray-600/50' : 'bg-white/80 border border-gray-200/50'} backdrop-blur-sm`}>
                    <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="text-pink-500 mr-1">📝</span>
                      Mô tả hoạt động *
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      required
                      rows={4}
                      className={`w-full px-3 py-2.5 rounded-lg border text-base ${
                        isDarkMode 
                          ? 'bg-gray-600/50 border-gray-500/50 text-white placeholder-gray-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20' 
                          : 'bg-white/90 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-pink-400 focus:ring-2 focus:ring-pink-500/20'
                      } focus:outline-none transition-all duration-300 backdrop-blur-sm resize-none`}
                      placeholder="Mô tả chi tiết về hoạt động..."
                    />
                  </div>
                </div>
              </div>

              {/* 3. Các buổi */}
              <div className={`p-5 rounded-2xl ${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm border border-gray-700/50' : 'bg-white/80 backdrop-blur-sm border border-gray-200/50'} shadow-lg hover:shadow-xl transition-all duration-300`}>
                <div className="flex items-center mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${isDarkMode ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20' : 'bg-gradient-to-r from-blue-100 to-purple-100'}`}>
                    <span className="text-lg">🕐</span>
                  </div>
                  <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    3. Các buổi (Sáng, Chiều, Tối)
                  </h2>
                </div>
                
                {/* Time slots overview */}
                <div className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50/80 border border-blue-200/50'} backdrop-blur-sm`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className={`font-semibold text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                      Hướng dẫn quản lý thời gian
                    </h3>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                    Chọn các buổi bạn muốn tổ chức hoạt động và thiết lập thời gian cụ thể cho từng buổi. 
                    Chỉ những buổi được kích hoạt mới được tính vào lịch trình hoạt động.
                  </p>
                </div>


                
                {/* Horizontal Layout for Time Slots */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {(() => { console.log('🕐 Rendering time slots:', timeSlots); return null; })()}
                  {timeSlots.filter((slot): slot is TimeSlot => slot != null && slot.id != null).map((slot, index) => {
                    const isActive = slot.isActive ?? false;
                    // Ensure unique key even if slot.id might be duplicated
                    const uniqueKey = slot.id || `slot-${index}-${Date.now()}`;
                    return (
                    <div key={uniqueKey} className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                      isActive
                        ? isDarkMode 
                          ? 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-500/50 shadow-md' 
                          : 'bg-gradient-to-br from-blue-50/80 to-purple-50/80 border-blue-400/50 shadow-md'
                        : isDarkMode 
                          ? 'bg-gray-700/30 border-gray-600/50 hover:border-gray-500/50' 
                          : 'bg-gray-50/60 border-gray-200/50 hover:border-gray-300/50'
                    } backdrop-blur-sm hover:shadow-lg`}>
                      
                      {/* Active indicator */}
                      {isActive && (
                        <div className={`absolute top-0 right-0 w-0 h-0 border-l-[24px] border-l-transparent border-t-[24px] ${
                          isDarkMode ? 'border-t-green-500' : 'border-t-green-400'
                        }`}>
                          <div className="absolute -top-5 -right-1">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                      
                      <div className="p-4">
                        {/* Header with icon and name */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isActive
                                ? isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                                : isDarkMode ? 'bg-gray-600/50' : 'bg-gray-200/50'
                            } transition-all duration-300`}>
                              <span className={`text-lg ${
                                isActive 
                                  ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                  : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                {index === 0 ? '🌅' : index === 1 ? '☀️' : '🌙'}
                              </span>
                            </div>
                            <div>
                              <h3 className={`font-bold text-base ${
                                isActive 
                                  ? isDarkMode ? 'text-white' : 'text-gray-900'
                                  : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                              } transition-all duration-300`}>
                                {slot.name}
                              </h3>
                              <p className={`text-xs ${
                                isActive 
                                  ? isDarkMode ? 'text-blue-300' : 'text-blue-600'
                                  : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                {isActive ? 'Đang hoạt động' : 'Chưa kích hoạt'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Toggle switch */}
                          <div className="flex items-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => handleTimeSlotChange(slot.id, 'isActive', e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
                                isActive 
                                  ? 'bg-blue-500 peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800' 
                                  : 'bg-gray-300 peer-focus:ring-2 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-800'
                              } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600`}>
                              </div>
                            </label>
                          </div>
                        </div>
                        
                        {/* Time inputs - Compact layout */}
                        <div className="space-y-2">
                          <div>
                            <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Thời gian bắt đầu
                            </label>
                            <input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => handleTimeSlotChange(slot.id, 'startTime', e.target.value)}
                              className={`w-full px-2.5 py-2 rounded-lg border text-sm ${
                                isDarkMode 
                                  ? 'bg-gray-600/50 border-gray-500/50 text-white focus:border-blue-500' 
                                  : 'bg-white/90 border-gray-300/50 text-gray-900 focus:border-blue-400'
                              } focus:outline-none transition-all duration-300`}
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Thời gian kết thúc
                            </label>
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => handleTimeSlotChange(slot.id, 'endTime', e.target.value)}
                              className={`w-full px-2.5 py-2 rounded-lg border text-sm ${
                                isDarkMode 
                                  ? 'bg-gray-600/50 border-gray-500/50 text-white focus:border-blue-500' 
                                  : 'bg-white/90 border-gray-300/50 text-gray-900 focus:border-blue-400'
                              } focus:outline-none transition-all duration-300`}
                            />
                          </div>
                        </div>
                        
                        {/* Activities description - Compact */}
                        <div className="mt-3">
                          <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Mô tả hoạt động
                          </label>
                          <textarea
                            value={slot.activities}
                            onChange={(e) => handleTimeSlotChange(slot.id, 'activities', e.target.value)}
                            rows={2}
                            className={`w-full px-2.5 py-2 rounded-lg border resize-none text-sm ${
                              isDarkMode 
                                ? 'bg-gray-600/50 border-gray-500/50 text-white focus:border-blue-500' 
                                : 'bg-white/90 border-gray-300/50 text-gray-900 focus:border-blue-400'
                            } focus:outline-none transition-all duration-300`}
                            placeholder="Mô tả hoạt động..."
                          />
                        </div>

                        {/* Detailed Location - Compact - Show ONLY for multi-time */}
                        {useMultiTimeLocation && (
                          <div className="mt-4">
                            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Địa điểm chi tiết cho {slot.name}
                            </label>
                            <input
                              type="text"
                              value={slot.detailedLocation}
                              onChange={(e) => handleTimeSlotChange(slot.id, 'detailedLocation', e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border ${
                                isDarkMode 
                                  ? 'bg-gray-600/50 border-gray-500/50 text-white focus:border-blue-500' 
                                  : 'bg-white/90 border-gray-300/50 text-gray-900 focus:border-blue-400'
                              } focus:outline-none transition-all duration-300`}
                              placeholder="VD: Dãy A1, Phòng 101, Sân trường..."
                            />
                          </div>
                        )}

                        {/* Integrated Location Picker for Multi-time */}
                        {isActive && useMultiTimeLocation && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                            {/* Time slot mapping */}
                            {(() => {
                              const timeSlotMap: { [key: string]: 'morning' | 'afternoon' | 'evening' } = {
                                'Buổi Sáng': 'morning',
                                'Buổi Chiều': 'afternoon', 
                                'Buổi Tối': 'evening'
                              };
                              const currentTimeSlot = timeSlotMap[slot.name];
                              const isSelected = selectedTimeSlotForLocation === currentTimeSlot;
                              const hasLocation = multiTimeLocations.find(loc => loc.timeSlot === currentTimeSlot);
                              
                              return (
                                <div className="space-y-3">
                                  {/* Enhanced Status indicator */}
                                  <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                                    hasLocation 
                                      ? isDarkMode ? 'bg-gradient-to-r from-green-900/20 to-green-800/20 border-green-500/50 shadow-lg' : 'bg-gradient-to-r from-green-50/90 to-green-100/90 border-green-400/50 shadow-lg'
                                      : isSelected
                                      ? isDarkMode ? 'bg-gradient-to-r from-blue-900/20 to-blue-800/20 border-blue-500/50 shadow-lg' : 'bg-gradient-to-r from-blue-50/90 to-blue-100/90 border-blue-400/50 shadow-lg'
                                      : isDarkMode ? 'bg-gradient-to-r from-gray-700/30 to-gray-600/30 border-gray-600/50' : 'bg-gradient-to-r from-gray-50/80 to-gray-100/80 border-gray-300/50'
                                  } hover:shadow-xl`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                          hasLocation 
                                            ? isDarkMode ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-100 border border-green-300'
                                            : isSelected
                                            ? isDarkMode ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-100 border border-blue-300'
                                            : isDarkMode ? 'bg-gray-600/50 border border-gray-500/50' : 'bg-gray-200 border border-gray-300'
                                        }`}>
                                          <span className={`text-lg ${
                                            hasLocation ? 'text-green-500' : isSelected ? 'text-blue-500' : 'text-gray-400'
                                          }`}>
                                        {hasLocation ? '✅' : isSelected ? '🎯' : '📍'}
                                      </span>
                                        </div>
                                        <div>
                                          <div className={`text-sm font-bold ${
                                        hasLocation ? (isDarkMode ? 'text-green-300' : 'text-green-700') 
                                        : isSelected ? (isDarkMode ? 'text-blue-300' : 'text-blue-700')
                                        : (isDarkMode ? 'text-gray-400' : 'text-gray-600')
                                      }`}>
                                        {hasLocation ? 'Đã chọn địa điểm' : isSelected ? 'Đang chọn địa điểm...' : 'Chưa chọn địa điểm'}
                                          </div>
                                          <div className={`text-xs ${
                                            hasLocation ? (isDarkMode ? 'text-green-400' : 'text-green-600') 
                                            : isSelected ? (isDarkMode ? 'text-blue-400' : 'text-blue-600')
                                            : (isDarkMode ? 'text-gray-500' : 'text-gray-500')
                                          }`}>
                                            {hasLocation ? 'Sẵn sàng cho hoạt động' : isSelected ? 'Đang thiết lập...' : 'Cần chọn địa điểm'}
                                          </div>
                                        </div>
                                    </div>
                                    {hasLocation && (
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                          isDarkMode ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-300'
                                        }`}>
                                          📏 {hasLocation.radius}m
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action buttons */}
                                  <div className="flex space-x-2">
                                    {!hasLocation ? (
                                      <button
                                        type="button"
                                        onClick={() => handleTimeSlotLocationSelect(currentTimeSlot)}
                                        className={`flex-1 px-3 py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                                          isSelected
                                            ? isDarkMode 
                                              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                                            : isDarkMode 
                                              ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                                              : 'bg-gray-500 hover:bg-gray-600 text-white'
                                        } hover:scale-105`}
                                      >
                                        <span className="text-sm">📍</span>
                                        <span className="text-sm">
                                          {isSelected ? 'Đang chọn...' : 'Chọn địa điểm'}
                                        </span>
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleTimeSlotLocationSelect(currentTimeSlot)}
                                          className="flex-1 px-3 py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white hover:scale-105"
                                        >
                                          <span className="text-sm">✏️</span>
                                          <span className="text-sm">Sửa địa điểm</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMultiTimeLocations(prev => prev.filter(loc => loc.timeSlot !== currentTimeSlot));
                                          }}
                                          className="px-3 py-2 rounded-lg font-medium transition-all duration-300 bg-red-500 hover:bg-red-600 text-white hover:scale-105"
                                          title="Xóa địa điểm"
                                        >
                                          🗑️
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  {/* Enhanced Location info */}
                                  {hasLocation && (
                                    <div className={`p-4 rounded-xl border-2 ${
                                      isDarkMode ? 'bg-gray-800/50 border-gray-600/50' : 'bg-white/80 border-gray-200/50'
                                    } shadow-lg hover:shadow-xl transition-all duration-300`}>
                                      <div className="space-y-3">
                                        {/* Location Header */}
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-2">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                              isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                                            }`}>
                                              <span className="text-sm">📍</span>
                                    </div>
                                            <span className={`text-sm font-semibold ${
                                              isDarkMode ? 'text-green-300' : 'text-green-700'
                                            }`}>
                                              Địa điểm đã chọn
                                            </span>
                                </div>
                                          <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                                            isDarkMode ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-200'
                                          }`}>
                                            {hasLocation.radius}m
                          </div>
                      </div>
                                        
                                        {/* Address */}
                                        <div className={`p-3 rounded-lg ${
                                          isDarkMode ? 'bg-gray-700/50 border border-gray-600/50' : 'bg-gray-50/80 border border-gray-200/50'
                                        }`}>
                                          <div className="flex items-start space-x-2">
                                            <span className="text-blue-500 mt-0.5">🏠</span>
                                            <div className="flex-1">
                                              <div className={`text-xs font-medium ${
                                                isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                              }`}>
                                                Địa chỉ:
                    </div>
                                              <div className={`text-xs leading-relaxed ${
                                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                              }`}>
                                                {hasLocation.location.address}
                </div>
                        </div>
                        </div>
                      </div>
                      
                                        {/* Coordinates */}
                                        <div className={`p-3 rounded-lg ${
                                          isDarkMode ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50/80 border border-blue-200/50'
                                        }`}>
                                          <div className="flex items-start space-x-2">
                                            <span className="text-purple-500 mt-0.5">🎯</span>
                                            <div className="flex-1">
                                              <div className={`text-xs font-medium ${
                                                isDarkMode ? 'text-blue-300' : 'text-blue-700'
                                              }`}>
                                                Tọa độ:
                    </div>
                                              <div className={`text-xs font-mono ${
                                                isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                              }`}>
                                                {hasLocation.location.lat.toFixed(6)}, {hasLocation.location.lng.toFixed(6)}
                              </div>
                                </div>
                              </div>
                            </div>
                            
                                        {/* Detailed Location Input for Multi-time ONLY */}
                                        {useMultiTimeLocation && (
                                          <div className={`p-3 rounded-lg ${
                                            isDarkMode ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-purple-50/80 border border-purple-200/50'
                                          }`}>
                                            <div className="space-y-2">
                                              <div className="flex items-center space-x-2">
                                                <span className="text-purple-500">📋</span>
                                                <span className={`text-xs font-medium ${
                                                  isDarkMode ? 'text-purple-300' : 'text-purple-700'
                                                }`}>
                                                  Địa điểm chi tiết cho {slot.name}:
                                                </span>
                                              </div>
                                              <input
                                                type="text"
                                                value={slot.detailedLocation || ''}
                                                onChange={(e) => handleTimeSlotChange(slot.id, 'detailedLocation', e.target.value)}
                                                placeholder={`VD: Phòng ${index === 0 ? 'A101' : index === 1 ? 'B201' : 'C301'}, Dãy ${index === 0 ? 'A' : index === 1 ? 'B' : 'C'}...`}
                                                className={`w-full px-3 py-2 rounded-lg border text-xs transition-all duration-300 ${
                                                  isDarkMode 
                                                    ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20' 
                                                    : 'bg-white/90 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20'
                                                } focus:outline-none backdrop-blur-sm`}
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                              </div>
                            )}
                          </div>
                        );
                            })()}
                          </div>
                        )}

                        {/* Single Location Status for Single Location Mode */}
                        {isActive && !useMultiTimeLocation && locationData && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <div className="space-y-3">
                              {/* Enhanced Status indicator for single location */}
                              <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                                isDarkMode ? 'bg-gradient-to-r from-green-900/20 to-green-800/20 border-green-500/50 shadow-lg' : 'bg-gradient-to-r from-green-50/90 to-green-100/90 border-green-400/50 shadow-lg'
                              } hover:shadow-xl`}>


                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                      isDarkMode ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-100 border border-green-300'
                                    }`}>
                                      <span className="text-lg text-green-500">✅</span>
                                    </div>
                                    <div>
                                      <div className={`text-sm font-bold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                                        Sử dụng địa điểm chung
                                      </div>
                                      <div className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                        Áp dụng cho tất cả các buổi
                                      </div>
                                    </div>
                                  </div>
                                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    isDarkMode ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-300'
                                  }`}>
                                    📏 {locationData.radius}m
                                  </div>
                                </div>
                              </div>

                              {/* Single Location Info */}
                              <div className={`p-4 rounded-xl border-2 ${
                                isDarkMode ? 'bg-gray-800/50 border-gray-600/50' : 'bg-white/80 border-gray-200/50'
                              } shadow-lg hover:shadow-xl transition-all duration-300`}>
                                <div className="space-y-3">
                                  {/* Location Header */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                        isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                                      }`}>
                                        <span className="text-sm">📍</span>
                                      </div>
                                      <span className={`text-sm font-semibold ${
                                        isDarkMode ? 'text-green-300' : 'text-green-700'
                                      }`}>
                                        Địa điểm chung
                                      </span>
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      isDarkMode ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-200'
                                    }`}>
                                      {locationData.radius}m
                                    </div>
                                  </div>
                                  
                                  {/* Address */}
                                  <div className={`p-3 rounded-lg ${
                                    isDarkMode ? 'bg-gray-700/50 border border-gray-600/50' : 'bg-gray-50/80 border border-gray-200/50'
                                  }`}>
                                    <div className="flex items-start space-x-2">
                                      <span className="text-blue-500 mt-0.5">🏠</span>
                                      <div className="flex-1">
                                        <div className={`text-xs font-medium ${
                                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                          Địa chỉ:
                                        </div>
                                        <div className={`text-xs leading-relaxed ${
                                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                        }`}>
                                          {(() => { console.log('📍 Rendering address:', locationData.address); return locationData.address; })()}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Coordinates */}
                                  <div className={`p-3 rounded-lg ${
                                    isDarkMode ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50/80 border border-blue-200/50'
                                  }`}>
                                    <div className="flex items-start space-x-2">
                                      <span className="text-purple-500 mt-0.5">🎯</span>
                                      <div className="flex-1">
                                        <div className={`text-xs font-medium ${
                                          isDarkMode ? 'text-blue-300' : 'text-blue-700'
                                        }`}>
                                          Tọa độ:
                                        </div>
                                        <div className={`text-xs font-mono ${
                                          isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                        }`}>
                                          {(() => { console.log('📍 Rendering coordinates:', locationData.lat, locationData.lng); return `${locationData.lat.toFixed(6)}, ${locationData.lng.toFixed(6)}`; })()}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Detailed Location (if exists) */}
                                  {form.detailedLocation && (
                                    <div className={`p-3 rounded-lg ${
                                      isDarkMode ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-purple-50/80 border border-purple-200/50'
                                    }`}>
                                      <div className="flex items-start space-x-2">
                                        <span className="text-purple-500 mt-0.5">📋</span>
                                        <div className="flex-1">
                                          <div className={`text-xs font-medium ${
                                            isDarkMode ? 'text-purple-300' : 'text-purple-700'
                                          }`}>
                                            Địa điểm chi tiết:
                                          </div>
                                          <div className={`text-xs leading-relaxed ${
                                            isDarkMode ? 'text-purple-400' : 'text-purple-600'
                                          }`}>
                                            {form.detailedLocation}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
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
                
                {/* Clear All Locations Button - At the bottom */}
                {useMultiTimeLocation && multiTimeLocations.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-center space-x-4">
                      {/* Location Counter Badge */}
                      <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                        isDarkMode 
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                          : 'bg-green-100 text-green-700 border border-green-200'
                      }`}>
                        📍 {multiTimeLocations.length} địa điểm đã chọn
                      </div>
                      
                      {/* Clear All Button */}
                      <button
                        onClick={() => {
                          // Đóng modal thành công nếu đang mở
                          setShowSuccessModal(false);
                          // Mở modal xóa địa điểm
                          setShowClearLocationsModal(true);
                        }}
                        className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                          isDarkMode
                            ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border border-red-500 shadow-lg hover:shadow-xl'
                            : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border border-red-400 shadow-lg hover:shadow-xl'
                        } hover:scale-105 flex items-center space-x-3 transform hover:-translate-y-0.5`}
                        title="Xóa tất cả địa điểm đã chọn"
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isDarkMode ? 'bg-red-500/20' : 'bg-white/20'
                        }`}>
                          <span className="text-sm">🗑️</span>
                        </div>
                        <span>Xóa tất cả địa điểm</span>
                        <div className={`w-2 h-2 rounded-full ${
                          isDarkMode ? 'bg-white/30' : 'bg-white/50'
                        }`}></div>
                      </button>
                    </div>
                  </div>
                )}



                {/* Địa điểm chi tiết chung cho các buổi đã chọn - Chỉ hiển thị khi KHÔNG phải chế độ "Nhiều thời gian" */}
                {!useMultiTimeLocation && (
                  <div className={`mt-6 relative overflow-hidden rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30' : 'bg-gradient-to-br from-purple-50/80 to-pink-50/80 border border-purple-200/50'} backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-500`}>
                    
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M20 20c0 11.046-8.954 20-20 20s-20-8.954-20-20 8.954-20 20-20 20 8.954 20 20zm0 0c0-11.046 8.954-20 20-20s20 8.954 20 20-8.954 20-20 20-20-8.954-20-20z'/%3E%3C/g%3E%3C/svg%3E")`,
                      }} />
                    </div>
                    
                    <div className="relative p-6">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-purple-500/40 to-pink-500/40 border border-purple-500/30' : 'bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-300'} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <span className="text-xl">📍</span>
                          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${isDarkMode ? 'bg-pink-400' : 'bg-pink-500'} animate-pulse`}></div>
                        </div>
                        <div>
                          <h3 className={`text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Địa điểm chi tiết chung cho các buổi đã chọn
                          </h3>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Nhập địa điểm cụ thể chung cho các buổi đã kích hoạt (phòng, dãy, sân...)
                          </p>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <input
                          type="text"
                          name="detailedLocation"
                          value={form.detailedLocation || ''}
                          onChange={(e) => {
                            // Cập nhật form
                            handleChange(e);
                            // Đồng thời cập nhật cho các buổi đã chọn (active)
                            timeSlots.forEach((timeSlot) => {
                              if (timeSlot != null && typeof timeSlot === 'object' && 'isActive' in timeSlot && timeSlot.isActive) {
                                handleTimeSlotChange(timeSlot.id, 'detailedLocation', e.target.value);
                              }
                            });
                          }}
                          placeholder="VD: Dãy A1, Phòng 101, Sân trường..."
                          className={`w-full px-4 py-3 rounded-xl border-2 text-base transition-all duration-300 ${
                            isDarkMode 
                              ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20' 
                              : 'bg-white/90 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20'
                          } focus:outline-none backdrop-blur-sm hover:shadow-lg`}
                        />
                        
                        {/* Input Icon */}
                        <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'} flex items-center justify-center`}>
                          <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Help Text */}
                      <div className={`mt-3 p-3 rounded-xl ${isDarkMode ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-purple-50/80 border border-purple-200/50'}`}>
                        <div className="flex items-center space-x-2">
                          <span className="text-purple-500">💡</span>
                          <p className={`text-xs ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                            <strong>Gợi ý:</strong> Nhập chi tiết địa điểm chung để áp dụng cho các buổi đã kích hoạt
                          </p>
                        </div>
                      </div>

                      {/* Button Chọn địa điểm - Ngay sau phần Địa điểm chi tiết chung */}
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <div className="text-center mb-4">
                          <h4 className={`text-base font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            📍 Chọn địa điểm cho hoạt động
                          </h4>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                            Nhấn nút bên dưới để chọn địa điểm trên bản đồ
                          </p>
                        </div>
                        <div className="flex items-center justify-center space-x-4">
                          {/* Select Location Button */}
                          <button
                            onClick={() => {
                              // Scroll to map section
                              setTimeout(() => {
                                const mapSection = document.getElementById('map-section');
                                if (mapSection) {
                                  mapSection.scrollIntoView({ 
                                    behavior: 'smooth', 
                                    block: 'start' 
                                  });
                                }
                              }, 100);
                            }}
                            className={`px-8 py-3 rounded-xl text-base font-bold transition-all duration-300 ${
                              isDarkMode
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-2 border-blue-500 shadow-lg hover:shadow-xl'
                                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-2 border-blue-400 shadow-lg hover:shadow-xl'
                            } hover:scale-105 flex items-center space-x-3 transform hover:-translate-y-0.5`}
                            title="Chọn địa điểm"
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                              isDarkMode ? 'bg-blue-500/20' : 'bg-white/20'
                            }`}>
                              <span className="text-lg">📍</span>
                            </div>
                            <span>Chọn địa điểm</span>
                            <div className={`w-3 h-3 rounded-full ${
                              isDarkMode ? 'bg-white/30' : 'bg-white/50'
                            }`}></div>
                          </button>

                          {/* Delete Location Button - Only show when location is selected */}
                          {locationData && (
                            <button
                              onClick={() => {
                                // Xóa địa điểm chung
                                setLocationData(null);
                                // Reset form detailed location
                                setForm(prev => ({
                                  ...prev,
                                  detailedLocation: ''
                                }));
                                // Reset detailed locations cho tất cả buổi
                                setTimeSlots(prevSlots => prevSlots.map(slot => ({
                                  ...slot,
                                  detailedLocation: ''
                                })));
                                // Force re-render map components
                                setLocationPickerKey(prev => prev + 1);
                                // Hiển thị thông báo thành công
                                alert('✅ Đã xóa địa điểm chung!\n\nCác thay đổi:\n• Xóa địa điểm trên bản đồ\n• Reset thanh tìm kiếm\n• Xóa địa điểm chi tiết của các buổi\n• Reset form địa điểm chi tiết');
                              }}
                              className={`px-6 py-3 rounded-xl text-base font-bold transition-all duration-300 ${
                                isDarkMode
                                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-2 border-red-500 shadow-lg hover:shadow-xl'
                                  : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-2 border-red-400 shadow-lg hover:shadow-xl'
                              } hover:scale-105 flex items-center space-x-3 transform hover:-translate-y-0.5`}
                              title="Xóa địa điểm chung"
                            >
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                isDarkMode ? 'bg-red-500/20' : 'bg-white/20'
                              }`}>
                                <span className="text-lg">🗑️</span>
                              </div>
                              <span>Xóa địa điểm chung</span>
                              <div className={`w-3 h-3 rounded-full ${
                                isDarkMode ? 'bg-white/30' : 'bg-white/50'
                              }`}></div>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}



              </div>

              {/* 4. Địa điểm hoạt động */}
              <div id="map-section" className={`relative overflow-hidden rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/90 via-gray-800/80 to-gray-900/90 border border-gray-700/50' : 'bg-gradient-to-br from-white/95 via-blue-50/30 to-purple-50/30 border border-gray-200/50'} shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-xl`}>
                {/* Header Section */}
                <div className="relative p-5">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div className="flex items-center space-x-3">
                      <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-blue-500/20' : 'bg-gradient-to-br from-blue-100 to-purple-100 border border-blue-200/50'} shadow-md`}>
                        <span className="text-lg">📍</span>
                        <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full ${isDarkMode ? 'bg-green-400' : 'bg-green-500'} animate-pulse`}></div>
                      </div>
                      <div>
                        <h2 className={`text-lg font-bold bg-gradient-to-r ${isDarkMode ? 'from-blue-400 to-purple-400' : 'from-blue-600 to-purple-600'} bg-clip-text text-transparent`}>
                          4. Địa điểm hoạt động
                        </h2>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-0.5`}>
                          Chọn vị trí diễn ra hoạt động
                        </p>
                      </div>
                    </div>
                    
                    {/* Modern Toggle Switch */}
                    <div className="flex items-center space-x-2">
                      <div className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                        !useMultiTimeLocation 
                          ? isDarkMode ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-200'
                          : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Địa điểm chung
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newMode = !useMultiTimeLocation;
                          setUseMultiTimeLocation(newMode);
                          
                          // Reset location data when switching modes
                          if (newMode) {
                            // Switching to multi-time mode
                            setForm(prev => ({ ...prev, location: '' }));
                            setLocationData(null);
                          } else {
                            // Switching to single location mode
                            setMultiTimeLocations([]);
                            setSelectedTimeSlotForLocation(null);
                          }
                        }}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 ${
                          useMultiTimeLocation 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-md shadow-green-500/25' 
                            : 'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-500 ${
                            useMultiTimeLocation ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <div className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                        useMultiTimeLocation 
                          ? isDarkMode ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-200'
                          : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Nhiều thời gian
                      </div>
                    </div>
                  </div>

                  {/* Status indicator for multi-time */}
                  {useMultiTimeLocation && (
                    <div className={`mb-4 p-4 rounded-xl ${isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'} backdrop-blur-xl shadow-md hover:shadow-lg transition-all duration-300`}>
                      {selectedTimeSlotForLocation ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-100 border border-blue-300'} shadow-md`}>
                              <span className="text-lg">🎯</span>
                            </div>
                            <div>
                              <div className={`text-base font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                                Đang chọn địa điểm cho: {
                                  selectedTimeSlotForLocation === 'morning' ? 'Buổi Sáng' :
                                  selectedTimeSlotForLocation === 'afternoon' ? 'Buổi Chiều' :
                                  selectedTimeSlotForLocation === 'evening' ? 'Buổi Tối' : ''
                                }
                              </div>
                              <div className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                Click vào bản đồ hoặc tìm kiếm để chọn địa điểm
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleClearTimeSlotSelection}
                            className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 ${
                              isDarkMode 
                                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            }`}
                            title="Hủy chọn buổi"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Overview */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-gray-700 border border-gray-500' : 'bg-gray-100 border border-gray-300'} shadow-md`}>
                                <span className="text-lg">📍</span>
                              </div>
                              <div>
                                <div className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {multiTimeLocations.length > 0 ? `Đã chọn ${multiTimeLocations.length}/${timeSlots.filter((s): s is TimeSlot => s != null && typeof s === 'object' && 'isActive' in s && s.isActive === true).length} địa điểm` : 'Chưa chọn địa điểm nào'}
                                </div>
                                <div className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {multiTimeLocations.length > 0 
                                    ? 'Quay lại phần "Các buổi" để chọn thêm hoặc sửa địa điểm'
                                    : 'Quay lại phần "Các buổi" và nhấn "Chọn địa điểm"'
                                  }
                                </div>
                              </div>
                            </div>
                            
                            {/* Progress indicator */}
                            <div className="flex items-center space-x-1.5">
                              {timeSlots.filter((slot): slot is TimeSlot => slot != null && typeof slot === 'object' && 'isActive' in slot && slot.isActive === true).map((slot, index) => {
                                const timeSlotKey = getTimeSlotKey(index);
                                const hasLocation = multiTimeLocations.find(loc => loc.timeSlot === timeSlotKey);
                                return (
                                  <div
                                    key={timeSlotKey}
                                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                                      hasLocation ? 'bg-green-500 shadow-md shadow-green-500/50' : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                                    title={`${slot.name}: ${hasLocation ? 'Đã chọn' : 'Chưa chọn'}`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* Location list */}
                          {multiTimeLocations.length > 0 && (
                            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700 border border-gray-500' : 'bg-gray-50 border border-gray-200'}`}>
                              <div className="space-y-1.5">
                                {multiTimeLocations.map((location) => (
                                  <div key={location.id} className={`flex items-center space-x-2 text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-green-400' : 'bg-green-500'}`}></div>
                                    <span className="font-medium">{location.timeSlot === 'morning' ? 'Sáng' : location.timeSlot === 'afternoon' ? 'Chiều' : 'Tối'}:</span>
                                    <span className="truncate">{location.location.address}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}





                                     {/* Location Components - Modern Design */}
                   <div className="mb-8 space-y-6">
                     




                     {/* Hướng dẫn chọn địa điểm - Modern Info Card */}
                     <div className={`relative overflow-hidden rounded-2xl ${isDarkMode ? 'bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border border-emerald-500/30' : 'bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-200/50'} backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-500`}>
                       
                       {/* Background Pattern */}
                       <div className="absolute inset-0 opacity-5">
                         <div className="absolute inset-0" style={{
                           backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M20 20c0 11.046-8.954 20-20 20s-20-8.954-20-20 8.954-20 20-20 20 8.954 20 20zm0 0c0-11.046 8.954-20 20-20s20 8.954 20 20-8.954 20-20 20-20-8.954-20-20z'/%3E%3C/g%3E%3C/svg%3E")`,
                         }} />
                       </div>
                       
                       <div className="relative p-8">
                         <div className="flex items-center space-x-4 mb-6">
                           <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-emerald-500/40 to-teal-500/40 border border-emerald-500/30' : 'bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-300'} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                             <span className="text-2xl">💡</span>
                             <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${isDarkMode ? 'bg-teal-400' : 'bg-teal-500'} animate-pulse`}></div>
                           </div>
                           <div>
                             <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                               Hướng dẫn chọn địa điểm
                             </h3>
                             <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                               {useMultiTimeLocation 
                                 ? timeSlots.filter((s): s is TimeSlot => s != null && typeof s === 'object' && 'isActive' in s && s.isActive === true).length === 0
                                   ? "⚠️ Vui lòng kích hoạt ít nhất một buổi trong phần 'Các buổi' trước khi chọn địa điểm"
                                   : `Chọn địa điểm khác nhau cho ${timeSlots.filter((s): s is TimeSlot => s != null && typeof s === 'object' && 'isActive' in s && s.isActive === true).length} buổi đã kích hoạt bằng cách click vào bản đồ bên dưới`
                                 : "Click vào bản đồ bên dưới để chọn địa điểm duy nhất cho hoạt động"
                               }
                             </p>
                           </div>
                         </div>
                         
                         {useMultiTimeLocation && timeSlots.filter((s): s is TimeSlot => s != null && typeof s === 'object' && 'isActive' in s && s.isActive === true).length === 0 && (
                           <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50/80 border border-red-200/50'}`}>
                             <div className="flex items-center space-x-3">
                               <span className="text-lg">⚠️</span>
                               <span className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                                 Không thể chọn địa điểm khi chưa có buổi nào được kích hoạt
                               </span>
                             </div>
                           </div>
                         )}
                         
                         {/* Quick Tips */}
                         <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-emerald-900/20 border border-emerald-500/30' : 'bg-emerald-50/80 border border-emerald-200/50'}`}>
                             <div className="flex items-center space-x-3">
                               <span className="text-emerald-500">🎯</span>
                               <p className={`text-sm ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                 <strong>Tip:</strong> Click vào bản đồ để chọn vị trí chính xác
                               </p>
                             </div>
                           </div>
                           
                           <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-teal-900/20 border border-teal-500/30' : 'bg-teal-50/80 border border-teal-200/50'}`}>
                             <div className="flex items-center space-x-3">
                               <span className="text-teal-500">🔍</span>
                               <p className={`text-sm ${isDarkMode ? 'text-teal-300' : 'text-teal-700'}`}>
                                 <strong>Tip:</strong> Sử dụng thanh tìm kiếm để tìm địa chỉ nhanh
                               </p>
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>

                {useMultiTimeLocation ? (
                  <div>
                    <MultiTimeLocationPicker
                      key={locationPickerKey}
                      onLocationsChange={setMultiTimeLocations}
                      initialLocations={multiTimeLocations}
                      isDarkMode={isDarkMode}
                      selectedTimeSlot={selectedTimeSlotForLocation}
                      onTimeSlotSelect={(timeSlot) => {
                        if (timeSlot) {
                          handleTimeSlotLocationSelect(timeSlot);
                        } else {
                          handleClearTimeSlotSelection();
                        }
                      }}
                      activeTimeSlots={timeSlots.filter((slot): slot is TimeSlot => slot != null && typeof slot === 'object' && 'isActive' in slot && slot.isActive === true).map(slot => {
                        const timeSlotMap: { [key: string]: 'morning' | 'afternoon' | 'evening' } = {
                          'Buổi Sáng': 'morning',
                          'Buổi Chiều': 'afternoon', 
                          'Buổi Tối': 'evening'
                        };
                        return timeSlotMap[slot.name];
                      })}
                    />
                    {multiTimeLocations.length > 0 && (
                      <div className="mt-4">
                        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50/80 border border-green-200/50'}`}>
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                                Đã chọn {multiTimeLocations.length} địa điểm theo thời gian
                              </p>
                              <p className={`text-xs ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                                {multiTimeLocations.map(loc => `${loc.timeSlot}: ${loc.location?.address || `${loc.location?.lat?.toFixed(4) || '0.0000'}, ${loc.location?.lng?.toFixed(4) || '0.0000'}`}`).join(' | ')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <OpenStreetMapPicker
                      key={locationPickerKey}
                      onLocationChange={handleLocationChange}
                      initialLocation={locationData || undefined}
                      isDarkMode={isDarkMode}
                      activeTimeSlots={timeSlots.filter((slot): slot is TimeSlot => slot != null && typeof slot === 'object' && 'isActive' in slot && slot.isActive === true)}
                    />
                    

                    {locationData && (
                      <div className="mt-4">
                        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50/80 border border-green-200/50'}`}>
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                                Đã chọn địa điểm
                              </p>
                              <p className={`text-xs ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                                {locationData?.address || 'Không có địa chỉ'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}



                
                </div>
              </div>

              {/* 5. Trạng thái hoạt động */}
              <div className={`p-5 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-gray-700/50' : 'bg-gradient-to-br from-white/90 to-blue-50/50 backdrop-blur-xl border border-gray-200/50'} shadow-lg hover:shadow-xl transition-all duration-300`}>
                {/* Header */}
                <div className="flex items-center mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${isDarkMode ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/20' : 'bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200'}`}>
                    <span className="text-lg">⚡</span>
                    </div>
                    <div>
                    <h2 className={`text-lg font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        5. Trạng thái hoạt động
                      </h2>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Chọn trạng thái phù hợp để quản lý hoạt động
                      </p>
                    </div>
                  </div>
                  
                {/* Compact Status Selection - Horizontal Layout */}
                <div className="space-y-3">
                  {/* Status Options - Compact Buttons - Centered and Evenly Spaced */}
                  <div className="flex flex-wrap justify-center gap-1.5 md:justify-between md:gap-2">
                      {[
                        { 
                          value: 'draft', 
                          label: 'Nháp', 
                          icon: '📝', 
                        color: isDarkMode ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' : 'bg-yellow-50 text-yellow-700 border-yellow-300',
                        activeColor: isDarkMode ? 'bg-yellow-500/40 border-yellow-400 ring-2 ring-yellow-400/30' : 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-400/30'
                        },
                        { 
                          value: 'published', 
                          label: 'Đã xuất bản', 
                          icon: '✅', 
                        color: isDarkMode ? 'bg-green-500/20 text-green-300 border-green-500/50' : 'bg-green-50 text-green-700 border-green-300',
                        activeColor: isDarkMode ? 'bg-green-500/40 border-green-400 ring-2 ring-green-400/30' : 'bg-green-100 border-green-400 ring-2 ring-green-400/30'
                        },
                        { 
                          value: 'ongoing', 
                          label: 'Đang diễn ra', 
                          icon: '🔄', 
                        color: isDarkMode ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' : 'bg-blue-50 text-blue-700 border-blue-300',
                        activeColor: isDarkMode ? 'bg-blue-500/40 border-blue-400 ring-2 ring-blue-400/30' : 'bg-blue-100 border-blue-400 ring-2 ring-blue-400/30'
                        },
                        { 
                          value: 'completed', 
                          label: 'Đã hoàn thành', 
                          icon: '🏆', 
                        color: isDarkMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' : 'bg-purple-50 text-purple-700 border-purple-300',
                        activeColor: isDarkMode ? 'bg-purple-500/40 border-purple-400 ring-2 ring-purple-400/30' : 'bg-purple-100 border-purple-400 ring-2 ring-purple-400/30'
                        },
                        { 
                          value: 'cancelled', 
                          label: 'Đã hủy', 
                          icon: '❌', 
                        color: isDarkMode ? 'bg-red-500/20 text-red-300 border-red-500/50' : 'bg-red-50 text-red-700 border-red-300',
                        activeColor: isDarkMode ? 'bg-red-500/40 border-red-400 ring-2 ring-red-400/30' : 'bg-red-100 border-red-400 ring-2 ring-red-400/30'
                        },
                        { 
                          value: 'postponed', 
                          label: 'Tạm hoãn', 
                          icon: '⏸️', 
                        color: isDarkMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-amber-50 text-amber-700 border-amber-300',
                        activeColor: isDarkMode ? 'bg-amber-500/40 border-amber-400 ring-2 ring-amber-400/30' : 'bg-amber-100 border-amber-400 ring-2 ring-amber-400/30'
                        }
                      ].map((status) => (
                      <button
                          key={status.value}
                        type="button"
                          onClick={() => setForm(prev => ({ ...prev, status: status.value }))}
                        className={`flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg border-2 transition-all duration-200 font-medium text-sm flex-1 md:flex-initial min-w-[140px] ${
                            form.status === status.value
                            ? `${status.activeColor} shadow-md scale-105`
                            : `${status.color} hover:scale-105 hover:shadow-sm`
                        }`}
                      >
                        <span className="text-base">{status.icon}</span>
                        <span className="whitespace-nowrap">{status.label}</span>
                          {form.status === status.value && (
                          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                          )}
                      </button>
                      ))}
                  </div>
                  
                  {/* Selected Status Info - Compact */}
                  {form.status && (
                    <div className={`p-3 rounded-lg border ${
                      form.status === 'draft' 
                        ? isDarkMode ? 'bg-yellow-900/20 border-yellow-500/30' : 'bg-yellow-50/80 border-yellow-200/50'
                        : form.status === 'published'
                        ? isDarkMode ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50/80 border-green-200/50'
                        : form.status === 'ongoing'
                        ? isDarkMode ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50/80 border-blue-200/50'
                        : form.status === 'completed'
                        ? isDarkMode ? 'bg-purple-900/20 border-purple-500/30' : 'bg-purple-50/80 border-purple-200/50'
                        : form.status === 'cancelled'
                        ? isDarkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50/80 border-red-200/50'
                        : isDarkMode ? 'bg-amber-900/20 border-amber-500/30' : 'bg-amber-50/80 border-amber-200/50'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">
                          {form.status === 'draft' ? '📝' : 
                           form.status === 'published' ? '✅' : 
                           form.status === 'ongoing' ? '🔄' : 
                           form.status === 'completed' ? '🏆' : 
                           form.status === 'cancelled' ? '❌' : '⏸️'}
                        </span>
                        <p className={`text-xs font-medium ${
                          form.status === 'draft' 
                            ? isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
                            : form.status === 'published'
                            ? isDarkMode ? 'text-green-300' : 'text-green-700'
                            : form.status === 'ongoing'
                            ? isDarkMode ? 'text-blue-300' : 'text-blue-700'
                            : form.status === 'completed'
                            ? isDarkMode ? 'text-purple-300' : 'text-purple-700'
                            : form.status === 'cancelled'
                            ? isDarkMode ? 'text-red-300' : 'text-red-700'
                            : isDarkMode ? 'text-amber-300' : 'text-amber-700'
                        }`}>
                          {form.status === 'draft' ? 'Nháp - Chưa hoàn thiện, có thể chỉnh sửa' : 
                           form.status === 'published' ? 'Đã xuất bản - Đã công khai, mọi người có thể xem' : 
                           form.status === 'ongoing' ? 'Đang diễn ra - Hoạt động đang được thực hiện' : 
                           form.status === 'completed' ? 'Đã hoàn thành - Hoạt động đã kết thúc thành công' : 
                           form.status === 'cancelled' ? 'Đã hủy - Đã hủy bỏ, không còn hiệu lực' : 
                           'Tạm hoãn - Tạm thời hoãn lại, sẽ thông báo sau'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Quản lý các vai trò */}
              <div className={`p-5 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-gray-700/50' : 'bg-gradient-to-br from-white/90 to-blue-50/50 backdrop-blur-xl border border-gray-200/50'} shadow-lg hover:shadow-xl transition-all duration-300`}>
                <div className="flex items-center mb-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${isDarkMode ? 'bg-gradient-to-br from-green-500/30 to-emerald-500/30 border border-green-500/20' : 'bg-gradient-to-br from-green-100 to-emerald-100 border border-green-200'}`}>
                    <span className="text-lg">👥</span>
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      6. Quản lý các vai trò
                    </h2>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Thêm và phân quyền cho các thành viên tham gia hoạt động
                    </p>
                  </div>
                </div>
                
                {/* Search and filter section */}
                <div className="mb-4">
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Tìm kiếm thành viên CLB và Ủy Viên BCH..."
                        className={`w-full px-3 py-2.5 rounded-xl border text-sm ${
                          isDarkMode 
                            ? 'bg-gray-600/50 border-gray-500/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                            : 'bg-white/80 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'
                        } focus:outline-none transition-all duration-300 backdrop-blur-sm`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                                         <button
                       type="button"
                       onClick={handleSearch}
                       className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                         isDarkMode 
                           ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white' 
                           : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                       } hover:scale-105 hover:shadow-md`}
                     >
                       <div className="flex items-center">
                         <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                         </svg>
                         Tìm kiếm
                       </div>
                     </button>
                  </div>
                </div>

                {/* Loading state */}
                {loading && (
                  <div className={`text-center py-8 rounded-2xl border-2 border-dashed ${
                    isDarkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50/50'
                  }`}>
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                      isDarkMode ? 'bg-gray-600/50' : 'bg-gray-200/50'
                    }`}>
                      <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Đang tải danh sách thành viên CLB và Ủy Viên BCH...
                    </p>
                  </div>
                )}

                {/* Club students list */}
                {!loading && (
                  <div>
                    <h3 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Danh sách thành viên CLB (CLUB_STUDENT + CLUB_MEMBER)
                    </h3>
                    {clubStudents.length === 0 ? (
                      <div className={`text-center py-12 rounded-2xl border-2 border-dashed ${
                        isDarkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50/50'
                      }`}>
                        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                          isDarkMode ? 'bg-gray-600/50' : 'bg-gray-200/50'
                        }`}>
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Không tìm thấy thành viên CLB hoặc Ủy Viên BCH nào
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {searchTerm ? 'Thử tìm kiếm với từ khóa khác' : 'Nhấn "Tìm kiếm" để tải danh sách'}
                        </p>
                      </div>
                                         ) : (
                       <div>
                         {/* Club students list with scroll */}
                         <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                           {clubStudents.map((student, index) => (
                             <div key={student._id || `student-${index}-${student.studentId || student.email || 'unknown'}`} className={`flex items-center justify-between p-4 rounded-2xl border ${
                               isDarkMode ? 'bg-gray-700/50 border-gray-600/50' : 'bg-gray-50/80 border-gray-200/50'
                             } backdrop-blur-sm hover:shadow-lg transition-all duration-300`}>
                               <div className="flex items-center space-x-3">
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                   isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                                 }`}>
                                   <span className="text-lg font-bold text-blue-600">
                                     {student.name.charAt(0).toUpperCase()}
                                   </span>
                                 </div>
                                 <div>
                                   <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                     {student.name}
                                   </p>
                                   <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                     {student.email} • {student.studentId}
                                   </p>
                                   {student.faculty && (
                                     <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                       {student.faculty}
                                     </p>
                                   )}
                                   <div className="flex items-center mt-1 space-x-2">
                                     <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                       student.role === 'CLUB_MEMBER'
                                         ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                         : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                     }`}>
                                       <span className={`w-2 h-2 rounded-full mr-1 ${
                                         student.role === 'CLUB_MEMBER' ? 'bg-blue-400' : 'bg-purple-400'
                                       }`}></span>
                                       {getRoleDisplayName(student.role)}
                                     </span>
                                     <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                       student.isClubMember 
                                         ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                         : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                     }`}>
                                       <span className={`w-2 h-2 rounded-full mr-1 ${
                                         student.isClubMember ? 'bg-green-400' : 'bg-yellow-400'
                                       }`}></span>
                                       {student.isClubMember ? 'Thành viên tích cực' : 'Thành viên CLB'}
                                     </span>
                                   </div>
                                 </div>
                               </div>
                               <button
                                 type="button"
                                 onClick={() => handleAddClubStudent(student)}
                                 className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                                   isDarkMode 
                                     ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white' 
                                     : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                                 } hover:scale-105 hover:shadow-lg`}
                               >
                                 Thêm vào hoạt động
                               </button>
                             </div>
                           ))}
                         </div>

                         {/* Pagination */}
                         {totalPages > 1 && (
                           <div className="mt-6 flex items-center justify-between">
                             <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                               Hiển thị {clubStudents.length} trong tổng số {totalCount} thành viên
                             </div>
                             <div className="flex items-center space-x-2">
                               <button
                                 type="button"
                                 onClick={() => handlePageChange(currentPage - 1)}
                                 disabled={currentPage === 1}
                                 className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                                   currentPage === 1
                                     ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                                     : isDarkMode
                                       ? 'bg-gray-600 hover:bg-gray-500 text-white'
                                       : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                 }`}
                               >
                                 Trước
                               </button>
                               
                               <div className="flex items-center space-x-1">
                                 {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                   const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                                   if (page > totalPages) return null;
                                   
                                   return (
                                     <button
                                       key={page}
                                       type="button"
                                       onClick={() => handlePageChange(page)}
                                       className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                                         page === currentPage
                                           ? isDarkMode
                                             ? 'bg-blue-600 text-white'
                                             : 'bg-blue-500 text-white'
                                           : isDarkMode
                                             ? 'bg-gray-600 hover:bg-gray-500 text-white'
                                             : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                       }`}
                                     >
                                       {page}
                                     </button>
                                   );
                                 })}
                               </div>
                               
                               <button
                                 type="button"
                                 onClick={() => handlePageChange(currentPage + 1)}
                                 disabled={currentPage === totalPages}
                                 className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                                   currentPage === totalPages
                                     ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                                     : isDarkMode
                                       ? 'bg-gray-600 hover:bg-gray-500 text-white'
                                       : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                 }`}
                               >
                                 Sau
                               </button>
                             </div>
                           </div>
                         )}
                       </div>
                     )}
                  </div>
                )}

                {/* Selected participants list */}
                <div className="mt-8">
                  <h3 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Danh sách người tham gia đã chọn
                  </h3>
                  {participants.length === 0 ? (
                    <div className={`text-center py-8 rounded-2xl border-2 border-dashed ${
                      isDarkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50/50'
                    }`}>
                      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                        isDarkMode ? 'bg-gray-600/50' : 'bg-gray-200/50'
                      }`}>
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Chưa có người tham gia nào
                      </p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Chọn thành viên từ danh sách trên để thêm vào hoạt động
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {participants.map((participant) => (
                        <div key={participant.id} className={`flex items-center justify-between p-4 rounded-2xl border ${
                          isDarkMode ? 'bg-gray-700/50 border-gray-600/50' : 'bg-gray-50/80 border-gray-200/50'
                        } backdrop-blur-sm hover:shadow-lg transition-all duration-300`}>
                                                     <div className="flex items-center space-x-3">
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                               isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                             }`}>
                               <span className="text-lg font-bold text-green-600">
                                 {participant.name.charAt(0).toUpperCase()}
                               </span>
                             </div>
                             <div>
                               <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                 {participant.name}
                               </p>
                               <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                 {participant.email}
                               </p>
                                                                <div className="flex items-center mt-1">
                                   <select
                                     value={participant.role}
                                     onChange={(e) => handleChangeParticipantRole(participant.id, e.target.value as ParticipantRole)}
                                     className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all duration-300 ${
                                       participant.role === 'Trưởng Nhóm'
                                         ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600'
                                         : participant.role === 'Phó Trưởng Nhóm'
                                         ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-600'
                                         : participant.role === 'Thành Viên Ban Tổ Chức'
                                         ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-600'
                                         : participant.role === 'Người Giám Sát'
                                         ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600'
                                         : 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600'
                                     } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                                   >
                                     <option value="Trưởng Nhóm">👑 Trưởng Nhóm</option>
                                     <option value="Phó Trưởng Nhóm">👨‍💼 Phó Trưởng Nhóm</option>
                                     <option value="Thành Viên Ban Tổ Chức">📋 Thành Viên Ban Tổ Chức</option>
                                     <option value="Người Tham Gia">👥 Người Tham Gia</option>
                                     <option value="Người Giám Sát">👁️ Người Giám Sát</option>
                                   </select>
                                 </div>
                             </div>
                           </div>
                           <button
                             type="button"
                             onClick={() => handleRemoveParticipant(participant.id)}
                             className={`p-2 rounded-xl transition-all duration-300 ${
                               isDarkMode 
                                 ? 'text-red-400 hover:text-red-300 hover:bg-red-500/20' 
                                 : 'text-red-500 hover:text-red-600 hover:bg-red-50'
                             }`}
                           >
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                             </svg>
                           </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 7. Ghi chú bổ sung */}
              <div className={`p-5 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-gray-700/50' : 'bg-gradient-to-br from-white/90 to-blue-50/50 backdrop-blur-xl border border-gray-200/50'} shadow-lg hover:shadow-xl transition-all duration-300`}>
                <div className="flex items-center mb-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${isDarkMode ? 'bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border border-blue-500/20' : 'bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200'}`}>
                    <span className="text-lg">📝</span>
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      7. Ghi chú bổ sung
                    </h2>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Thêm thông tin chi tiết hoặc yêu cầu đặc biệt cho hoạt động
                    </p>
                  </div>
                </div>
                
                {/* Button Section */}
                <div className={`p-3 rounded-xl border-2 mb-4 ${
                  isDarkMode 
                    ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-500/50' 
                    : 'bg-gradient-to-r from-blue-50/80 to-purple-50/80 border-blue-400/50'
                } backdrop-blur-sm`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-base font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        📝 Ghi chú bổ sung
                      </h3>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Thêm thông tin chi tiết hoặc yêu cầu đặc biệt cho hoạt động
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdditionalNotes(!showAdditionalNotes)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-md hover:scale-105 ${
                        showAdditionalNotes
                          ? isDarkMode 
                            ? 'bg-red-600 text-white hover:bg-red-700' 
                            : 'bg-red-500 text-white hover:bg-red-600'
                          : isDarkMode 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {showAdditionalNotes ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          )}
                        </svg>
                        <span className="text-xs">{showAdditionalNotes ? 'Ẩn ghi chú' : 'Thêm ghi chú'}</span>
                      </div>
                    </button>
                  </div>
                </div>
                
                {/* Notes Content */}
                {showAdditionalNotes && (
                  <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-gray-700/30 border-gray-600/50' 
                      : 'bg-gray-50/50 border-gray-200/50'
                  } backdrop-blur-sm`}>
                    <div className="flex items-start space-x-3 mb-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                      }`}>
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Ghi chú bổ sung cho hoạt động
                        </h4>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Thêm thông tin chi tiết, yêu cầu đặc biệt hoặc hướng dẫn quan trọng
                        </p>
                      </div>
                    </div>
                    
                    <textarea
                      name="overview"
                      value={form.overview}
                      onChange={handleChange}
                      rows={4}
                      className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                        isDarkMode 
                          ? 'bg-gray-600/50 border-gray-500/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                          : 'bg-white/80 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'
                      } focus:outline-none transition-all duration-300 backdrop-blur-sm resize-none`}
                      placeholder="Ví dụ: Yêu cầu mang theo giấy tờ tùy thân, trang phục phù hợp, mang theo nước uống, hoặc các lưu ý đặc biệt khác..."
                    />
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className={`p-3 rounded-lg ${
                        isDarkMode ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50/80 border border-blue-200/50'
                      }`}>
                        <h5 className={`font-medium text-sm mb-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                          💡 Gợi ý nội dung:
                        </h5>
                        <ul className={`text-xs space-y-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                          <li>• Yêu cầu trang phục</li>
                          <li>• Vật dụng cần mang theo</li>
                          <li>• Lưu ý về thời gian</li>
                          <li>• Quy định đặc biệt</li>
                        </ul>
                      </div>
                      <div className={`p-3 rounded-lg ${
                        isDarkMode ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50/80 border border-green-200/50'
                      }`}>
                        <h5 className={`font-medium text-sm mb-2 ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                          ✅ Lưu ý:
                        </h5>
                        <ul className={`text-xs space-y-1 ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                          <li>• Ghi chú sẽ hiển thị cho người tham gia</li>
                          <li>• Nên viết ngắn gọn, rõ ràng</li>
                          <li>• Có thể cập nhật sau khi tạo</li>
                          <li>• Không bắt buộc phải điền</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 8. Tổng quan lịch trình */}
              <div className={`p-5 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-gray-700/50' : 'bg-gradient-to-br from-white/90 to-blue-50/50 backdrop-blur-xl border border-gray-200/50'} shadow-lg hover:shadow-xl transition-all duration-300`}>
                <div className="flex items-center mb-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${isDarkMode ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/20' : 'bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200'}`}>
                    <span className="text-lg">📊</span>
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      8. Tổng quan lịch trình
                    </h2>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Xem lại và kiểm tra toàn bộ thông tin hoạt động trước khi tạo
                    </p>
                  </div>
                </div>
                  
                  {/* Schedule Overview Cards */}
                  <div className="mb-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {/* Total Sessions */}
                    <div className={`p-3 rounded-lg border ${
                        isDarkMode ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50/80 border-blue-200/50'
                      } backdrop-blur-sm`}>
                        <div className="flex items-center justify-between">
                <div>
                          <p className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                              Tổng số buổi
                            </p>
                          <p className={`text-xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                              {timeSlots.filter((s): s is TimeSlot => s != null && typeof s === 'object' && 'isActive' in s && s.isActive === true).length}
                            </p>
                          </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                          }`}>
                          <span className="text-sm">📅</span>
                          </div>
                        </div>
                      </div>

                      {/* Total Duration */}
                    <div className={`p-3 rounded-lg border ${
                        isDarkMode ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50/80 border-green-200/50'
                      } backdrop-blur-sm`}>
                        <div className="flex items-center justify-between">
                          <div>
                          <p className={`text-xs font-medium ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                              Tổng thời gian
                            </p>
                          <p className={`text-xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                              {(() => {
                                const activeSlots = timeSlots.filter((s): s is TimeSlot => s != null && typeof s === 'object' && 'isActive' in s && s.isActive === true);
                                if (activeSlots.length === 0) return '0h';
                                
                                const totalMinutes = activeSlots.reduce((total, slot) => {
                                  const start = new Date(`2000-01-01T${slot.startTime}`);
                                  const end = new Date(`2000-01-01T${slot.endTime}`);
                                  const diffMs = end.getTime() - start.getTime();
                                  return total + (diffMs / (1000 * 60));
                                }, 0);
                                
                                const hours = Math.floor(totalMinutes / 60);
                                const minutes = Math.round(totalMinutes % 60);
                                return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
                              })()}
                            </p>
                          </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                          }`}>
                          <span className="text-sm">⏱️</span>
                          </div>
                        </div>
                      </div>

                      {/* Participants */}
                    <div className={`p-3 rounded-lg border ${
                        isDarkMode ? 'bg-purple-900/20 border-purple-500/30' : 'bg-purple-50/80 border-purple-200/50'
                      } backdrop-blur-sm`}>
                        <div className="flex items-center justify-between">
                          <div>
                          <p className={`text-xs font-medium ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                              Người tham gia
                            </p>
                          <p className={`text-xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                              {participants.length}
                            </p>
                          </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                          }`}>
                          <span className="text-sm">👥</span>
                          </div>
                        </div>
                      </div>

                    {/* Max Participants */}
                    <div className={`p-3 rounded-lg border ${
                      isDarkMode ? 'bg-orange-900/20 border-orange-500/30' : 'bg-orange-50/80 border-orange-200/50'
                    } backdrop-blur-sm`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-xs font-medium ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                            Sức chứa tối đa
                          </p>
                          <p className={`text-xl font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-700'}`}>
                            {form.maxParticipants || '∞'}
                          </p>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'
                        }`}>
                          <span className="text-sm">🎯</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Information Cards */}
                <div className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Activity Date */}
                    <div className={`p-3 rounded-lg border ${
                      isDarkMode ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50/80 border-indigo-200/50'
                    } backdrop-blur-sm`}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'
                        }`}>
                          <span className="text-sm">📅</span>
                        </div>
                        <div>
                          <p className={`text-xs font-medium ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                            Ngày diễn ra
                          </p>
                          <p className={`text-sm font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>
                            {form.date ? new Date(form.date).toLocaleDateString('vi-VN', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'Chưa chọn'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Activity Status */}
                    <div className={`p-3 rounded-lg border ${
                      isDarkMode ? 'bg-pink-900/20 border-pink-500/30' : 'bg-pink-50/80 border-pink-200/50'
                    } backdrop-blur-sm`}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isDarkMode ? 'bg-pink-500/20' : 'bg-pink-100'
                        }`}>
                          <span className="text-sm">🏷️</span>
                        </div>
                        <div>
                          <p className={`text-xs font-medium ${isDarkMode ? 'text-pink-300' : 'text-pink-600'}`}>
                            Trạng thái
                          </p>
                          <p className={`text-sm font-bold ${isDarkMode ? 'text-pink-400' : 'text-pink-700'}`}>
                            {form.status === 'draft' ? '📝 Nháp' : 
                             form.status === 'published' ? '✅ Đã xuất bản' : 
                             form.status === 'ongoing' ? '🔄 Đang diễn ra' : 
                             form.status === 'completed' ? '🏆 Đã hoàn thành' : 
                             form.status === 'cancelled' ? '❌ Đã hủy' : '⏸️ Tạm hoãn'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Activity Visibility */}
                    <div className={`p-3 rounded-lg border ${
                      isDarkMode ? 'bg-teal-900/20 border-teal-500/30' : 'bg-teal-50/80 border-teal-200/50'
                    } backdrop-blur-sm`}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isDarkMode ? 'bg-teal-500/20' : 'bg-teal-100'
                        }`}>
                          <span className="text-sm">👁️</span>
                        </div>
                        <div>
                          <p className={`text-xs font-medium ${isDarkMode ? 'text-teal-300' : 'text-teal-600'}`}>
                            Quyền truy cập
                          </p>
                          <p className={`text-sm font-bold ${isDarkMode ? 'text-teal-400' : 'text-teal-700'}`}>
                            {form.visibility === 'public' ? '🌐 Công khai' : '🔒 Riêng tư'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Details */}
                <div className="mb-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Responsible Person */}
                    <div className={`p-3 rounded-lg border ${
                      isDarkMode ? 'bg-amber-900/20 border-amber-500/30' : 'bg-amber-50/80 border-amber-200/50'
                    } backdrop-blur-sm`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                          <span className="text-sm">👤</span>
                        </div>
                        <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                          Người phụ trách
                        </h3>
                      </div>
                      {form.responsiblePerson ? (
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isDarkMode ? 'bg-amber-500/20' : 'bg-amber-100'
                          }`}>
                            <span className="text-sm font-bold text-amber-600">
                              {responsiblePersons.find(p => p._id === form.responsiblePerson)?.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {responsiblePersons.find(p => p._id === form.responsiblePerson)?.name || 'Không tìm thấy'}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {responsiblePersons.find(p => p._id === form.responsiblePerson)?.email || ''}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              {getRoleDisplayName(responsiblePersons.find(p => p._id === form.responsiblePerson)?.role || '')}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className={`text-xs italic ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Chưa chọn người phụ trách
                        </p>
                      )}
                    </div>

                    {/* Main Location */}
                    <div className={`p-3 rounded-lg border ${
                      isDarkMode ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-emerald-50/80 border-emerald-200/50'
                    } backdrop-blur-sm`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                          <span className="text-sm">📍</span>
                        </div>
                        <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          Địa điểm chính
                        </h3>
                      </div>
                      {form.location ? (
                        <div>
                          <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {form.location}
                          </p>
                          {form.detailedLocation && (
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                              {form.detailedLocation}
                            </p>
                          )}
                          {locationData && (
                            <div className="mt-1">
                              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                📍 {locationData.address}
                              </p>
                              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                🎯 Bán kính: {locationData.radius}m
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className={`text-xs italic ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Chưa chọn địa điểm
                        </p>
                      )}
                    </div>
                    </div>
                  </div>

                  {/* 📋 Tổng quan lịch trình hoạt động */}
                  <div className="mb-6">
                    <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-purple-50/80 border border-purple-200/50'} backdrop-blur-sm`}>
                      <div className="flex items-center space-x-3 mb-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                          <span className="text-lg">📋</span>
                        </div>
                        <h3 className={`font-semibold ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                          Tổng quan lịch trình hoạt động
                        </h3>
                      </div>
                      
                      <div className="space-y-3">
                        {timeSlots.filter((slot): slot is TimeSlot => slot != null && slot.id != null).map((slot, index) => {
                          const isActive = slot.isActive ?? false;
                          const timeSlotKey = getTimeSlotKey(index);
                          const location = useMultiTimeLocation 
                            ? multiTimeLocations.find(loc => loc.timeSlot === timeSlotKey)
                            : locationData;
                          // Ensure unique key even if slot.id might be duplicated
                          const uniqueKey = slot.id || `slot-overview-${index}-${Date.now()}`;
                          return (
                            <div
                              key={uniqueKey}
                              className={`p-3 rounded-lg border-2 transition-all duration-300 ${
                                isActive
                                  ? location
                                    ? 'border-green-500 bg-green-50/80 dark:bg-green-900/20'
                                    : 'border-yellow-500 bg-yellow-50/80 dark:bg-yellow-900/20'
                                  : 'border-gray-300 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                                    isActive
                                      ? location
                                        ? 'bg-green-100 dark:bg-green-800/30'
                                        : 'bg-yellow-100 dark:bg-yellow-800/30'
                                      : 'bg-gray-100 dark:bg-gray-700/50'
                                  }`}>
                                    {index === 0 ? '🌅' : index === 1 ? '☀️' : '🌙'}
                                  </div>
                                  <div>
                                    <div className={`font-semibold text-sm ${
                                      isActive
                                        ? location
                                          ? 'text-green-700 dark:text-green-300'
                                          : 'text-yellow-700 dark:text-yellow-300'
                                        : 'text-gray-500 dark:text-gray-400'
                                    }`}>
                                      {slot.name} ({slot.startTime} - {slot.endTime})
                                    </div>
                                    <div className={`text-xs ${
                                      isActive
                                        ? location
                                          ? 'text-green-600 dark:text-green-400'
                                          : 'text-yellow-600 dark:text-yellow-400'
                                        : 'text-gray-400 dark:text-gray-500'
                                    }`}>
                                      {isActive 
                                        ? location 
                                          ? '✅ Đã chọn địa điểm' 
                                          : '⚠️ Chưa chọn địa điểm'
                                        : '❌ Chưa kích hoạt'
                                      }
                                    </div>
                                  </div>
                                </div>
                                
                                {isActive && location && (
                                  <div className="text-right">
                                    <div className={`text-xs font-semibold text-blue-600 dark:text-blue-400`}>
                                      {location.radius}m
                                    </div>
                                    <div className={`text-xs text-gray-500 dark:text-gray-400 truncate max-w-32`}>
                                      {location.location?.address || 'Không có địa chỉ'}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Schedule Timeline */}
                  <div className="mb-6">
                    <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Chi tiết lịch trình
                    </h3>
                    
                    {timeSlots.filter((s): s is TimeSlot => s != null && typeof s === 'object' && 'isActive' in s && s.isActive === true).length === 0 ? (
                      <div className={`text-center py-8 rounded-xl border-2 border-dashed ${
                        isDarkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50/50'
                      }`}>
                        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                          isDarkMode ? 'bg-gray-600/50' : 'bg-gray-200/50'
                        }`}>
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Chưa có buổi nào được kích hoạt
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          Vui lòng kích hoạt ít nhất một buổi trong phần &quot;Các buổi&quot;
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {timeSlots.filter((s): s is TimeSlot => s != null && typeof s === 'object' && 'isActive' in s && s.isActive === true).map((slot, index) => {
                          // Ensure unique key even if slot.id might be duplicated
                          const uniqueKey = slot.id || `slot-timeline-${index}-${Date.now()}`;
                          return (
                            <div key={uniqueKey} className={`relative p-4 rounded-xl border-2 ${
                            isDarkMode ? 'bg-gray-700/30 border-gray-600/50' : 'bg-gray-50/50 border-gray-200/50'
                          } backdrop-blur-sm`}>
                            {/* Timeline connector */}
                            {index < timeSlots.filter((s): s is TimeSlot => s != null && typeof s === 'object' && 'isActive' in s && s.isActive === true).length - 1 && (
                              <div className={`absolute left-6 top-12 w-0.5 h-8 ${
                                isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                              }`}></div>
                            )}
                            
                            <div className="flex items-start space-x-4">
                              {/* Time indicator */}
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                              }`}>
                                <span className="text-lg">
                                  {index === 0 ? '🌅' : index === 1 ? '☀️' : '🌙'}
                                </span>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {slot.name}
                                  </h4>
                                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    isDarkMode ? 'bg-blue-900/30 text-blue-300 border border-blue-500/30' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {slot.startTime} - {slot.endTime}
                                  </div>
                                </div>
                                
                                {slot.activities ? (
                                  <div className={`p-3 rounded-lg ${
                                    isDarkMode ? 'bg-gray-600/30 border border-gray-500/30' : 'bg-white/80 border border-gray-200/50'
                                  }`}>
                                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                      {slot.activities}
                                    </p>
                                  </div>
                                ) : (
                                  <p className={`text-sm italic ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Chưa có mô tả hoạt động
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                {/* Activity Description & Notes */}
                <div className="mb-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Activity Description */}
                    <div className={`p-3 rounded-lg border ${
                      isDarkMode ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-cyan-50/80 border-cyan-200/50'
                    } backdrop-blur-sm`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-cyan-500/20' : 'bg-cyan-100'}`}>
                          <span className="text-sm">📝</span>
                        </div>
                        <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                          Mô tả hoạt động
                        </h3>
                      </div>
                      {form.description ? (
                        <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                          {form.description}
                        </p>
                      ) : (
                        <p className={`text-xs italic ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Chưa có mô tả hoạt động
                        </p>
                      )}
                    </div>

                    {/* Additional Notes */}
                    <div className={`p-3 rounded-lg border ${
                      isDarkMode ? 'bg-violet-900/20 border-violet-500/30' : 'bg-violet-50/80 border-violet-200/50'
                    } backdrop-blur-sm`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
                          <span className="text-sm">📋</span>
                        </div>
                        <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-violet-400' : 'text-violet-700'}`}>
                          Ghi chú bổ sung
                        </h3>
                      </div>
                      {form.overview ? (
                        <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                          {form.overview}
                        </p>
                      ) : (
                        <p className={`text-xs italic ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Chưa có ghi chú bổ sung
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                  {/* Schedule Summary */}
                  <div className={`p-4 rounded-xl ${
                    isDarkMode ? 'bg-gray-700/30 border border-gray-600/50' : 'bg-gray-50/50 border border-gray-200/50'
                  }`}>
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                      }`}>
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Tóm tắt lịch trình
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <span className="font-medium">Buổi sáng:</span> {timeSlots[0].isActive ? `${timeSlots[0].startTime} - ${timeSlots[0].endTime}` : 'Không hoạt động'}
                        </p>
                        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <span className="font-medium">Buổi chiều:</span> {timeSlots[1].isActive ? `${timeSlots[1].startTime} - ${timeSlots[1].endTime}` : 'Không hoạt động'}
                        </p>
                        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <span className="font-medium">Buổi tối:</span> {timeSlots[2].isActive ? `${timeSlots[2].startTime} - ${timeSlots[2].endTime}` : 'Không hoạt động'}
                        </p>
                      </div>
                      <div>
                        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <span className="font-medium">Trạng thái:</span> {form.status === 'draft' ? 'Nháp' : form.status === 'published' ? 'Đã xuất bản' : form.status === 'ongoing' ? 'Đang diễn ra' : form.status === 'completed' ? 'Đã hoàn thành' : form.status === 'cancelled' ? 'Đã hủy' : 'Tạm hoãn'}
                        </p>
                        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <span className="font-medium">Quyền truy cập:</span> {form.visibility === 'public' ? 'Công khai' : 'Riêng tư'}
                        </p>
                        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <span className="font-medium">Địa điểm:</span> {form.location || 'Chưa cập nhật'}
                        </p>
                      </div>
                    </div>
                  </div>
              </div>

              {/* Submit Button */}
                <div className="flex justify-center pt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                    className={`px-8 py-3 rounded-2xl text-base font-bold transition-all duration-300 ${
                    isLoading
                      ? 'opacity-50 cursor-not-allowed'
                        : 'hover:scale-105 hover:shadow-xl'
                  } ${
                    isDarkMode 
                        ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl' 
                        : 'bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 hover:from-blue-600 hover:via-purple-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                       <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                       Đang tạo hoạt động...
                    </div>
                  ) : (
                     <div className="flex items-center">
                       <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                       </svg>
                       {isEditMode ? 'Cập nhật hoạt động' : 'Tạo hoạt động 1 ngày'}
                     </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
        <Footer />
      </div>

      {/* Success Notification Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`relative w-full max-w-sm rounded-2xl shadow-2xl transform transition-all duration-300 ${
            isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-center p-6 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Thành công!
              </h3>
              
              <p className={`text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {successMessage}
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-center p-6 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-8 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 hover:scale-105 transform shadow-lg"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Locations Modal */}
      {showClearLocationsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`relative w-full max-w-md rounded-2xl shadow-2xl transform transition-all duration-300 ${
            isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-center p-6 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <h3 className={`text-xl font-bold text-center mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Xóa tất cả địa điểm?
              </h3>
              
              <p className={`text-center mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Bạn có chắc chắn muốn xóa tất cả địa điểm đã chọn không? Hành động này không thể hoàn tác.
              </p>

              {/* Changes list */}
              <div className={`rounded-lg p-4 mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Các thay đổi sẽ được thực hiện:
                </h4>
                <ul className="space-y-2">
                  <li className={`flex items-center text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                    Xóa tất cả địa điểm trên bản đồ
                  </li>
                  <li className={`flex items-center text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                    Reset thanh tìm kiếm
                  </li>
                  <li className={`flex items-center text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                    Xóa địa điểm chi tiết của các buổi
                  </li>
                  <li className={`flex items-center text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                    Reset buổi đang chọn
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={() => {
                  setShowClearLocationsModal(false);
                  // Đảm bảo modal thành công cũng được đóng
                  setShowSuccessModal(false);
                }}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-600 text-white hover:bg-gray-500 border border-gray-500' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300'
                } hover:scale-105 transform`}
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  handleClearAllLocations();
                  // Đảm bảo modal thành công cũng được đóng
                  setShowSuccessModal(false);
                }}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 hover:scale-105 transform shadow-lg"
              >
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
