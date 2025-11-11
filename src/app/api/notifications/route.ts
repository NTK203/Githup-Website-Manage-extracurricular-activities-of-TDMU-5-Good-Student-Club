import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Notification from '@/models/Notification';
import User from '@/models/User';

// GET /api/notifications - Lấy danh sách thông báo
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const currentUserPayload = await getUserFromRequest(request);
    if (!currentUserPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Get notifications for current user
    const notifications = await Notification.getUserNotifications(
      currentUserPayload.userId,
      { limit, page, unreadOnly }
    );

    // Get total count for pagination
    const query: any = { userId: currentUserPayload.userId };
    if (unreadOnly) {
      query.isRead = false;
    }
    const totalCount = await Notification.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Tạo thông báo mới
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const currentUserPayload = await getUserFromRequest(request);
    if (!currentUserPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission - only ADMIN, SUPER_ADMIN, CLUB_LEADER, CLUB_DEPUTY can create notifications
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'];
    if (!allowedRoles.includes(currentUserPayload.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const { userIds, title, message, type = 'info', relatedType, relatedId } = body;

    // Validate required fields
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'userIds phải là một mảng và không được rỗng' },
        { status: 400 }
      );
    }

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: 'title và message là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['info', 'success', 'warning', 'error'];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'type phải là info, success, warning hoặc error' },
        { status: 400 }
      );
    }

    // Convert userIds to ObjectIds and filter out current user
    const currentUserId = new (require('mongoose').Types.ObjectId)(currentUserPayload.userId);
    const userIdObjects = userIds
      .map((id: string) => {
        try {
          return new (require('mongoose').Types.ObjectId)(id);
        } catch (error) {
          throw new Error(`Invalid userId: ${id}`);
        }
      })
      .filter((id: any) => !id.equals(currentUserId)); // Remove current user

    if (userIdObjects.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không có người nhận nào (đã loại bỏ chính bạn khỏi danh sách)' },
        { status: 400 }
      );
    }

    // Verify all users exist
    const users = await User.find({ _id: { $in: userIdObjects } });
    if (users.length !== userIdObjects.length) {
      return NextResponse.json(
        { success: false, error: 'Một hoặc nhiều userId không tồn tại' },
        { status: 400 }
      );
    }

    // Create notifications
    const notificationData = {
      title,
      message,
      type,
      relatedType: relatedType || undefined,
      relatedId: relatedId ? new (require('mongoose').Types.ObjectId)(relatedId) : undefined,
      createdBy: currentUserPayload.userId
    };

    const createdNotifications = await Notification.createForUsers(
      userIdObjects,
      notificationData
    );

    return NextResponse.json({
      success: true,
      data: {
        notifications: createdNotifications,
        count: createdNotifications.length
      },
      message: `Đã gửi ${createdNotifications.length} thông báo thành công`
    });

  } catch (error: any) {
    console.error('Error creating notifications:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

