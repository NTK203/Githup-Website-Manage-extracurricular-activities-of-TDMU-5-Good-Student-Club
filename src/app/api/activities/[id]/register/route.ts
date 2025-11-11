import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Activity from '@/models/Activity';
import { getUserFromRequest } from '@/lib/auth';
import mongoose from 'mongoose';

// POST - Register for activity
export async function POST(
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
    const { userId, name, email, role = 'Người Tham Gia' } = body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(activityId)) {
      return NextResponse.json(
        { success: false, message: 'ID hoạt động không hợp lệ' },
        { status: 400 }
      );
    }

    if (!userId || !name || !email) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc' },
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

    // Check if activity is open for registration
    // Allow registration for 'published' and 'ongoing' activities
    // Block registration for 'completed', 'cancelled', 'postponed', and 'draft'
    if (activity.status === 'completed' || activity.status === 'cancelled' || 
        activity.status === 'postponed' || activity.status === 'draft') {
      return NextResponse.json(
        { success: false, message: 'Hoạt động này không còn mở đăng ký' },
        { status: 400 }
      );
    }

    // Check if activity date has passed (only for published activities)
    if (activity.status === 'published') {
      const activityDate = new Date(activity.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // If activity date is in the past, don't allow registration
      if (activityDate < today) {
        return NextResponse.json(
          { success: false, message: 'Hoạt động này đã kết thúc' },
          { status: 400 }
        );
      }
    }

    // Convert userId to ObjectId for comparison
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Check if user is already registered
    const isAlreadyRegistered = activity.participants.some((p: any) => {
      const participantUserId = p.userId instanceof mongoose.Types.ObjectId
        ? p.userId.toString()
        : String(p.userId);
      return participantUserId === userObjectId.toString();
    });

    if (isAlreadyRegistered) {
      return NextResponse.json(
        { success: false, message: 'Bạn đã đăng ký tham gia hoạt động này rồi' },
        { status: 400 }
      );
    }

    // Check max participants limit
    if (activity.maxParticipants && activity.maxParticipants !== Infinity) {
      const currentCount = activity.participants.length;
      if (currentCount >= activity.maxParticipants) {
        return NextResponse.json(
          { success: false, message: 'Hoạt động đã đầy người tham gia' },
          { status: 400 }
        );
      }
    }

    // Add participant with pending approval status
    activity.participants.push({
      userId: userObjectId,
      name: name,
      email: email,
      role: role,
      joinedAt: new Date(),
      approvalStatus: 'pending'
    });

    await activity.save();

    return NextResponse.json({
      success: true,
      message: 'Đăng ký tham gia hoạt động thành công',
      data: {
        activityId: activity._id,
        participantCount: activity.participants.length
      }
    });

  } catch (error: any) {
    console.error('Error registering for activity:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Lỗi khi đăng ký tham gia hoạt động',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// DELETE - Unregister from activity
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
        { success: false, message: 'Bạn chưa đăng ký tham gia hoạt động này' },
        { status: 400 }
      );
    }

    // Remove participant
    activity.participants.splice(participantIndex, 1);
    await activity.save();

    return NextResponse.json({
      success: true,
      message: 'Đã hủy đăng ký tham gia hoạt động thành công',
      data: {
        activityId: activity._id,
        participantCount: activity.participants.length
      }
    });

  } catch (error: any) {
    console.error('Error unregistering from activity:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Lỗi khi hủy đăng ký tham gia hoạt động',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

