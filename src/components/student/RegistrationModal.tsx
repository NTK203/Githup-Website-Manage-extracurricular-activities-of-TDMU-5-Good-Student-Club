'use client';

import { 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  CalendarRange, 
  UserPlus, 
  Loader2,
  Sunrise,
  Sun,
  Moon
} from 'lucide-react';

interface ScheduleSlot {
  name: string;
  slotKey: 'morning' | 'afternoon' | 'evening';
  startTime: string;
  endTime: string;
  mapLocation?: { lat?: number; lng?: number; address: string; radius?: number } | { lat: number; lng: number; address: string; radius: number };
  detailedLocation?: string;
}

interface DayScheduleData {
  day: number;
  date: string;
  slots: ScheduleSlot[];
  dayMapLocation?: { lat?: number; lng?: number; address: string; radius?: number } | { lat: number; lng: number; address: string; radius: number };
  dayDetailedLocation?: string;
}

interface Activity {
  type: string;
  maxParticipants?: number;
  participants?: Array<any>;
  registrationThreshold?: number;
}

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  parsedScheduleData: DayScheduleData[] | any[];
  selectedDaySlots: Array<{ day: number; slot: 'morning' | 'afternoon' | 'evening' }>;
  onToggleSlot: (day: number, slot: 'morning' | 'afternoon' | 'evening') => void;
  onRegister: () => void;
  isRegistering: boolean;
  isRegistered?: boolean;
  activity: Activity | any | null;
  isDarkMode: boolean;
  calculateRegistrationRate: (day: number, slot: 'morning' | 'afternoon' | 'evening') => number;
  canRegister: (day: number, slot: 'morning' | 'afternoon' | 'evening') => boolean;
  getRegistrationThreshold: () => number;
  calculateTotalRegistrationRate: () => number;
}

export default function RegistrationModal({
  isOpen,
  onClose,
  parsedScheduleData,
  selectedDaySlots,
  onToggleSlot,
  onRegister,
  isRegistering,
  isRegistered = false,
  activity,
  isDarkMode,
  calculateRegistrationRate,
  canRegister,
  getRegistrationThreshold,
  calculateTotalRegistrationRate
}: RegistrationModalProps) {
  if (!isOpen || !activity || parsedScheduleData.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg border max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
      }`}>
        {/* Modal Header */}
        <div className={`px-4 py-3 border-b flex items-center justify-between ${
          isDarkMode ? 'border-blue-600 bg-blue-700' : 'border-blue-500 bg-blue-600'
        }`}>
          <div className="flex items-center gap-2">
            <CalendarRange size={18} className="text-white" />
            <h2 className="text-base font-bold text-white">
              Đăng ký tham gia
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded transition-colors ${
              isDarkMode ? 'hover:bg-blue-600 text-white' : 'hover:bg-blue-700 text-white'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Info Banner */}
        <div className={`px-4 py-2.5 border-b ${
          isDarkMode ? 'bg-blue-600/20 border-blue-600/30' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center justify-center gap-2">
            <AlertCircle size={14} className={isDarkMode ? 'text-blue-300' : 'text-blue-600'} />
            <p className={`text-xs font-semibold ${
              isDarkMode ? 'text-blue-200' : 'text-blue-700'
            }`}>
              Để tham gia hoạt động này, bạn phải chọn đăng ký ít nhất <span className="font-bold text-base">{getRegistrationThreshold()}%</span> tổng số buổi có sẵn
            </p>
          </div>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {parsedScheduleData.map((dayData) => {
              const scheduleDate = new Date(dayData.date);
              const dayDateStr = scheduleDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
              
              // Get locations for all active slots in this day
              const slotLocations: Array<{ slotKey: string; location: string | null }> = [];
              ['morning', 'afternoon', 'evening'].forEach((slotKey) => {
                const slot = dayData.slots.find(s => s.slotKey === slotKey);
                if (slot) {
                  const location = slot.mapLocation?.address || slot.detailedLocation || dayData.dayMapLocation?.address || dayData.dayDetailedLocation || null;
                  slotLocations.push({ slotKey, location });
                }
              });
              
              // Check if all slots have the same location
              const allLocations = slotLocations.map(sl => sl.location).filter(Boolean);
              const uniqueLocations = [...new Set(allLocations)];
              const hasSameLocation = uniqueLocations.length === 1 && allLocations.length > 0;
              const commonLocation = hasSameLocation ? uniqueLocations[0] : null;
              
              return (
                <div
                  key={dayData.day}
                  className={`rounded border ${
                    isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                >
                  {/* Day Header */}
                  <div className={`px-3 py-2 border-b flex items-center justify-between ${
                    isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                      <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Ngày {dayData.day}
                      </h3>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {dayDateStr}
                      </span>
                    </div>
                    {hasSameLocation && commonLocation && (
                      <div className={`flex items-center gap-1.5 text-xs ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <MapPin size={12} />
                        <span className="line-clamp-1">{commonLocation}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Slots Grid */}
                  <div className="p-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {['morning', 'afternoon', 'evening'].map((slotKey) => {
                        const slot = dayData.slots.find(s => s.slotKey === slotKey);
                        const slotName = slotKey === 'morning' ? 'Buổi Sáng' : slotKey === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
                        const SlotIcon = slotKey === 'morning' ? Sunrise : slotKey === 'afternoon' ? Sun : Moon;
                        const isActive = !!slot;
                        const isSelected = selectedDaySlots.some(ds => ds.day === dayData.day && ds.slot === slotKey);
                        const registrationRate = calculateRegistrationRate(dayData.day, slotKey as 'morning' | 'afternoon' | 'evening');
                        const canRegisterSlot = canRegister(dayData.day, slotKey as 'morning' | 'afternoon' | 'evening');
                        const threshold = getRegistrationThreshold();
                      
                        return (
                          <button
                            key={slotKey}
                            onClick={() => isActive && canRegisterSlot && onToggleSlot(dayData.day, slotKey as 'morning' | 'afternoon' | 'evening')}
                            disabled={!isActive || !canRegisterSlot}
                            className={`p-3 rounded border text-left transition-all ${
                              isSelected
                                ? isDarkMode
                                  ? 'bg-blue-600/50 border-blue-400'
                                  : 'bg-blue-200 border-blue-500'
                                : isActive && canRegisterSlot
                                  ? isDarkMode
                                    ? 'bg-gray-700/30 border-gray-600 hover:border-gray-500 hover:bg-gray-700/50'
                                    : 'bg-white border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                                  : isDarkMode
                                    ? 'bg-gray-800/30 border-gray-700 opacity-50 cursor-not-allowed'
                                    : 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {/* Icon */}
                              <div className={`p-1.5 rounded flex-shrink-0 ${
                                isSelected
                                  ? isDarkMode ? 'bg-blue-500/60' : 'bg-blue-300'
                                  : isActive && canRegisterSlot
                                    ? isDarkMode ? 'bg-gray-600/50' : 'bg-gray-100'
                                    : isDarkMode ? 'bg-gray-700/50' : 'bg-gray-200'
                              }`}>
                                <SlotIcon size={14} className={
                                  isSelected
                                    ? isDarkMode ? 'text-blue-200' : 'text-blue-700'
                                    : isActive && canRegisterSlot
                                      ? isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                      : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                } />
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                {/* Header with name and rate */}
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className={`text-sm font-bold ${
                                      isSelected
                                        ? isDarkMode ? 'text-blue-200' : 'text-blue-800'
                                        : isActive && canRegisterSlot
                                          ? isDarkMode ? 'text-white' : 'text-gray-900'
                                          : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                    }`}>
                                      {slotName}
                                    </span>
                                    {isSelected && (
                                      <CheckCircle2 size={14} className={isDarkMode ? 'text-blue-300' : 'text-blue-700'} />
                                    )}
                                  </div>
                                
                                {/* Time */}
                                {slot && (
                                  <div className="mb-1.5">
                                    <div className={`flex items-center gap-1 text-xs ${
                                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                      <Clock size={11} />
                                      <span>{slot.startTime} - {slot.endTime}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Location (if different from common) */}
                                {!hasSameLocation && slot && (() => {
                                  const slotLocation = slot.mapLocation?.address || slot.detailedLocation || dayData.dayMapLocation?.address || dayData.dayDetailedLocation;
                                  if (slotLocation) {
                                    return (
                                      <div className={`flex items-start gap-1 mb-1.5 text-left ${
                                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                      }`}>
                                        <MapPin size={10} className="mt-0.5 flex-shrink-0" />
                                        <span className="text-xs line-clamp-1 text-left">{slotLocation}</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                
                                {/* Status info - Show registered count when not selected */}
                                {!isSelected && isActive && (() => {
                                  let slotRegisteredCount = 0;
                                  if (activity.type === 'multiple_days' && activity.participants) {
                                    slotRegisteredCount = activity.participants.filter((p: any) => {
                                      const approvalStatus = p.approvalStatus || 'pending';
                                      // Only count approved participants
                                      if (approvalStatus !== 'approved') return false;
                                      if (p.registeredDaySlots && Array.isArray(p.registeredDaySlots) && p.registeredDaySlots.length > 0) {
                                        return p.registeredDaySlots.some((ds: any) => ds.day === dayData.day && ds.slot === slotKey);
                                      }
                                      return true;
                                    }).length;
                                  } else {
                                    slotRegisteredCount = activity.participants?.filter((p: any) => {
                                      const approvalStatus = p.approvalStatus || 'pending';
                                      // Only count approved participants
                                      return approvalStatus === 'approved';
                                    }).length || 0;
                                  }
                                  
                                  return (
                                    <div className={`text-xs mt-1.5 pt-1.5 border-t ${
                                      isDarkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-500'
                                    }`}>
                                      {!canRegisterSlot ? (
                                        <span className={`font-medium ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>Đã đầy</span>
                                      ) : (
                                        <div className="flex items-center justify-between">
                                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                                            Số lượng đã đăng ký
                                          </span>
                                          <span className={`font-semibold ${
                                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                          }`}>
                                            {slotRegisteredCount}/{activity.maxParticipants || 0}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                                
                                {/* Selected info */}
                                {isSelected && (() => {
                                  let slotRegisteredCount = 0;
                                  if (activity.type === 'multiple_days' && activity.participants) {
                                    slotRegisteredCount = activity.participants.filter((p: any) => {
                                      const approvalStatus = p.approvalStatus || 'pending';
                                      // Only count approved participants
                                      if (approvalStatus !== 'approved') return false;
                                      if (p.registeredDaySlots && Array.isArray(p.registeredDaySlots) && p.registeredDaySlots.length > 0) {
                                        return p.registeredDaySlots.some((ds: any) => ds.day === dayData.day && ds.slot === slotKey);
                                      }
                                      return true;
                                    }).length;
                                  } else {
                                    slotRegisteredCount = activity.participants?.filter((p: any) => {
                                      const approvalStatus = p.approvalStatus || 'pending';
                                      // Only count approved participants
                                      return approvalStatus === 'approved';
                                    }).length || 0;
                                  }
                                  
                                  return (
                                    <div className={`text-xs mt-1.5 pt-1.5 border-t ${
                                      isDarkMode ? 'border-blue-500/60' : 'border-blue-400'
                                    }`}>
                                      <div className="flex items-center justify-between">
                                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                                          Số lượng đã đăng ký
                                        </span>
                                        <span className={`font-semibold ${
                                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                          {slotRegisteredCount}/{activity.maxParticipants || 0}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`px-4 py-3 border-t flex items-center justify-between gap-3 ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}>
          {/* Left: Summary Info */}
          <div className="flex items-center gap-2 flex-1">
            {selectedDaySlots.length > 0 ? (
              <>
                <span className={`text-sm font-bold px-2 py-1 rounded ${
                  isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'
                }`}>
                  {selectedDaySlots.length} buổi
                </span>
                {(() => {
                  const totalRate = calculateTotalRegistrationRate();
                  const threshold = getRegistrationThreshold();
                  let totalAvailableSlots = 0;
                  if (activity.type === 'multiple_days' && parsedScheduleData.length > 0) {
                    parsedScheduleData.forEach((dayData) => {
                      const activeSlots = dayData.slots.filter(s => s.slotKey).length;
                      totalAvailableSlots += activeSlots;
                    });
                  }
                  
                  return (
                    <>
                      {totalAvailableSlots > 0 && (
                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          / {totalAvailableSlots} buổi
                        </span>
                      )}
                      <span className={`text-sm font-bold px-2 py-1 rounded ${
                        totalRate >= threshold
                          ? isDarkMode 
                            ? 'bg-green-500/20 text-green-300' 
                            : 'bg-green-100 text-green-700'
                          : isDarkMode
                            ? 'bg-orange-500/20 text-orange-300'
                            : 'bg-orange-100 text-orange-700'
                      }`}>
                        {totalRate}%
                      </span>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        / {threshold}%
                      </span>
                      {totalRate >= threshold && (
                        <CheckCircle2 size={14} className={isDarkMode ? 'text-green-300' : 'text-green-600'} />
                      )}
                    </>
                  );
                })()}
              </>
            ) : (
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Chưa chọn buổi nào
              </span>
            )}
          </div>
          
          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Hủy
            </button>
            <button
              onClick={onRegister}
              disabled={(() => {
                if (isRegistering || selectedDaySlots.length === 0) return true;
                if (calculateTotalRegistrationRate() < getRegistrationThreshold()) return true;
                
                // Check if any selected slot is already full
                if (activity.maxParticipants && activity.maxParticipants !== Infinity) {
                  const hasFullSlot = selectedDaySlots.some((ds) => {
                    if (!canRegister(ds.day, ds.slot)) {
                      return true; // This slot is full or cannot be registered
                    }
                    return false;
                  });
                  if (hasFullSlot) return true;
                }
                
                return false;
              })()}
              className={`px-4 py-2 rounded text-sm font-bold transition-all flex items-center gap-2 ${
                (() => {
                  if (isRegistering || selectedDaySlots.length === 0) return true;
                  if (calculateTotalRegistrationRate() < getRegistrationThreshold()) return true;
                  
                  if (activity.maxParticipants && activity.maxParticipants !== Infinity) {
                    const hasFullSlot = selectedDaySlots.some((ds) => !canRegister(ds.day, ds.slot));
                    if (hasFullSlot) return true;
                  }
                  
                  return false;
                })()
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : isDarkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isRegistering ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{isRegistered ? 'Đang cập nhật...' : 'Đang đăng ký...'}</span>
                </>
              ) : (
                <>
                  {isRegistered ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Cập nhật</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span>Đăng ký</span>
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

