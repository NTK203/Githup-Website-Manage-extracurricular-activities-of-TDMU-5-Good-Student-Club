import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Activity from '@/models/Activity';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import mongoose from 'mongoose';

// GET - Get student's own attendance for an activity
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

    // Check if user is a participant
    const userObjectId = new mongoose.Types.ObjectId(user.userId);
    const participant = activity.participants.find((p: any) => {
      const participantUserId = p.userId instanceof mongoose.Types.ObjectId
        ? p.userId.toString()
        : String(p.userId);
      return participantUserId === userObjectId.toString();
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, message: 'Bạn chưa đăng ký tham gia hoạt động này' },
        { status: 404 }
      );
    }

    // Get attendance document for this user and activity (only one document per user per activity)
    const attendanceDoc = await Attendance.findOne({
      activityId: new mongoose.Types.ObjectId(activityId),
      userId: userObjectId
    });
    
    // Populate verifiedBy for attendance records
    // Create a map to store populated verifiedBy data by attendance record _id
    const verifiedByMap = new Map<string, { _id: any; name: string; email: string } | null>();
    
    if (attendanceDoc && attendanceDoc.attendances && attendanceDoc.attendances.length > 0) {
      const verifiedByIds = attendanceDoc.attendances
        .map((att: any) => {
          // Handle both ObjectId and string formats
          if (att.verifiedBy) {
            if (att.verifiedBy instanceof mongoose.Types.ObjectId) {
              return { recordId: att._id.toString(), verifiedById: att.verifiedBy };
            } else if (typeof att.verifiedBy === 'string') {
              return mongoose.Types.ObjectId.isValid(att.verifiedBy) 
                ? { recordId: att._id.toString(), verifiedById: new mongoose.Types.ObjectId(att.verifiedBy) }
                : null;
            } else if (att.verifiedBy._id) {
              const id = att.verifiedBy._id instanceof mongoose.Types.ObjectId 
                ? att.verifiedBy._id 
                : (mongoose.Types.ObjectId.isValid(att.verifiedBy._id) ? new mongoose.Types.ObjectId(att.verifiedBy._id) : null);
              return id ? { recordId: att._id.toString(), verifiedById: id } : null;
            } else if (att.verifiedBy.$oid) {
              return mongoose.Types.ObjectId.isValid(att.verifiedBy.$oid)
                ? { recordId: att._id.toString(), verifiedById: new mongoose.Types.ObjectId(att.verifiedBy.$oid) }
                : null;
            }
          }
          return null;
        })
        .filter((item: any) => item != null && item.verifiedById);
      
      if (verifiedByIds.length > 0) {
        // Remove duplicates by converting to string and back
        const uniqueIds = Array.from(new Set(verifiedByIds.map((item: any) => item.verifiedById.toString())))
          .map((idStr: string) => new mongoose.Types.ObjectId(idStr));
        
        const users = await User.find({ 
          _id: { $in: uniqueIds } 
        }).select('name email _id').lean();
        
        const userMap = new Map(users.map(u => [u._id.toString(), u]));
        
        // Store populated data in map by recordId
        verifiedByIds.forEach((item: any) => {
          const verifiedByIdString = item.verifiedById.toString();
          const user = userMap.get(verifiedByIdString);
          if (user) {
            verifiedByMap.set(item.recordId, {
              _id: user._id,
              name: user.name || user.email || 'Người quản trị', // Ensure name is never null/empty
              email: user.email || ''
            });
          } else {
            // If user not found, set to default
            verifiedByMap.set(item.recordId, {
              _id: verifiedByIdString,
              name: 'Người quản trị',
              email: ''
            });
          }
        });
      }
    }

    // Build attendance status by time slot
    const attendanceStatus: Record<string, { start: boolean; end: boolean }> = {
      'Buổi Sáng': { start: false, end: false },
      'Buổi Chiều': { start: false, end: false },
      'Buổi Tối': { start: false, end: false }
    };

    // Get attendance records from the document - ensure it's always an array
    // After populate, create a separate array to avoid Mongoose serialization issues
    const attendances = (attendanceDoc && attendanceDoc.attendances && Array.isArray(attendanceDoc.attendances)) 
      ? attendanceDoc.attendances.map((att: any) => ({
          _id: att._id,
          timeSlot: att.timeSlot,
          checkInType: att.checkInType,
          checkInTime: att.checkInTime,
          location: att.location,
          photoUrl: att.photoUrl,
          status: att.status,
          verifiedBy: att.verifiedBy, // This should already be populated above
          verifiedAt: att.verifiedAt,
          verificationNote: att.verificationNote,
          cancelReason: att.cancelReason,
          lateReason: att.lateReason
        }))
      : [];

    attendances.forEach((att: any) => {
      if (attendanceStatus[att.timeSlot]) {
        if (att.checkInType === 'start') {
          attendanceStatus[att.timeSlot].start = true;
        } else if (att.checkInType === 'end') {
          attendanceStatus[att.timeSlot].end = true;
        }
      }
    });

    // Format attendance records for response - use the verifiedByMap
    const attendanceRecords = attendances.map((att: any) => {
      const recordId = att._id.toString();
      
      // Get populated verifiedBy from map
      let verifiedByData = verifiedByMap.get(recordId) || null;
      
      // If not in map but att.verifiedBy exists, try to extract it
      if (!verifiedByData && att.verifiedBy) {
        // Try to extract ObjectId and look it up
        let verifiedById: mongoose.Types.ObjectId | null = null;
        if (att.verifiedBy instanceof mongoose.Types.ObjectId) {
          verifiedById = att.verifiedBy;
        } else if (typeof att.verifiedBy === 'string') {
          verifiedById = mongoose.Types.ObjectId.isValid(att.verifiedBy) ? new mongoose.Types.ObjectId(att.verifiedBy) : null;
        } else if (att.verifiedBy._id) {
          verifiedById = att.verifiedBy._id instanceof mongoose.Types.ObjectId 
            ? att.verifiedBy._id 
            : (mongoose.Types.ObjectId.isValid(att.verifiedBy._id) ? new mongoose.Types.ObjectId(att.verifiedBy._id) : null);
        } else if (att.verifiedBy.$oid) {
          verifiedById = mongoose.Types.ObjectId.isValid(att.verifiedBy.$oid) ? new mongoose.Types.ObjectId(att.verifiedBy.$oid) : null;
        } else if (typeof att.verifiedBy === 'object' && att.verifiedBy.name) {
          // Already an object with name
          verifiedByData = {
            _id: att.verifiedBy._id || att.verifiedBy,
            name: att.verifiedBy.name || att.verifiedBy.email || 'Người quản trị',
            email: att.verifiedBy.email || ''
          };
        }
        
        if (verifiedById && !verifiedByData) {
          verifiedByData = {
            _id: verifiedById.toString(),
            name: 'Người quản trị',
            email: ''
          };
        }
      }
      
      return {
        _id: att._id,
        timeSlot: att.timeSlot,
        checkInType: att.checkInType,
        checkInTime: att.checkInTime,
        location: att.location,
        photoUrl: att.photoUrl,
        status: att.status,
        verifiedBy: verifiedByData,
        verifiedAt: att.verifiedAt,
        verificationNote: att.verificationNote,
        cancelReason: att.cancelReason || null,
        lateReason: att.lateReason || null
      };
    });

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
        participant: {
          userId: participant.userId,
          name: participant.name,
          email: participant.email,
          role: participant.role,
          approvalStatus: participant.approvalStatus
        },
        attendanceStatus: attendanceStatus,
        attendances: attendanceRecords
      }
    });

  } catch (error: any) {
    console.error('Error getting student attendance:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Lỗi khi lấy thông tin điểm danh',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
