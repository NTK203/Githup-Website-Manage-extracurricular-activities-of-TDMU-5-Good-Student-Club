import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import mongoose from 'mongoose';

// PATCH - Verify attendance (approve/reject)
// Note: [id] here is the recordId (the _id of the attendance record in the attendances array)
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

    // Check if user has permission (only officers can verify)
    const allowedRoles = ['CLUB_DEPUTY', 'OFFICER', 'CLUB_MEMBER', 'CLUB_LEADER', 'ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền xác nhận điểm danh' },
        { status: 403 }
      );
    }

    const { id: recordId } = params;
    const body = await request.json();
    const { status, verificationNote, cancelReason } = body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      return NextResponse.json(
        { success: false, message: 'ID điểm danh không hợp lệ' },
        { status: 400 }
      );
    }

    // Validate status
    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Trạng thái phải là approved hoặc rejected' },
        { status: 400 }
      );
    }

    // Find attendance document containing this record
    const attendanceDoc = await Attendance.findOne({
      'attendances._id': new mongoose.Types.ObjectId(recordId)
    });

    if (!attendanceDoc) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy bản ghi điểm danh' },
        { status: 404 }
      );
    }

    // Find the attendance record in the array
    const recordIndex = attendanceDoc.attendances.findIndex(
      (att: any) => att._id.toString() === recordId
    );

    if (recordIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy bản ghi điểm danh' },
        { status: 404 }
      );
    }

    // Update the attendance record
    const record = attendanceDoc.attendances[recordIndex];
    record.status = status;
    record.verifiedBy = new mongoose.Types.ObjectId(user.userId);
    record.verifiedAt = new Date();
    
    // Handle verification note and cancel reason
    if (status === 'rejected') {
      // When rejecting, use cancelReason if provided, otherwise use verificationNote
      if (cancelReason) {
        record.cancelReason = cancelReason.trim();
        // Also save to verificationNote for backward compatibility
        record.verificationNote = cancelReason.trim();
      } else if (verificationNote) {
        record.cancelReason = verificationNote.trim();
        record.verificationNote = verificationNote.trim();
      }
    } else if (status === 'approved') {
      // When approving, use verificationNote for notes
      if (verificationNote) {
        record.verificationNote = verificationNote.trim();
      }
      // Clear cancelReason if it exists
      record.cancelReason = undefined;
    }

    // Mark the array as modified
    attendanceDoc.markModified('attendances');
    await attendanceDoc.save();

    // Populate attendance document
    await attendanceDoc.populate('userId', 'name email studentId');
    
    // Populate verifiedBy for the record if it exists
    let verifiedByData = null;
    if (record.verifiedBy) {
      const verifiedByUser = await mongoose.models.User.findById(record.verifiedBy).select('name email');
      if (verifiedByUser) {
        verifiedByData = {
          _id: verifiedByUser._id,
          name: verifiedByUser.name || verifiedByUser.email || 'Người quản trị', // Ensure name is never null/empty
          email: verifiedByUser.email || ''
        };
      }
    }

    // Format the record for response
    const formattedRecord = {
      _id: record._id,
      activityId: attendanceDoc.activityId,
      userId: attendanceDoc.userId,
      studentName: attendanceDoc.studentName,
      studentEmail: attendanceDoc.studentEmail,
      timeSlot: record.timeSlot,
      checkInType: record.checkInType,
      checkInTime: record.checkInTime,
      location: record.location,
      photoUrl: record.photoUrl,
      status: record.status,
      verifiedBy: verifiedByData,
      verifiedAt: record.verifiedAt,
      verificationNote: record.verificationNote,
      cancelReason: record.cancelReason
    };

    return NextResponse.json({
      success: true,
      message: status === 'approved' ? 'Đã xác nhận điểm danh thành công' : 'Đã từ chối điểm danh thành công',
      data: {
        attendance: formattedRecord
      }
    });

  } catch (error: any) {
    console.error('Error verifying attendance:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Lỗi khi xác nhận điểm danh',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
