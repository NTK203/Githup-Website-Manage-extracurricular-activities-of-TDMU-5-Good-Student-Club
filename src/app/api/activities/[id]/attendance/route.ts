import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Activity from '@/models/Activity';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import mongoose from 'mongoose';
import { AttendanceStatus } from '@/models/Attendance';

// Helper function to populate verifiedBy for attendance records
async function populateVerifiedBy(attendances: any[]) {
  // Extract all unique verifiedBy IDs (handle both ObjectId and string)
  const verifiedByIds: mongoose.Types.ObjectId[] = [];
  const idSet = new Set<string>();
  
  attendances.forEach(att => {
    if (att.verifiedBy) {
      let id: mongoose.Types.ObjectId | null = null;
      if (att.verifiedBy instanceof mongoose.Types.ObjectId) {
        id = att.verifiedBy;
      } else if (typeof att.verifiedBy === 'string') {
        if (mongoose.Types.ObjectId.isValid(att.verifiedBy)) {
          id = new mongoose.Types.ObjectId(att.verifiedBy);
        }
      } else if (att.verifiedBy._id) {
        if (att.verifiedBy._id instanceof mongoose.Types.ObjectId) {
          id = att.verifiedBy._id;
        } else if (mongoose.Types.ObjectId.isValid(att.verifiedBy._id)) {
          id = new mongoose.Types.ObjectId(att.verifiedBy._id);
        }
      }
      
      if (id && !idSet.has(id.toString())) {
        verifiedByIds.push(id);
        idSet.add(id.toString());
      }
    }
  });
  
  if (verifiedByIds.length === 0) return;
  
  // Fetch all users at once
  const users = await User.find({ _id: { $in: verifiedByIds } }).select('name email');
  const userMap = new Map(users.map(u => [u._id.toString(), u]));
  
  // Populate verifiedBy for each attendance record
  attendances.forEach(att => {
    // If verifiedByName exists (manual check-in), use it and don't populate
    if (att.verifiedByName) {
      // Create object structure for consistency
      att.verifiedBy = {
        _id: att.verifiedBy ? (att.verifiedBy instanceof mongoose.Types.ObjectId ? att.verifiedBy.toString() : (typeof att.verifiedBy === 'string' ? att.verifiedBy : att.verifiedBy._id?.toString() || '')) : '',
        name: att.verifiedByName,
        email: att.verifiedByEmail || ''
      };
      return;
    }
    
    // Otherwise, populate from database
    if (att.verifiedBy) {
      let idString: string | null = null;
      
      // Extract ID string from various formats
      if (att.verifiedBy instanceof mongoose.Types.ObjectId) {
        idString = att.verifiedBy.toString();
      } else if (typeof att.verifiedBy === 'string') {
        if (mongoose.Types.ObjectId.isValid(att.verifiedBy)) {
          idString = att.verifiedBy;
        }
      } else if (att.verifiedBy._id) {
        if (att.verifiedBy._id instanceof mongoose.Types.ObjectId) {
          idString = att.verifiedBy._id.toString();
        } else if (typeof att.verifiedBy._id === 'string' && mongoose.Types.ObjectId.isValid(att.verifiedBy._id)) {
          idString = att.verifiedBy._id;
        }
      }
      
      if (idString) {
        const user = userMap.get(idString);
        if (user) {
          att.verifiedBy = {
            _id: user._id.toString(),
            name: user.name || user.email || 'Người quản trị', // Ensure name is never null/empty
            email: user.email || ''
          };
        } else {
          // If user not found, log for debugging
          console.warn(`User with ID ${idString} not found in database`);
          att.verifiedBy = {
            _id: idString,
            name: 'Người quản trị',
            email: ''
          };
        }
      }
    }
  });
}

// GET - Get attendance list for an activity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission
    const allowedRoles = ['CLUB_DEPUTY', 'OFFICER', 'CLUB_MEMBER', 'CLUB_LEADER', 'ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền xem điểm danh' },
        { status: 403 }
      );
    }

    const { id: activityId } = await params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(activityId)) {
      return NextResponse.json(
        { success: false, message: 'ID hoạt động không hợp lệ' },
        { status: 400 }
      );
    }

    // Find the activity
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy hoạt động' },
        { status: 404 }
      );
    }

    // Get all approved participants
    const approvedParticipants = activity.participants.filter(
      (p: any) => p.approvalStatus === 'approved'
    );

    // Get all attendance documents for this activity (one per user)
    const attendanceDocs = await Attendance.find({ 
      activityId: new mongoose.Types.ObjectId(activityId) 
    })
      .populate('userId', 'name email studentId');

    // Collect all attendance records to populate verifiedBy efficiently
    // Create a map to track which records belong to which user (by attendance _id)
    const attendanceRecordMap = new Map<string, any>(); // Map attendance _id to record
    const allAttendanceRecords: any[] = [];
    
    attendanceDocs.forEach(doc => {
      const records = doc.attendances || [];
      records.forEach((att: any) => {
        const attId = att._id.toString();
        attendanceRecordMap.set(attId, att);
        allAttendanceRecords.push(att);
      });
    });
    
    // Populate verifiedBy for all records at once (this modifies the objects in place)
    await populateVerifiedBy(allAttendanceRecords);

    // Build participants list with attendance info
    const participantsWithAttendance = approvedParticipants.map((p: any) => {
      const userId = p.userId.toString();
      // Find attendance document for this user
      const attendanceDoc = attendanceDocs.find((doc: any) => 
        doc.userId._id.toString() === userId
      );
      
      // Get all attendance records from the document
      // Use the records from attendanceRecordMap which have been populated
      const rawAttendances = (attendanceDoc && attendanceDoc.attendances && Array.isArray(attendanceDoc.attendances))
        ? attendanceDoc.attendances
        : [];
      
      const attendances = rawAttendances.map((att: any) => {
        // Get the populated record from the map (if exists)
        const attId = att._id.toString();
        const populatedAtt = attendanceRecordMap.get(attId) || att;
        
        return {
          _id: populatedAtt._id,
          timeSlot: populatedAtt.timeSlot,
          checkInType: populatedAtt.checkInType,
          checkInTime: populatedAtt.checkInTime,
          location: populatedAtt.location,
          photoUrl: populatedAtt.photoUrl,
          status: populatedAtt.status,
          verifiedBy: populatedAtt.verifiedBy, // This should now be populated with name and email
          verifiedByName: populatedAtt.verifiedByName || null, // Include verifiedByName for manual check-ins
          verifiedByEmail: populatedAtt.verifiedByEmail || null, // Include verifiedByEmail for manual check-ins
          verifiedAt: populatedAtt.verifiedAt,
          verificationNote: populatedAtt.verificationNote,
          cancelReason: populatedAtt.cancelReason || null,
          lateReason: populatedAtt.lateReason || null,
          dayNumber: populatedAtt.dayNumber,
          slotDate: populatedAtt.slotDate
        };
      });
      
      // Check if has any approved attendance
      const hasApprovedAttendance = attendances.some((a: any) => a.status === 'approved');
      
      // Get studentId from populated userId or from participant
      let studentId: string | undefined = undefined;
      const attendanceDocForUser = attendanceDocs.find((doc: any) => 
        doc.userId._id.toString() === userId
      );
      if (attendanceDocForUser && attendanceDocForUser.userId && typeof attendanceDocForUser.userId === 'object') {
        studentId = attendanceDocForUser.userId.studentId;
      }
      
      return {
        userId: p.userId,
        name: p.name,
        email: p.email,
        role: p.role,
        studentId: studentId || p.studentId, // Include studentId
        checkedIn: hasApprovedAttendance,
        checkedInAt: attendances.length > 0 ? attendances[0].checkInTime : null,
        attendances: attendances,
        registeredDaySlots: p.registeredDaySlots || []
      };
    });

    // Calculate statistics
    const totalParticipants = approvedParticipants.length;
    const checkedInCount = participantsWithAttendance.filter((p: any) => p.checkedIn).length;
    const notCheckedInCount = totalParticipants - checkedInCount;

    // Helper function to check if participant is registered for a slot
    const isParticipantRegisteredForSlot = (participant: any, day: number | undefined, slotName: string): boolean => {
      if (!participant.registeredDaySlots || participant.registeredDaySlots.length === 0) {
        // If no registeredDaySlots, assume registered for all (backward compatibility)
        return true;
      }

      // Map slot names for matching
      const slotNameMap: { [key: string]: string } = {
        'Buổi Sáng': 'morning',
        'Buổi Chiều': 'afternoon',
        'Buổi Tối': 'evening',
        'morning': 'morning',
        'afternoon': 'afternoon',
        'evening': 'evening'
      };

      // Extract slot name from timeSlot format (e.g., "Ngày 1 - Buổi Sáng" -> "Buổi Sáng")
      let normalizedSlotName = slotName;
      if (slotName.includes('Ngày') && slotName.includes(' - ')) {
        const parts = slotName.split(' - ');
        if (parts.length > 1) {
          normalizedSlotName = parts.slice(1).join(' - ').trim();
        }
      }

      const slotKey = slotNameMap[normalizedSlotName] || normalizedSlotName.toLowerCase();

      // For single_day activities, day is undefined - check if registered for any day with this slot
      if (day === undefined) {
        return participant.registeredDaySlots.some((ds: any) => {
          const registeredSlotKey = slotNameMap[ds.slot] || ds.slot?.toLowerCase();
          return registeredSlotKey === slotKey;
        });
      }

      // For multiple_days activities, check specific day and slot
      return participant.registeredDaySlots.some((ds: any) => {
        const registeredSlotKey = slotNameMap[ds.slot] || ds.slot?.toLowerCase();
        return ds.day === day && registeredSlotKey === slotKey;
      });
    };

    // Calculate attendance rate based on registered slots
    let totalRegisteredSlots = 0;
    let totalAttendedSlots = 0;

    if (activity.type === 'single_day' && activity.timeSlots) {
      const activeSlots = activity.timeSlots.filter((s: any) => s.isActive);
      
      participantsWithAttendance.forEach((participant: any) => {
        activeSlots.forEach((slot: any) => {
          // Check if participant registered for this slot
          const isRegistered = isParticipantRegisteredForSlot(participant, undefined, slot.name);
          
          if (isRegistered) {
            totalRegisteredSlots++;
            
            // Check if participant has at least one approved check-in for this slot
            const startAttendance = participant.attendances?.find((a: any) => 
              a.timeSlot === slot.name && a.checkInType === 'start'
            );
            const endAttendance = participant.attendances?.find((a: any) => 
              a.timeSlot === slot.name && a.checkInType === 'end'
            );
            
            if (startAttendance?.status === 'approved' || endAttendance?.status === 'approved') {
              totalAttendedSlots++;
            }
          }
        });
      });
    } else if (activity.type === 'multiple_days' && activity.schedule) {
      const dayTimeSlots = activity.timeSlots?.filter((s: any) => s.isActive) || [];
      const slotsToUse = dayTimeSlots.length > 0 ? dayTimeSlots : [
        { name: 'Buổi Sáng', id: 'morning', startTime: '08:00', endTime: '11:30', isActive: true },
        { name: 'Buổi Chiều', id: 'afternoon', startTime: '13:00', endTime: '17:00', isActive: true },
        { name: 'Buổi Tối', id: 'evening', startTime: '18:00', endTime: '21:00', isActive: true }
      ];

      activity.schedule.forEach((scheduleDay: any) => {
        const dayNumber = scheduleDay.day;
        const dayDateString = scheduleDay.date;

        slotsToUse.forEach((slot: any) => {
          participantsWithAttendance.forEach((participant: any) => {
            // Check if participant registered for this day and slot
            const isRegistered = isParticipantRegisteredForSlot(participant, dayNumber, slot.name);
            
            if (isRegistered) {
              totalRegisteredSlots++;
              
              // Check if participant has at least one approved check-in for this slot
              // Match timeSlot format: "Ngày X - Buổi Y"
              const timeSlotFormat = `Ngày ${dayNumber} - ${slot.name}`;
              const startAttendance = participant.attendances?.find((a: any) => {
                // Handle both "Ngày X - Buổi Y" format and just "Buổi Y" format
                const matchesFormat = a.timeSlot === timeSlotFormat || 
                  (a.timeSlot === slot.name && a.dayNumber === dayNumber);
                return matchesFormat && a.checkInType === 'start';
              });
              const endAttendance = participant.attendances?.find((a: any) => {
                const matchesFormat = a.timeSlot === timeSlotFormat || 
                  (a.timeSlot === slot.name && a.dayNumber === dayNumber);
                return matchesFormat && a.checkInType === 'end';
              });
              
              if (startAttendance?.status === 'approved' || endAttendance?.status === 'approved') {
                totalAttendedSlots++;
              }
            }
          });
        });
      });
    }

    // Calculate attendance rate based on slots
    const attendanceRate = totalRegisteredSlots > 0 
      ? Math.round((totalAttendedSlots / totalRegisteredSlots) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        activity: {
          _id: activity._id,
          name: activity.name,
          date: activity.date,
          location: activity.location,
          locationData: activity.locationData,
          timeSlots: activity.timeSlots,
          multiTimeLocations: activity.multiTimeLocations
        },
        participants: participantsWithAttendance,
        statistics: {
          total: totalParticipants,
          checkedIn: checkedInCount,
          notCheckedIn: notCheckedInCount,
          attendanceRate: attendanceRate
        }
      }
    });

  } catch (error: any) {
    console.error('Error getting attendance:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Lỗi khi lấy danh sách điểm danh',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate distance between two GPS coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
}

// Helper function to validate location (check if within allowed radius)
function validateLocation(
  userLat: number,
  userLng: number,
  activity: any,
  dayNumber?: number,
  slotDate?: string,
  timeSlot?: string
): { valid: boolean; distance?: number; message?: string } {
  // If no location data is required, allow check-in
  if (!activity.locationData && (!activity.multiTimeLocations || activity.multiTimeLocations.length === 0) &&
      (!activity.dailyLocations || Object.keys(activity.dailyLocations).length === 0) &&
      (!activity.weeklySlotLocations || Object.keys(activity.weeklySlotLocations).length === 0)) {
    return { valid: true, message: 'Hoạt động không yêu cầu vị trí cụ thể' };
  }

  // For multiple days activities, check dailyLocations or weeklySlotLocations
  if (activity.type === 'multiple_days' && dayNumber !== undefined) {
    console.log('Validating location for multiple days:', {
      dayNumber,
      timeSlot,
      hasWeeklySlotLocations: !!activity.weeklySlotLocations,
      hasDailyLocations: !!activity.dailyLocations,
      hasSchedule: !!activity.schedule,
      scheduleLength: activity.schedule ? activity.schedule.length : 0,
      weeklySlotLocations: activity.weeklySlotLocations,
      dailyLocations: activity.dailyLocations
    });
    
    // Check weeklySlotLocations first (most specific: day + slot)
    if (activity.weeklySlotLocations && activity.weeklySlotLocations[dayNumber]) {
      const dayLocations = activity.weeklySlotLocations[dayNumber];
      // Convert timeSlot from "Buổi Tối" or "Ngày X - Buổi Y" to "evening", etc.
      const slotKeyMap: { [key: string]: string } = {
        'Buổi Sáng': 'morning',
        'Buổi Chiều': 'afternoon',
        'Buổi Tối': 'evening'
      };
      
      // Extract slot name from timeSlot if it's in "Ngày X - Buổi Y" format
      let slotName = timeSlot || '';
      if (timeSlot && timeSlot.includes(' - ')) {
        // Extract "Buổi Y" from "Ngày X - Buổi Y"
        const match = timeSlot.match(/Buổi (Sáng|Chiều|Tối)/);
        if (match) {
          slotName = `Buổi ${match[1]}`;
        }
      }
      
      const slotKey = slotName ? slotKeyMap[slotName] : null;
      
      console.log('Checking weeklySlotLocations:', {
        dayNumber,
        originalTimeSlot: timeSlot,
        extractedSlotName: slotName,
        slotKey,
        dayLocations,
        hasSlotLocation: slotKey ? !!dayLocations[slotKey] : false
      });
      
      if (slotKey && dayLocations[slotKey]) {
        const slotLocation = dayLocations[slotKey];
        if (slotLocation.lat && slotLocation.lng && slotLocation.radius) {
          const distance = calculateDistance(
            userLat,
            userLng,
            slotLocation.lat,
            slotLocation.lng
          );
          
          if (distance <= slotLocation.radius) {
            return { valid: true, distance };
          } else {
            return {
              valid: false,
              distance,
              message: `Bạn đang cách vị trí hoạt động ${distance.toFixed(0)}m. Vui lòng đến đúng vị trí (trong bán kính ${slotLocation.radius}m) để điểm danh.`
            };
          }
        }
      }
    }
    
    // Check dailyLocations (location for the entire day)
    if (activity.dailyLocations && activity.dailyLocations[dayNumber]) {
      const dayLocation = activity.dailyLocations[dayNumber];
      console.log('Checking dailyLocations:', {
        dayNumber,
        dayLocation,
        hasLatLng: !!(dayLocation.lat && dayLocation.lng)
      });
      
      if (dayLocation.lat && dayLocation.lng && dayLocation.radius) {
        const distance = calculateDistance(
          userLat,
          userLng,
          dayLocation.lat,
          dayLocation.lng
        );
        
        if (distance <= dayLocation.radius) {
          return { valid: true, distance };
        } else {
          return {
            valid: false,
            distance,
            message: `Bạn đang cách vị trí hoạt động ${distance.toFixed(0)}m. Vui lòng đến đúng vị trí (trong bán kính ${dayLocation.radius}m) để điểm danh.`
          };
        }
      }
    }
    
    // Check schedule data (location might be stored in schedule instead)
    if (activity.schedule && Array.isArray(activity.schedule)) {
      const dayData = activity.schedule.find((s: any) => (s.day || activity.schedule.indexOf(s) + 1) === dayNumber);
      if (dayData) {
        // Extract slot name from timeSlot
        let slotName = timeSlot || '';
        if (timeSlot && timeSlot.includes(' - ')) {
          const match = timeSlot.match(/Buổi (Sáng|Chiều|Tối)/);
          if (match) {
            slotName = `Buổi ${match[1]}`;
          }
        }
        
        // Map slot name to slotKey
        const slotKeyMap: { [key: string]: string } = {
          'Buổi Sáng': 'morning',
          'Buổi Chiều': 'afternoon',
          'Buổi Tối': 'evening'
        };
        const slotKey = slotName ? slotKeyMap[slotName] : null;
        
        console.log('Checking schedule for location:', {
          dayNumber,
          originalTimeSlot: timeSlot,
          extractedSlotName: slotName,
          slotKey,
          hasDayData: !!dayData,
          hasSlots: !!dayData.slots,
          slotsLength: dayData.slots ? dayData.slots.length : 0,
          hasActivities: !!dayData.activities
        });
        
        // Check slot-specific location first (structured data)
        if (slotKey && dayData.slots && Array.isArray(dayData.slots)) {
          const slot = dayData.slots.find((s: any) => s.slotKey === slotKey);
          if (slot && slot.mapLocation && slot.mapLocation.lat && slot.mapLocation.lng) {
            const slotLocation = slot.mapLocation;
            const radius = slotLocation.radius || 200;
            const distance = calculateDistance(
              userLat,
              userLng,
              slotLocation.lat,
              slotLocation.lng
            );
            
            console.log('Found slot location in schedule.slots:', {
              dayNumber,
              slotKey,
              location: { lat: slotLocation.lat, lng: slotLocation.lng, radius },
              distance,
              valid: distance <= radius
            });
            
            if (distance <= radius) {
              return { valid: true, distance };
            } else {
              return {
                valid: false,
                distance,
                message: `Bạn đang cách vị trí điểm danh (Ngày ${dayNumber} - ${slotName}) ${distance.toFixed(0)}m. Vui lòng đến đúng vị trí (trong bán kính ${radius}m) để điểm danh.`
              };
            }
          }
        }
        
        // Parse location from activities string if structured data not available
        if (dayData.activities && typeof dayData.activities === 'string' && slotName) {
          // Try to extract location for specific slot from activities string
          // Format: "Buổi Chiều (14:28-17:00) - Địa điểm map: ... (10.97549, 106.68699) - Bán kính: 200m"
          const slotPattern = new RegExp(`${slotName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*\\(([0-9.]+),\\s*([0-9.]+)\\)[^\\n]*Bán kính:\\s*(\\d+)m`, 'i');
          const match = dayData.activities.match(slotPattern);
          
          if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            const radius = parseInt(match[3]) || 200;
            
            if (!isNaN(lat) && !isNaN(lng)) {
              const distance = calculateDistance(userLat, userLng, lat, lng);
              
              console.log('Found slot location from activities string:', {
                dayNumber,
                slotName,
                location: { lat, lng, radius },
                distance,
                valid: distance <= radius
              });
              
              if (distance <= radius) {
                return { valid: true, distance };
              } else {
                return {
                  valid: false,
                  distance,
                  message: `Bạn đang cách vị trí điểm danh (Ngày ${dayNumber} - ${slotName}) ${distance.toFixed(0)}m. Vui lòng đến đúng vị trí (trong bán kính ${radius}m) để điểm danh.`
                };
              }
            }
          }
        }
        
        // Check day-level location (structured data)
        if (dayData.dayMapLocation && dayData.dayMapLocation.lat && dayData.dayMapLocation.lng) {
          const dayLocation = dayData.dayMapLocation;
          const radius = dayLocation.radius || 200;
          const distance = calculateDistance(
            userLat,
            userLng,
            dayLocation.lat,
            dayLocation.lng
          );
          
          console.log('Found day location in schedule.dayMapLocation:', {
            dayNumber,
            location: { lat: dayLocation.lat, lng: dayLocation.lng, radius },
            distance,
            valid: distance <= radius
          });
          
          if (distance <= radius) {
            return { valid: true, distance };
          } else {
            return {
              valid: false,
              distance,
              message: `Bạn đang cách vị trí hoạt động (Ngày ${dayNumber}) ${distance.toFixed(0)}m. Vui lòng đến đúng vị trí (trong bán kính ${radius}m) để điểm danh.`
            };
          }
        }
        
        // Parse day-level location from activities string if structured data not available
        if (dayData.activities && typeof dayData.activities === 'string') {
          // Try to extract day-level location (last location in activities string)
          // Format: "Địa điểm map: ... (10.97549, 106.68699) - Bán kính: 200m"
          const dayLocationPattern = /Địa điểm map:[^(]*\(([0-9.]+),\s*([0-9.]+)\)[^\\n]*Bán kính:\s*(\d+)m/g;
          const matches = [...dayData.activities.matchAll(dayLocationPattern)];
          
          // Get the last match (day-level location, usually at the end)
          if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            const lat = parseFloat(lastMatch[1]);
            const lng = parseFloat(lastMatch[2]);
            const radius = parseInt(lastMatch[3]) || 200;
            
            if (!isNaN(lat) && !isNaN(lng)) {
              const distance = calculateDistance(userLat, userLng, lat, lng);
              
              console.log('Found day location from activities string:', {
                dayNumber,
                location: { lat, lng, radius },
                distance,
                valid: distance <= radius
              });
              
              if (distance <= radius) {
                return { valid: true, distance };
              } else {
                return {
                  valid: false,
                  distance,
                  message: `Bạn đang cách vị trí hoạt động (Ngày ${dayNumber}) ${distance.toFixed(0)}m. Vui lòng đến đúng vị trí (trong bán kính ${radius}m) để điểm danh.`
                };
              }
            }
          }
        }
      }
    }
    
    // If no location found for multiple days, don't fallback to activity.locationData
    // This is important - we should only check against specific slot/day locations
    console.log('No specific location found for multiple days:', {
      dayNumber,
      timeSlot,
      hasWeeklySlotLocations: !!activity.weeklySlotLocations,
      hasDailyLocations: !!activity.dailyLocations,
      hasLocationData: !!activity.locationData,
      weeklySlotLocations: activity.weeklySlotLocations ? Object.keys(activity.weeklySlotLocations) : [],
      dailyLocations: activity.dailyLocations ? Object.keys(activity.dailyLocations) : []
    });
    
    // For multiple days, if no specific location found, we should still validate
    // But we need to check if there's any location data at all
    // If no location requirement, allow check-in
    if (!activity.locationData && (!activity.multiTimeLocations || activity.multiTimeLocations.length === 0)) {
      console.log('No location data found for multiple days, allowing check-in');
      return { valid: true, message: 'Hoạt động không yêu cầu vị trí cụ thể cho ngày này' };
    }
    
    // IMPORTANT: For multiple days, don't fallback to activity.locationData
    // Return error if no specific location found
    console.warn('Multiple days activity but no specific location found for day/slot, rejecting check-in');
    return {
      valid: false,
      message: 'Không tìm thấy vị trí điểm danh cho buổi này. Vui lòng liên hệ quản trị viên.'
    };
  }

  // Check single location (ONLY for single day activities, NOT for multiple days)
  if (activity.type !== 'multiple_days' && activity.locationData && activity.locationData.lat && activity.locationData.lng && activity.locationData.radius) {
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

  // Check multi-time locations (for single day or fallback for multiple days)
  if (activity.multiTimeLocations && activity.multiTimeLocations.length > 0) {
    // Check against all locations and find if any is within radius
    for (const mtl of activity.multiTimeLocations) {
      if (mtl.location && mtl.location.lat && mtl.location.lng && mtl.radius) {
        const distance = calculateDistance(
          userLat,
          userLng,
          mtl.location.lat,
          mtl.location.lng
        );
        
        if (distance <= mtl.radius) {
          return { valid: true, distance };
        }
      }
    }

    // If not within any location, find the closest one
    let minDistance = Infinity;
    let closestLocation = null;

    for (const mtl of activity.multiTimeLocations) {
      if (mtl.location && mtl.location.lat && mtl.location.lng && mtl.radius) {
        const distance = calculateDistance(
          userLat,
          userLng,
          mtl.location.lat,
          mtl.location.lng
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestLocation = mtl;
        }
      }
    }

    if (closestLocation && closestLocation.location && closestLocation.radius) {
      const timeSlotNames: { [key: string]: string } = {
        'morning': 'Buổi Sáng',
        'afternoon': 'Buổi Chiều',
        'evening': 'Buổi Tối'
      };
      return {
        valid: false,
        distance: minDistance,
        message: `Bạn đang cách vị trí ${timeSlotNames[closestLocation.timeSlot] || 'hoạt động'} ${minDistance.toFixed(0)}m. Vui lòng đến đúng vị trí (trong bán kính ${closestLocation.radius}m) để điểm danh.`
      };
    }
  }

  // Default: allow check-in if no specific location requirement
  return { valid: true };
}

// Helper function to validate time (check if within 15 minutes window)
function validateTime(
  checkInTime: Date,
  activity: any,
  timeSlot: string,
  checkInType: string,
  slotDate?: string,
  dayNumber?: number
): { valid: boolean; isOnTime: boolean; isLate: boolean; isEarly: boolean; message?: string } {
  try {
    // For multiple days activities, use slotDate if provided
    let activityDate: Date;
    if (activity.type === 'multiple_days' && slotDate) {
      activityDate = new Date(slotDate);
    } else if (activity.type === 'multiple_days' && dayNumber !== undefined && activity.schedule) {
      // Find the date from schedule
      const daySchedule = activity.schedule.find((s: any) => s.day === dayNumber);
      if (daySchedule && daySchedule.date) {
        activityDate = new Date(daySchedule.date);
      } else {
        // Fallback to startDate
        activityDate = new Date(activity.startDate || activity.date);
      }
    } else {
      // For single day activities, use activity.date
      activityDate = new Date(activity.date);
    }
    
    const activityDateOnly = new Date(
      activityDate.getFullYear(),
      activityDate.getMonth(),
      activityDate.getDate()
    );
    
    const checkInDateOnly = new Date(
      checkInTime.getFullYear(),
      checkInTime.getMonth(),
      checkInTime.getDate()
    );

    // Check if same day
    if (activityDateOnly.getTime() !== checkInDateOnly.getTime()) {
      return {
        valid: false,
        isOnTime: false,
        isLate: false,
        isEarly: false,
        message: 'Ngày điểm danh không khớp với ngày hoạt động'
      };
    }

    // Find the time slot
    let slot: any = null;
    
    // For multiple days, try to parse slot from schedule or use timeSlots
    if (activity.type === 'multiple_days') {
      // First, try to find slot from timeSlots (they might be shared across days)
      if (activity.timeSlots) {
        slot = activity.timeSlots.find((ts: any) => ts.name === timeSlot && ts.isActive);
      }
      
      // If not found, try to parse from schedule activities text
      if (!slot && dayNumber !== undefined && activity.schedule) {
        const daySchedule = activity.schedule.find((s: any) => s.day === dayNumber);
        if (daySchedule && daySchedule.activities) {
          // Parse activities text to find slot
          // Format: "Buổi Sáng (07:00-11:30) - ..." or "Buổi Chiều (13:00-17:30) - ..." or "Buổi Tối (19:00-22:00) - ..."
          const activitiesText = daySchedule.activities;
          const lines = activitiesText.split('\n').filter((line: string) => line.trim());
          
          for (const line of lines) {
            // Match: "Buổi Sáng/Chiều/Tối (HH:MM-HH:MM)"
            const slotMatch = line.match(/^Buổi (Sáng|Chiều|Tối)\s*\((\d{2}:\d{2})-(\d{2}:\d{2})\)/);
            if (slotMatch) {
              const slotName = slotMatch[1];
              const slotNameFull = `Buổi ${slotName}`;
              
              if (slotNameFull === timeSlot) {
                slot = {
                  name: slotNameFull,
                  startTime: slotMatch[2],
                  endTime: slotMatch[3],
                  isActive: true
                };
                break;
              }
            }
          }
        }
      }
    } else {
      // For single day, check timeSlots
      if (activity.timeSlots) {
        slot = activity.timeSlots.find((ts: any) => ts.name === timeSlot && ts.isActive);
      }
    }
    
    if (!slot) {
      console.log('Slot not found:', {
        activityType: activity.type,
        timeSlot,
        dayNumber,
        hasTimeSlots: !!activity.timeSlots,
        timeSlotsCount: activity.timeSlots?.length || 0,
        hasSchedule: !!activity.schedule,
        scheduleCount: activity.schedule?.length || 0
      });
      return {
        valid: false,
        isOnTime: false,
        isLate: false,
        isEarly: false,
        message: 'Không tìm thấy buổi điểm danh'
      };
    }

    // Parse start and end times
    const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
    const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
    
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

    // Window 1: On-time window (auto-approve): 15 minutes before and 15 minutes after
    const onTimeStart = new Date(targetTime);
    onTimeStart.setMinutes(onTimeStart.getMinutes() - 15);
    const onTimeEnd = new Date(targetTime);
    onTimeEnd.setMinutes(onTimeEnd.getMinutes() + 15);

    // Window 2: Late window (pending, needs officer approval): from 15 minutes after to 30 minutes after
    // (Additional +15 minutes for late check-in)
    const lateWindowStart = new Date(targetTime);
    lateWindowStart.setMinutes(lateWindowStart.getMinutes() + 15);
    const lateWindowEnd = new Date(targetTime);
    lateWindowEnd.setMinutes(lateWindowEnd.getMinutes() + 30);

    // Check if within on-time window (auto-approve)
    if (checkInTime >= onTimeStart && checkInTime <= onTimeEnd) {
      return {
        valid: true,
        isOnTime: true,
        isLate: false,
        isEarly: false
      };
    }

    // Check if within late window (pending, needs officer approval)
    if (checkInTime > onTimeEnd && checkInTime <= lateWindowEnd) {
      return {
        valid: true, // Valid for check-in but needs approval
        isOnTime: false,
        isLate: true,
        isEarly: false,
        message: 'Điểm danh trong cửa sổ trễ (cần xét duyệt)'
      };
    }

    // Check if early (before on-time window)
    if (checkInTime < onTimeStart) {
      return {
        valid: false,
        isOnTime: false,
        isLate: false,
        isEarly: true,
        message: 'Điểm danh sớm hơn thời gian cho phép'
      };
    }

    // Check if too late (after late window - more than 30 minutes after)
    if (checkInTime > lateWindowEnd) {
      return {
        valid: false,
        isOnTime: false,
        isLate: true,
        isEarly: false,
        message: 'Điểm danh quá trễ (quá 30 phút sau giờ quy định)'
      };
    }

    return {
      valid: false,
      isOnTime: false,
      isLate: false,
      isEarly: false,
      message: 'Thời gian điểm danh không hợp lệ'
    };
  } catch (e) {
    console.error('Error validating time:', e);
    return {
      valid: false,
      isOnTime: false,
      isLate: false,
      isEarly: false,
      message: 'Lỗi khi kiểm tra thời gian'
    };
  }
}

// PATCH - Mark attendance (check-in/check-out)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission
    const isOfficer = ['CLUB_DEPUTY', 'OFFICER', 'CLUB_MEMBER', 'CLUB_LEADER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role);
    const isStudent = user.role === 'STUDENT' || user.role === 'CLUB_STUDENT';
    
    if (!isOfficer && !isStudent) {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền điểm danh' },
        { status: 403 }
      );
    }

    const { id: activityId } = await params;
    const body = await request.json();
    let { userId, checkedIn, location, photoUrl, timeSlot, checkInType, checkInTime, lateReason, dayNumber, slotDate, isManualCheckIn, verificationNote } = body;
    
    // For multiple days activities, convert timeSlot to "Ngày X - Buổi Y" format
    if (dayNumber !== undefined && timeSlot && !timeSlot.includes('Ngày')) {
      // timeSlot is "Buổi Sáng", "Buổi Chiều", or "Buổi Tối"
      // Convert to "Ngày X - Buổi Y" format
      timeSlot = `Ngày ${dayNumber} - ${timeSlot}`;
      console.log('Converted timeSlot for multiple days:', {
        original: body.timeSlot,
        dayNumber,
        converted: timeSlot
      });
    }
    
    // Log request data for debugging (before loading activity)
    console.log('Check-in request:', {
      activityId,
      userId,
      checkedIn,
      timeSlot,
      checkInType,
      dayNumber,
      slotDate,
      hasLocation: !!location,
      hasPhotoUrl: !!photoUrl,
      hasLateReason: !!lateReason,
      lateReasonLength: lateReason ? String(lateReason).length : 0
    });

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(activityId)) {
      return NextResponse.json(
        { success: false, message: 'ID hoạt động không hợp lệ' },
        { status: 400 }
      );
    }

    if (!userId || typeof checkedIn !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc (userId, checkedIn)' },
        { status: 400 }
      );
    }

    // Students can only check themselves in
    if (isStudent && userId !== user.userId) {
      return NextResponse.json(
        { success: false, message: 'Bạn chỉ có thể điểm danh cho chính mình' },
        { status: 403 }
      );
    }

    // Find the activity
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy hoạt động' },
        { status: 404 }
      );
    }
    
    // Log activity info after loading
    console.log('Activity loaded:', {
      activityId: activity._id,
      activityType: activity.type,
      hasWeeklySlotLocations: !!activity.weeklySlotLocations,
      hasDailyLocations: !!activity.dailyLocations,
      hasLocationData: !!activity.locationData,
      hasMultiTimeLocations: !!(activity.multiTimeLocations && activity.multiTimeLocations.length > 0)
    });

    // Convert userId to ObjectId for comparison
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find participant
    const participant = activity.participants.find((p: any) => {
      const participantUserId = p.userId instanceof mongoose.Types.ObjectId
        ? p.userId.toString()
        : String(p.userId);
      return participantUserId === userObjectId.toString();
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy người tham gia' },
        { status: 404 }
      );
    }

    // Check if participant is approved
    if (participant.approvalStatus !== 'approved') {
      return NextResponse.json(
        { success: false, message: 'Chỉ có thể điểm danh cho người tham gia đã được duyệt' },
        { status: 400 }
      );
    }

    // Get user info for attendance record
    const studentUser = await User.findById(userId);
    if (!studentUser) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    if (checkedIn) {
      // Validate required fields for check-in
      if (!timeSlot || !checkInType) {
        return NextResponse.json(
          { success: false, message: 'Thiếu thông tin bắt buộc (timeSlot, checkInType)' },
          { status: 400 }
        );
      }

      // Validate location - ensure it's an object with valid lat and lng
      if (!location || typeof location !== 'object') {
        return NextResponse.json(
          { success: false, message: 'Thiếu thông tin vị trí' },
          { status: 400 }
        );
      }

      // Validate lat and lng are numbers and not NaN
      if (typeof location.lat !== 'number' || typeof location.lng !== 'number' ||
          isNaN(location.lat) || isNaN(location.lng)) {
        console.error('Invalid location data received:', location);
        return NextResponse.json(
          { success: false, message: 'Vị trí không hợp lệ. Vui lòng thử lại.' },
          { status: 400 }
        );
      }

      // Parse checkInTime from request (when photo was captured), or use current time
      let checkInTimeDate: Date;
      if (checkInTime && typeof checkInTime === 'string') {
        try {
          checkInTimeDate = new Date(checkInTime);
          if (isNaN(checkInTimeDate.getTime())) {
            checkInTimeDate = new Date(); // Fallback to current time if invalid
          }
        } catch (e) {
          checkInTimeDate = new Date(); // Fallback to current time if error
        }
      } else {
        checkInTimeDate = new Date(); // Use current time if not provided
      }

      // IMPORTANT: Validate location - if invalid, reject immediately
      // BUT: Skip location validation for manual check-in by officer (location is from activity settings)
      let locationValidation = { valid: true, distance: 0 };
      if (!(isManualCheckIn && isOfficer)) {
        // Only validate location for student self check-in
        locationValidation = validateLocation(location.lat, location.lng, activity, dayNumber, slotDate, timeSlot);
      }
      
      if (!locationValidation.valid) {
        // Location is invalid - reject the check-in
        // Still create the record but with status = 'rejected'
        // This allows officers to see rejected check-ins
        let attendanceDoc = await Attendance.findOne({
          activityId: new mongoose.Types.ObjectId(activityId),
          userId: userObjectId
        });

        if (!attendanceDoc) {
          attendanceDoc = new Attendance({
            activityId: new mongoose.Types.ObjectId(activityId),
            userId: userObjectId,
            studentName: participant.name,
            studentEmail: participant.email || studentUser.email,
            studentId: studentUser.studentId,
            attendances: []
          });
        }

        if (!attendanceDoc.attendances || !Array.isArray(attendanceDoc.attendances)) {
          attendanceDoc.attendances = [];
        }

        const existingRecordIndex = attendanceDoc.attendances.findIndex(
          (att: any) => att.timeSlot === timeSlot && att.checkInType === checkInType
        );

        const locationLat = Number(location.lat);
        const locationLng = Number(location.lng);

        if (existingRecordIndex >= 0) {
          // Update existing record
          const existingRecord = attendanceDoc.attendances[existingRecordIndex];
          existingRecord.checkInTime = checkInTimeDate;
          existingRecord.location = {
            lat: locationLat,
            lng: locationLng,
            ...(location.address ? { address: location.address } : {})
          };
          if (photoUrl) {
            existingRecord.photoUrl = photoUrl;
          }
          existingRecord.status = 'rejected';
          existingRecord.cancelReason = locationValidation.message || 'Vị trí không đúng';
          delete existingRecord.verifiedBy;
          delete existingRecord.verifiedAt;
          delete existingRecord.verificationNote;
          delete existingRecord.lateReason;
        } else {
          // Create new record with rejected status
          const newRecord: any = {
            timeSlot: timeSlot,
            checkInType: checkInType,
            checkInTime: checkInTimeDate,
            location: {
              lat: locationLat,
              lng: locationLng,
              ...(location.address ? { address: location.address } : {})
            },
            status: 'rejected',
            cancelReason: locationValidation.message || 'Vị trí không đúng'
          };
          if (photoUrl) {
            newRecord.photoUrl = photoUrl;
          }
          attendanceDoc.attendances.push(newRecord);
        }

        attendanceDoc.markModified('attendances');
        await attendanceDoc.save();

        // Return success=false but still save the record for officer review
        // Frontend should handle this case and show error message
        return NextResponse.json({
          success: false,
          message: locationValidation.message || 'Vị trí không đúng. Điểm danh đã bị từ chối.',
          data: {
            attendanceId: attendanceDoc._id,
            recordId: existingRecordIndex >= 0 
              ? attendanceDoc.attendances[existingRecordIndex]._id.toString()
              : attendanceDoc.attendances[attendanceDoc.attendances.length - 1]._id.toString(),
            activityId: activity._id,
            userId: userId,
            timeSlot: timeSlot,
            checkInType: checkInType,
            status: 'rejected',
            reason: locationValidation.message
          }
        }, { status: 400 });
      }

      // Location is valid - continue with time and photo validation
      // Process lateReason: trim if exists, otherwise set to null (not undefined)
      let processedLateReason: string | null = null;
      if (lateReason && typeof lateReason === 'string') {
        const trimmed = lateReason.trim();
        if (trimmed.length > 0) {
          processedLateReason = trimmed;
        }
      }

      // Validate time - use original timeSlot format (without "Ngày X -") for validation
      // Extract just the slot name for validation (e.g., "Ngày 1 - Buổi Sáng" -> "Buổi Sáng")
      let timeSlotForValidation = timeSlot;
      if (timeSlot.includes('Ngày') && timeSlot.includes(' - ')) {
        const slotMatch = timeSlot.match(/Buổi (Sáng|Chiều|Tối)/);
        if (slotMatch) {
          timeSlotForValidation = `Buổi ${slotMatch[1]}`;
        }
      }
      const timeValidation = validateTime(checkInTimeDate, activity, timeSlotForValidation, checkInType, slotDate, dayNumber);

      // If time is invalid (too early or too late > 30 min), reject immediately
      // Still save the record for officer review
      if (!timeValidation.valid && photoUrl) {
        // Too late (more than 30 minutes after) - reject but save record
        let attendanceDoc = await Attendance.findOne({
          activityId: new mongoose.Types.ObjectId(activityId),
          userId: userObjectId
        });

        if (!attendanceDoc) {
          attendanceDoc = new Attendance({
            activityId: new mongoose.Types.ObjectId(activityId),
            userId: userObjectId,
            studentName: participant.name,
            studentEmail: participant.email || studentUser.email,
            studentId: studentUser.studentId,
            attendances: []
          });
        }

        if (!attendanceDoc.attendances || !Array.isArray(attendanceDoc.attendances)) {
          attendanceDoc.attendances = [];
        }

        const existingRecordIndex = attendanceDoc.attendances.findIndex(
          (att: any) => att.timeSlot === timeSlot && att.checkInType === checkInType
        );

        const locationLat = Number(location.lat);
        const locationLng = Number(location.lng);

        if (existingRecordIndex >= 0) {
          // Update existing record
          const existingRecord = attendanceDoc.attendances[existingRecordIndex];
          existingRecord.checkInTime = checkInTimeDate;
          existingRecord.location = {
            lat: locationLat,
            lng: locationLng,
            ...(location.address ? { address: location.address } : {})
          };
          if (photoUrl) {
            existingRecord.photoUrl = photoUrl;
          }
          existingRecord.status = 'rejected';
          existingRecord.cancelReason = timeValidation.message || (timeValidation.isEarly ? 'Điểm danh sớm hơn thời gian cho phép' : 'Điểm danh quá trễ (quá 30 phút sau giờ quy định)');
          if (processedLateReason) {
            existingRecord.lateReason = processedLateReason;
          } else {
            delete existingRecord.lateReason;
          }
          delete existingRecord.verifiedBy;
          delete existingRecord.verifiedAt;
          delete existingRecord.verificationNote;
        } else {
          // Create new record with rejected status
          const newRecord: any = {
            timeSlot: timeSlot,
            checkInType: checkInType,
            checkInTime: checkInTimeDate,
            location: {
              lat: locationLat,
              lng: locationLng,
              ...(location.address ? { address: location.address } : {})
            },
            status: 'rejected',
            cancelReason: timeValidation.message || (timeValidation.isEarly ? 'Điểm danh sớm hơn thời gian cho phép' : 'Điểm danh quá trễ (quá 30 phút sau giờ quy định)')
          };
          if (photoUrl) {
            newRecord.photoUrl = photoUrl;
          }
          if (processedLateReason) {
            newRecord.lateReason = processedLateReason;
          }
          attendanceDoc.attendances.push(newRecord);
        }

        attendanceDoc.markModified('attendances');
        await attendanceDoc.save();

        return NextResponse.json({
          success: false,
          message: timeValidation.message || (timeValidation.isEarly ? 'Điểm danh sớm hơn thời gian cho phép. Điểm danh đã bị từ chối.' : 'Điểm danh quá trễ. Điểm danh đã bị từ chối.'),
          data: {
            attendanceId: attendanceDoc._id,
            recordId: existingRecordIndex >= 0 
              ? attendanceDoc.attendances[existingRecordIndex]._id.toString()
              : attendanceDoc.attendances[attendanceDoc.attendances.length - 1]._id.toString(),
            activityId: activity._id,
            userId: userId,
            timeSlot: timeSlot,
            checkInType: checkInType,
            status: 'rejected',
            reason: timeValidation.message
          }
        }, { status: 400 });
      }

      // Determine status based on validation results
      // Auto-approve if: valid location, valid time (on time - within 15 min window), and has photo
      // Pending if: valid location, valid time but late (within late window 15-30 min), and has photo (needs officer approval)
      // Reject if: valid location but no photo (should not happen, but handle it)
      // Manual check-in by officer: automatically approve
      let attendanceStatus: 'approved' | 'pending' | 'rejected' = 'pending';
      
      // If manual check-in by officer, automatically approve
      if (isManualCheckIn && isOfficer) {
        attendanceStatus = 'approved';
      } else if (timeValidation.valid && timeValidation.isOnTime && photoUrl) {
        // Perfect check-in: valid location, on time (within 15 min window), has photo
        attendanceStatus = 'approved';
      } else if (timeValidation.valid && timeValidation.isLate && photoUrl) {
        // Late but valid: valid location, late (within late window 15-30 min), has photo
        // Needs officer approval (pending)
        attendanceStatus = 'pending';
      } else if (timeValidation.valid && timeValidation.isOnTime && !photoUrl) {
        // On time but no photo - still pending (should not happen, but handle it)
        attendanceStatus = 'pending';
      } else if (!photoUrl) {
        // No photo - reject (should not happen as frontend should require photo)
        attendanceStatus = 'rejected';
      }

      // Find or create attendance document for this user and activity
      let attendanceDoc = await Attendance.findOne({
        activityId: new mongoose.Types.ObjectId(activityId),
        userId: userObjectId
      });
      
      if (!attendanceDoc) {
        // Create new attendance document
        attendanceDoc = new Attendance({
          activityId: new mongoose.Types.ObjectId(activityId),
          userId: userObjectId,
          studentName: participant.name,
          studentEmail: participant.email || studentUser.email,
          studentId: studentUser.studentId,
          attendances: []
        });
      }

      // Ensure attendances array exists (defensive programming)
      if (!attendanceDoc.attendances || !Array.isArray(attendanceDoc.attendances)) {
        attendanceDoc.attendances = [];
      }

      // Check if attendance record already exists for this slot and type
      const existingRecordIndex = attendanceDoc.attendances.findIndex(
        (att: any) => att.timeSlot === timeSlot && att.checkInType === checkInType
      );

      let recordId: mongoose.Types.ObjectId;

      if (existingRecordIndex >= 0) {
        // Update existing record - keep _id and reset verification fields
        const existingRecord = attendanceDoc.attendances[existingRecordIndex];
        recordId = existingRecord._id;
        
        // Ensure location values are valid numbers before assigning
        const locationLat = Number(location.lat);
        const locationLng = Number(location.lng);
        
        if (isNaN(locationLat) || isNaN(locationLng)) {
          console.error('Invalid location values for existing record:', {
            lat: location.lat,
            lng: location.lng,
            convertedLat: locationLat,
            convertedLng: locationLng
          });
          return NextResponse.json(
            { success: false, message: 'Vị trí không hợp lệ. Vui lòng thử lại.' },
            { status: 400 }
          );
        }
        
        // Update the record in place
        existingRecord.timeSlot = timeSlot;
        existingRecord.checkInType = checkInType;
        existingRecord.checkInTime = checkInTimeDate; // Use checkInTime from photo capture
        existingRecord.location = {
          lat: locationLat,
          lng: locationLng
        };
        
        // Only set address if it exists and is not empty
        if (location.address && typeof location.address === 'string' && location.address.trim().length > 0) {
          existingRecord.location.address = location.address.trim();
        } else {
          // Remove address if it doesn't exist
          if (existingRecord.location.address) {
            delete existingRecord.location.address;
          }
        }
        // Handle photoUrl
        if (photoUrl) {
          existingRecord.photoUrl = photoUrl;
        } else {
          delete existingRecord.photoUrl;
        }
        
        // Set status based on validation results
        existingRecord.status = attendanceStatus;
        
        // Set lateReason: use null instead of undefined for Mongoose
        existingRecord.lateReason = processedLateReason;
        
        // If auto-approved or manual check-in, set verification fields
        if (attendanceStatus === 'approved') {
          existingRecord.verifiedAt = new Date();
          existingRecord.verifiedBy = user.userId; // Always store ObjectId
          if (isManualCheckIn && isOfficer) {
            // Manual check-in by officer - store name and email in dedicated fields
            existingRecord.verifiedByName = user.name || user.email || 'Officer';
            existingRecord.verifiedByEmail = user.email || '';
            existingRecord.verificationNote = verificationNote || 'Điểm danh thủ công bởi officer';
          } else {
            // Auto-approved by system
            existingRecord.verificationNote = 'Tự động duyệt: Đúng vị trí, đúng thời gian, có ảnh';
            // Clear manual check-in fields if they exist
            delete existingRecord.verifiedByName;
            delete existingRecord.verifiedByEmail;
          }
          delete existingRecord.cancelReason;
        } else {
          // Reset verification fields when updating (pending or rejected)
          delete existingRecord.verifiedBy;
          delete existingRecord.verifiedAt;
          delete existingRecord.verificationNote;
          if (attendanceStatus === 'rejected') {
            existingRecord.cancelReason = 'Thiếu ảnh hoặc thông tin không hợp lệ';
          } else {
            delete existingRecord.cancelReason;
          }
        }
      } else {
        // Add new record to array - create object with all required fields
        // Ensure location values are valid numbers
        const locationLat = Number(location.lat);
        const locationLng = Number(location.lng);
        
        if (isNaN(locationLat) || isNaN(locationLng)) {
          console.error('Invalid location values for new record:', {
            lat: location.lat,
            lng: location.lng,
            convertedLat: locationLat,
            convertedLng: locationLng
          });
          return NextResponse.json(
            { success: false, message: 'Vị trí không hợp lệ. Vui lòng thử lại.' },
            { status: 400 }
          );
        }
        
        const newRecord: any = {
          timeSlot: timeSlot,
          checkInType: checkInType,
          checkInTime: checkInTimeDate, // Use checkInTime from photo capture
          location: {
            lat: locationLat,
            lng: locationLng
          },
          status: attendanceStatus // Set status based on validation
        };
        
        // Add optional address field only if it exists and is not empty
        if (location.address && typeof location.address === 'string' && location.address.trim().length > 0) {
          newRecord.location.address = location.address.trim();
        }
        if (photoUrl) {
          newRecord.photoUrl = photoUrl;
        }
        // Set lateReason: use null instead of undefined
        if (processedLateReason) {
          newRecord.lateReason = processedLateReason;
        }
        
        // If auto-approved or manual check-in, set verification fields
        if (attendanceStatus === 'approved') {
          newRecord.verifiedAt = new Date();
          newRecord.verifiedBy = user.userId; // Always store ObjectId
          if (isManualCheckIn && isOfficer) {
            // Manual check-in by officer - store name and email in dedicated fields
            newRecord.verifiedByName = user.name || user.email || 'Officer';
            newRecord.verifiedByEmail = user.email || '';
            newRecord.verificationNote = verificationNote || 'Điểm danh thủ công bởi officer';
          } else {
            // Auto-approved by system
            newRecord.verificationNote = 'Tự động duyệt: Đúng vị trí, đúng thời gian, có ảnh';
          }
        } else if (attendanceStatus === 'rejected') {
          newRecord.cancelReason = 'Thiếu ảnh hoặc thông tin không hợp lệ';
        }
        
        // Push the new record
        attendanceDoc.attendances.push(newRecord);
        // Get the _id of the newly added record
        recordId = attendanceDoc.attendances[attendanceDoc.attendances.length - 1]._id;
      }

      // Mark attendances array as modified
      attendanceDoc.markModified('attendances');
      
      try {
        await attendanceDoc.save();
        
        // Determine success message based on status
        let successMessage = 'Đã điểm danh thành công';
        if (attendanceStatus === 'approved') {
          successMessage = existingRecordIndex >= 0 
            ? 'Đã cập nhật điểm danh và tự động duyệt thành công' 
            : 'Đã điểm danh và tự động duyệt thành công';
        } else if (attendanceStatus === 'pending') {
          successMessage = existingRecordIndex >= 0
            ? 'Đã cập nhật điểm danh. Đang chờ xét duyệt'
            : 'Đã điểm danh. Đang chờ xét duyệt';
        } else {
          successMessage = existingRecordIndex >= 0
            ? 'Đã cập nhật điểm danh nhưng bị từ chối'
            : 'Đã điểm danh nhưng bị từ chối';
        }
        
        return NextResponse.json({
          success: attendanceStatus !== 'rejected', // Only return success=true if not rejected
          message: successMessage,
          data: {
            attendanceId: attendanceDoc._id,
            recordId: recordId.toString(),
            activityId: activity._id,
            userId: userId,
            timeSlot: timeSlot,
            checkInType: checkInType,
            status: attendanceStatus
          }
        });
      } catch (saveError: any) {
        console.error('Error saving attendance document:', saveError);
        console.error('Save error details:', {
          message: saveError.message,
          name: saveError.name,
          errors: saveError.errors,
          stack: saveError.stack
        });
        
        // Log the document state for debugging
        try {
          console.error('Document state:', {
            attendanceId: attendanceDoc._id,
            attendancesCount: attendanceDoc.attendances?.length || 0,
            lastRecord: attendanceDoc.attendances?.[attendanceDoc.attendances.length - 1] ? {
              timeSlot: attendanceDoc.attendances[attendanceDoc.attendances.length - 1].timeSlot,
              checkInType: attendanceDoc.attendances[attendanceDoc.attendances.length - 1].checkInType,
              hasLocation: !!attendanceDoc.attendances[attendanceDoc.attendances.length - 1].location,
              hasPhotoUrl: !!attendanceDoc.attendances[attendanceDoc.attendances.length - 1].photoUrl,
              hasLateReason: !!attendanceDoc.attendances[attendanceDoc.attendances.length - 1].lateReason
            } : null
          });
        } catch (logError) {
          console.error('Error logging document state:', logError);
        }
        
        // If it's a validation error, provide more details
        if (saveError.name === 'ValidationError') {
          const validationErrors: any[] = [];
          if (saveError.errors) {
            Object.keys(saveError.errors).forEach(key => {
              const err = saveError.errors[key];
              validationErrors.push({
                field: key,
                message: err.message,
                value: err.value,
                kind: err.kind
              });
            });
          }
          console.error('Validation errors:', validationErrors);
          
          const firstError = validationErrors[0];
          const errorMessage = firstError 
            ? `Lỗi validation: ${firstError.field} - ${firstError.message}`
            : 'Lỗi validation khi lưu điểm danh';
          
          return NextResponse.json(
            { 
              success: false, 
              message: errorMessage,
              error: saveError.message,
              validationErrors: validationErrors
            },
            { status: 400 }
          );
        }
        
        throw saveError; // Re-throw to be caught by outer catch
      }
    } else {
      // Check-out: Remove attendance record from array
      if (timeSlot && checkInType) {
        // Find attendance document
        const attendanceDoc = await Attendance.findOne({
          activityId: new mongoose.Types.ObjectId(activityId),
          userId: userObjectId
        });

        if (!attendanceDoc) {
          return NextResponse.json(
            { success: false, message: 'Không tìm thấy bản ghi điểm danh để hủy' },
            { status: 404 }
          );
        }

        // Ensure attendances array exists
        if (!attendanceDoc.attendances || !Array.isArray(attendanceDoc.attendances)) {
          attendanceDoc.attendances = [];
        }

        // Remove the record from array
        // Support flexible matching: exact match or match after "Ngày X - "
        const initialLength = attendanceDoc.attendances.length;
        
        // Helper function to normalize timeSlot for comparison
        const normalizeTimeSlot = (ts: string): string => {
          if (!ts) return ts;
          // If contains "Ngày X - ", extract the slot name part
          if (ts.includes('Ngày') && ts.includes(' - ')) {
            const parts = ts.split(' - ');
            if (parts.length > 1) {
              return parts.slice(1).join(' - ').trim();
            }
          }
          return ts.trim();
        };
        
        const normalizedTimeSlot = normalizeTimeSlot(timeSlot);
        
        attendanceDoc.attendances = attendanceDoc.attendances.filter((att: any) => {
          // Try exact match first
          if (att.timeSlot === timeSlot && att.checkInType === checkInType) {
            return false; // Remove this record
          }
          // Try normalized match
          const attNormalized = normalizeTimeSlot(att.timeSlot);
          if (attNormalized === normalizedTimeSlot && att.checkInType === checkInType) {
            return false; // Remove this record
          }
          return true; // Keep this record
        });

        if (attendanceDoc.attendances.length < initialLength) {
          // If no more records, delete the document
          if (attendanceDoc.attendances.length === 0) {
            await Attendance.findByIdAndDelete(attendanceDoc._id);
          } else {
            await attendanceDoc.save();
          }

          return NextResponse.json({
            success: true,
            message: 'Đã hủy điểm danh thành công',
            data: {
              attendanceId: attendanceDoc._id
            }
          });
        } else {
          return NextResponse.json(
            { success: false, message: 'Không tìm thấy bản ghi điểm danh để hủy' },
            { status: 404 }
          );
        }
      } else {
        // If no timeSlot/checkInType, delete entire attendance document
        const deletedAttendance = await Attendance.findOneAndDelete({
          activityId: new mongoose.Types.ObjectId(activityId),
          userId: userObjectId
        });

        if (deletedAttendance) {
          return NextResponse.json({
            success: true,
            message: 'Đã hủy tất cả điểm danh thành công',
            data: {
              attendanceId: deletedAttendance._id
            }
          });
        } else {
          return NextResponse.json(
            { success: false, message: 'Không tìm thấy bản ghi điểm danh để hủy' },
            { status: 404 }
          );
        }
      }
    }

  } catch (error: any) {
    console.error('Error marking attendance:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    // Provide more user-friendly error message
    let errorMessage = 'Lỗi khi điểm danh';
    if (error.name === 'ValidationError') {
      errorMessage = 'Dữ liệu điểm danh không hợp lệ. Vui lòng thử lại.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage,
        error: error.message || 'Có lỗi xảy ra khi điểm danh',
        details: error.message
      },
      { status: 500 }
    );
  }
}
