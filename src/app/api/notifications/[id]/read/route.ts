import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Notification from '@/models/Notification';

// PATCH /api/notifications/[id]/read - Đánh dấu thông báo đã đọc
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const currentUserPayload = await getUserFromRequest(request);
    if (!currentUserPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const notificationId = params.id;

    // Validate notification ID
    if (!notificationId || !require('mongoose').Types.ObjectId.isValid(notificationId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid notification ID' },
        { status: 400 }
      );
    }

    // Mark notification as read (only if it belongs to current user)
    const notification = await Notification.markAsRead(
      new (require('mongoose').Types.ObjectId)(notificationId),
      currentUserPayload.userId
    );

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found or you do not have permission' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        notification
      },
      message: 'Đã đánh dấu thông báo là đã đọc'
    });

  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}













