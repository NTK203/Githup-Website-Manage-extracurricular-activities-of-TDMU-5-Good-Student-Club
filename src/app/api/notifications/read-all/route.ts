import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Notification from '@/models/Notification';

// PATCH /api/notifications/read-all - Đánh dấu tất cả thông báo đã đọc
export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const currentUserPayload = await getUserFromRequest(request);
    if (!currentUserPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Mark all notifications as read for current user
    const result = await Notification.markAllAsRead(currentUserPayload.userId);

    return NextResponse.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      },
      message: `Đã đánh dấu ${result.modifiedCount} thông báo là đã đọc`
    });

  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


