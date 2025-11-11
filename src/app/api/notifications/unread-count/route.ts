import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Notification from '@/models/Notification';

// GET /api/notifications/unread-count - Đếm số thông báo chưa đọc
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const currentUserPayload = await getUserFromRequest(request);
    if (!currentUserPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get unread count for current user
    const count = await Notification.getUnreadCount(currentUserPayload.userId);

    return NextResponse.json({
      success: true,
      data: {
        count
      }
    });

  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


