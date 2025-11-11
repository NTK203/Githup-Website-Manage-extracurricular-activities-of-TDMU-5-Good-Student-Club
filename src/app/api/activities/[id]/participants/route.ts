import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Activity from '@/models/Activity';
import { getUserFromRequest } from '@/lib/auth';
import mongoose from 'mongoose';

// PATCH - Approve or reject participant
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

    // Check if user has permission (CLUB_DEPUTY, OFFICER, or CLUB_MEMBER)
    const allowedRoles = ['CLUB_DEPUTY', 'OFFICER', 'CLUB_MEMBER'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền duyệt người tham gia. Chỉ CLUB_DEPUTY, OFFICER và CLUB_MEMBER mới có quyền.' },
        { status: 403 }
      );
    }

    const { id: activityId } = params;
    const body = await request.json();
    const { userId, action, rejectionReason } = body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(activityId)) {
      return NextResponse.json(
        { success: false, message: 'ID hoạt động không hợp lệ' },
        { status: 400 }
      );
    }

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc (userId, action)' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { success: false, message: 'Action phải là approve hoặc reject' },
        { status: 400 }
      );
    }

    // rejectionReason có thể là chuỗi rỗng, không bắt buộc

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
    const participantIndex = activity.participants.findIndex((p: any) => {
      const participantUserId = p.userId instanceof mongoose.Types.ObjectId
        ? p.userId.toString()
        : String(p.userId);
      return participantUserId === userObjectId.toString();
    });

    if (participantIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy người tham gia' },
        { status: 404 }
      );
    }

    const participant = activity.participants[participantIndex];

    // Update participant based on action
    if (action === 'approve') {
      participant.approvalStatus = 'approved';
      participant.approvedBy = new mongoose.Types.ObjectId(user.userId);
      participant.approvedAt = new Date();
      // Clear rejection data if any
      participant.rejectedBy = undefined;
      participant.rejectedAt = undefined;
      participant.rejectionReason = undefined;
    } else if (action === 'reject') {
      participant.approvalStatus = 'rejected';
      participant.rejectedBy = new mongoose.Types.ObjectId(user.userId);
      participant.rejectedAt = new Date();
      participant.rejectionReason = rejectionReason || '';
      // Clear approval data if any
      participant.approvedBy = undefined;
      participant.approvedAt = undefined;
    }

    await activity.save();

    return NextResponse.json({
      success: true,
      message: `Đã ${action === 'approve' ? 'duyệt' : 'từ chối'} người tham gia thành công`,
      data: {
        activityId: activity._id,
        participant: participant
      }
    });

  } catch (error: any) {
    console.error('Error approving/rejecting participant:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Lỗi khi duyệt/từ chối người tham gia',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove participant (existing functionality)
export async function DELETE(
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
    const body = await request.json();
    const { userId } = body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(activityId)) {
      return NextResponse.json(
        { success: false, message: 'ID hoạt động không hợp lệ' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu userId' },
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

    // Convert userId to ObjectId for comparison
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find and remove participant
    const participantIndex = activity.participants.findIndex((p: any) => {
      const participantUserId = p.userId instanceof mongoose.Types.ObjectId
        ? p.userId.toString()
        : String(p.userId);
      return participantUserId === userObjectId.toString();
    });

    if (participantIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy người tham gia' },
        { status: 404 }
      );
    }

    // Remove participant
    activity.participants.splice(participantIndex, 1);
    await activity.save();

    return NextResponse.json({
      success: true,
      message: 'Đã xóa người tham gia thành công',
      data: {
        activityId: activity._id,
        participantCount: activity.participants.length
      }
    });

  } catch (error: any) {
    console.error('Error removing participant:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Lỗi khi xóa người tham gia',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

