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
  const verifiedByIds = attendances
    .map(att => att.verifiedBy)
    .filter(id => id != null);
  
  if (verifiedByIds.length === 0) return;
  
  const users = await User.find({ _id: { $in: verifiedByIds } }).select('name email');
  const userMap = new Map(users.map(u => [u._id.toString(), u]));
  
  attendances.forEach(att => {
    if (att.verifiedBy) {
      const user = userMap.get(att.verifiedBy.toString());
      if (user) {
        att.verifiedBy = {
          _id: user._id,
          name: user.name || user.email || 'Người quản trị', // Ensure name is never null/empty
          email: user.email
        };
      } else {
        // If user not found, keep the ObjectId but log for debugging
        console.warn(`User with ID ${att.verifiedBy.toString()} not found in database`);
        // Set to null so frontend can handle gracefully
        att.verifiedBy = null;
      }
    }
  });
}

// GET - Get attendance list for an activity
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id: activityId } = params;

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
    const allAttendanceRecords: any[] = [];
    attendanceDocs.forEach(doc => {
      allAttendanceRecords.push(...doc.attendances);
    });
    
    // Populate verifiedBy for all records at once
    await populateVerifiedBy(allAttendanceRecords);

    // Build participants list with attendance info
    const participantsWithAttendance = approvedParticipants.map((p: any) => {
      const userId = p.userId.toString();
      // Find attendance document for this user
      const attendanceDoc = attendanceDocs.find((doc: any) => 
        doc.userId._id.toString() === userId
      );
      
      // Get all attendance records from the document (verifiedBy already populated)
      // Ensure attendances is always an array
      const attendances = (attendanceDoc && attendanceDoc.attendances && Array.isArray(attendanceDoc.attendances))
        ? attendanceDoc.attendances.map((att: any) => ({
          _id: att._id,
          timeSlot: att.timeSlot,
          checkInType: att.checkInType,
          checkInTime: att.checkInTime,
          location: att.location,
          photoUrl: att.photoUrl,
          status: att.status,
          verifiedBy: att.verifiedBy,
          verifiedAt: att.verifiedAt,
          verificationNote: att.verificationNote,
          cancelReason: att.cancelReason || null,
          lateReason: att.lateReason || null
        }))
        : [];
      
      // Check if has any approved attendance
      const hasApprovedAttendance = attendances.some((a: any) => a.status === 'approved');
      
      return {
        userId: p.userId,
        name: p.name,
        email: p.email,
        role: p.role,
        checkedIn: hasApprovedAttendance,
        checkedInAt: attendances.length > 0 ? attendances[0].checkInTime : null,
        attendances: attendances
      };
    });

    // Calculate statistics
    const totalParticipants = approvedParticipants.length;
    const checkedInCount = participantsWithAttendance.filter((p: any) => p.checkedIn).length;
    const notCheckedInCount = totalParticipants - checkedInCount;
    const attendanceRate = totalParticipants > 0 
      ? Math.round((checkedInCount / totalParticipants) * 100) 
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
  activity: any
): { valid: boolean; distance?: number; message?: string } {
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
    // Check against all locations and find if any is within radius
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
    }

    // If not within any location, find the closest one
    let minDistance = Infinity;
    let closestLocation = null;

    for (const mtl of activity.multiTimeLocations) {
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
  }

  // Default: allow check-in if no specific location requirement
  return { valid: true };
}

// Helper function to validate time (check if within 15 minutes window)
function validateTime(
  checkInTime: Date,
  activity: any,
  timeSlot: string,
  checkInType: string
): { valid: boolean; isOnTime: boolean; isLate: boolean; isEarly: boolean; message?: string } {
  try {
    // Parse activity date
    const activityDate = new Date(activity.date);
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
    const slot = activity.timeSlots?.find((ts: any) => ts.name === timeSlot && ts.isActive);
    if (!slot) {
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
  { params }: { params: { id: string } }
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

    const { id: activityId } = params;
    const body = await request.json();
    const { userId, checkedIn, location, photoUrl, timeSlot, checkInType, checkInTime, lateReason } = body;
    
    // Log request data for debugging
    console.log('Check-in request:', {
      activityId,
      userId,
      checkedIn,
      timeSlot,
      checkInType,
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
      const locationValidation = validateLocation(location.lat, location.lng, activity);
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

      // Validate time
      const timeValidation = validateTime(checkInTimeDate, activity, timeSlot, checkInType);

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
      let attendanceStatus: 'approved' | 'pending' | 'rejected' = 'pending';
      
      if (timeValidation.valid && timeValidation.isOnTime && photoUrl) {
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
        
        // If auto-approved, set verification fields
        if (attendanceStatus === 'approved') {
          existingRecord.verifiedBy = user.userId; // Auto-approved by system
          existingRecord.verifiedAt = new Date();
          existingRecord.verificationNote = 'Tự động duyệt: Đúng vị trí, đúng thời gian, có ảnh';
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
        
        // If auto-approved, set verification fields
        if (attendanceStatus === 'approved') {
          newRecord.verifiedBy = user.userId; // Auto-approved by system
          newRecord.verifiedAt = new Date();
          newRecord.verificationNote = 'Tự động duyệt: Đúng vị trí, đúng thời gian, có ảnh';
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
        const initialLength = attendanceDoc.attendances.length;
        attendanceDoc.attendances = attendanceDoc.attendances.filter(
          (att: any) => !(att.timeSlot === timeSlot && att.checkInType === checkInType)
        );

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
