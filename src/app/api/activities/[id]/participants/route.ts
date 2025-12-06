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

    if (action !== 'approve' && action !== 'reject' && action !== 'undo_reject' && action !== 'restore') {
      return NextResponse.json(
        { success: false, message: 'Action phải là approve, reject, undo_reject hoặc restore' },
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

    // Validate userId ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, message: 'ID người tham gia không hợp lệ' },
        { status: 400 }
      );
    }

    // Convert userId to ObjectId for comparison
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find participant - handle multiple userId formats
    const participantIndex = activity.participants.findIndex((p: any) => {
      const participantUserId = p.userId instanceof mongoose.Types.ObjectId
        ? p.userId.toString()
        : (typeof p.userId === 'object' && p.userId !== null && '_id' in p.userId
          ? String(p.userId._id)
          : String(p.userId));
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
      delete participant.rejectedBy;
      delete participant.rejectedAt;
      delete participant.rejectionReason;
    } else if (action === 'reject') {
      participant.approvalStatus = 'rejected';
      participant.rejectedBy = new mongoose.Types.ObjectId(user.userId);
      participant.rejectedAt = new Date();
      participant.rejectionReason = rejectionReason || '';
      // Clear approval data if any
      delete participant.approvedBy;
      delete participant.approvedAt;
    } else if (action === 'undo_reject') {
      // Reset to pending status and clear rejection data
      participant.approvalStatus = 'pending';
      // Use delete or null for Mongoose to properly remove fields
      delete participant.rejectedBy;
      delete participant.rejectedAt;
      delete participant.rejectionReason;
      // Clear approval data if any
      delete participant.approvedBy;
      delete participant.approvedAt;
    } else if (action === 'restore') {
      // Restore removed participant to pending status
      participant.approvalStatus = 'pending';
      // Clear removal data
      delete participant.removedBy;
      delete participant.removedAt;
      delete participant.removalReason;
      // Clear other status fields
      delete participant.rejectedBy;
      delete participant.rejectedAt;
      delete participant.rejectionReason;
      delete participant.approvedBy;
      delete participant.approvedAt;
    }

    await activity.save();

    // Send notification to participant
    try {
      const Notification = (await import('@/models/Notification')).default;
      const participantUserId = participant.userId instanceof mongoose.Types.ObjectId
        ? participant.userId
        : (typeof participant.userId === 'object' && participant.userId !== null && '_id' in participant.userId
          ? new mongoose.Types.ObjectId(participant.userId._id)
          : new mongoose.Types.ObjectId(participant.userId));
      
      if (action === 'approve') {
        await (Notification as any).createForUsers(
          [participantUserId],
          {
            title: 'Đơn đăng ký hoạt động được duyệt',
            message: `Chúc mừng! Đơn đăng ký tham gia hoạt động "${activity.name}" của bạn đã được duyệt.`,
            type: 'success',
            relatedType: 'activity',
            relatedId: activity._id,
            createdBy: new mongoose.Types.ObjectId(user.userId)
          }
        );
      } else if (action === 'reject') {
        const reasonText = rejectionReason && rejectionReason.trim() 
          ? ` Lý do: ${rejectionReason.trim()}` 
          : '';
        await (Notification as any).createForUsers(
          [participantUserId],
          {
            title: 'Đơn đăng ký hoạt động không được duyệt',
            message: `Rất tiếc, đơn đăng ký tham gia hoạt động "${activity.name}" của bạn không được duyệt.${reasonText}`,
            type: 'error',
            relatedType: 'activity',
            relatedId: activity._id,
            createdBy: new mongoose.Types.ObjectId(user.userId)
          }
        );
      } else if (action === 'undo_reject') {
        await (Notification as any).createForUsers(
          [participantUserId],
          {
            title: 'Đơn đăng ký hoạt động đã được khôi phục',
            message: `Đơn đăng ký tham gia hoạt động "${activity.name}" của bạn đã được khôi phục và đang chờ duyệt lại.`,
            type: 'info',
            relatedType: 'activity',
            relatedId: activity._id,
            createdBy: new mongoose.Types.ObjectId(user.userId)
          }
        );
      } else if (action === 'restore') {
        await (Notification as any).createForUsers(
          [participantUserId],
          {
            title: 'Đơn đăng ký hoạt động đã được khôi phục',
            message: `Đơn đăng ký tham gia hoạt động "${activity.name}" của bạn đã được khôi phục và đang chờ duyệt lại.`,
            type: 'info',
            relatedType: 'activity',
            relatedId: activity._id,
            createdBy: new mongoose.Types.ObjectId(user.userId)
          }
        );
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the request if notification fails
    }

    const actionMessages: { [key: string]: string } = {
      'approve': 'duyệt',
      'reject': 'từ chối',
      'undo_reject': 'xóa từ chối',
      'restore': 'khôi phục'
    };
    
    return NextResponse.json({
      success: true,
      message: `Đã ${actionMessages[action] || action} người tham gia thành công`,
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

// DELETE - Remove participant (mark as removed)
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

    // Check if user has permission (CLUB_DEPUTY, OFFICER, or CLUB_MEMBER)
    const allowedRoles = ['CLUB_DEPUTY', 'OFFICER', 'CLUB_MEMBER'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền xóa người tham gia. Chỉ CLUB_DEPUTY, OFFICER và CLUB_MEMBER mới có quyền.' },
        { status: 403 }
      );
    }

    const { id: activityId } = params;
    const body = await request.json();
    const { userId, permanent, removalReason } = body;

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

    // Validate userId ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, message: 'ID người tham gia không hợp lệ' },
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

    // Find participant
    const participantIndex = activity.participants.findIndex((p: any) => {
      const participantUserId = p.userId instanceof mongoose.Types.ObjectId
        ? p.userId.toString()
        : (typeof p.userId === 'object' && p.userId !== null && '_id' in p.userId
          ? String(p.userId._id)
          : String(p.userId));
      return participantUserId === userObjectId.toString();
    });

    if (participantIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy người tham gia' },
        { status: 404 }
      );
    }

    // Validate user.userId
    if (!user.userId || !mongoose.Types.ObjectId.isValid(user.userId)) {
      return NextResponse.json(
        { success: false, message: 'Thông tin người dùng không hợp lệ' },
        { status: 400 }
      );
    }
    
    // Get participant info before removal for notification
    const participantInfo = activity.participants[participantIndex];
    const participantUserId = participantInfo.userId instanceof mongoose.Types.ObjectId
      ? participantInfo.userId
      : (typeof participantInfo.userId === 'object' && participantInfo.userId !== null && '_id' in participantInfo.userId
        ? new mongoose.Types.ObjectId(participantInfo.userId._id)
        : new mongoose.Types.ObjectId(participantInfo.userId));
    
    // If permanent is true, remove participant from array completely
    if (permanent === true) {
      activity.participants.splice(participantIndex, 1);
    } else {
      // Otherwise, mark as removed
      const participant = activity.participants[participantIndex];
      participant.approvalStatus = 'removed';
      participant.removedBy = new mongoose.Types.ObjectId(user.userId);
      participant.removedAt = new Date();
      participant.removalReason = removalReason && removalReason.trim() ? removalReason.trim() : undefined;
      
      // Clear registeredDaySlots when removing participant (for multiple_days activities)
      if (participant.registeredDaySlots && Array.isArray(participant.registeredDaySlots)) {
        participant.registeredDaySlots = [];
        console.log('✅ DELETE - Cleared registeredDaySlots for removed participant:', {
          activityId: activity._id,
          userId: userId,
          hadRegisteredDaySlots: true
        });
      }
      
      // Clear other status fields
      delete participant.approvedBy;
      delete participant.approvedAt;
      delete participant.rejectedBy;
      delete participant.rejectedAt;
      delete participant.rejectionReason;
      
      // Mark the participant subdocument as modified
      activity.markModified('participants');
      // Also mark registeredDaySlots as modified if it was cleared
      if (participant.registeredDaySlots !== undefined) {
        activity.markModified(`participants.${participantIndex}.registeredDaySlots`);
      }
    }

    try {
      await activity.save();
    } catch (saveError: any) {
      // Handle validation errors
      if (saveError.name === 'ValidationError') {
        const validationErrors = Object.values(saveError.errors || {}).map((err: any) => err.message);
        return NextResponse.json(
          { 
            success: false, 
            message: 'Lỗi validation khi lưu hoạt động',
            error: saveError.message,
            details: validationErrors
          },
          { status: 400 }
        );
      }
      
      throw saveError;
    }

    // Send notification to participant
    try {
      const Notification = (await import('@/models/Notification')).default;
      const reasonText = permanent 
        ? ' Bạn đã bị xóa vĩnh viễn khỏi hoạt động này.'
        : (removalReason && removalReason.trim() 
          ? ` Lý do: ${removalReason.trim()}` 
          : '');
      
      await (Notification as any).createForUsers(
        [participantUserId],
        {
          title: permanent ? 'Bị xóa khỏi hoạt động' : 'Đơn đăng ký hoạt động bị hủy',
          message: `Bạn đã bị ${permanent ? 'xóa vĩnh viễn' : 'hủy đăng ký'} khỏi hoạt động "${activity.name}".${reasonText}`,
          type: 'error',
          relatedType: 'activity',
          relatedId: activity._id,
          createdBy: new mongoose.Types.ObjectId(user.userId)
        }
      );
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: permanent ? 'Đã xóa vĩnh viễn người tham gia thành công' : 'Đã xóa người tham gia thành công',
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

