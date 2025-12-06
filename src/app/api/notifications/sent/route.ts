import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Notification from '@/models/Notification';

// GET /api/notifications/sent - Lấy danh sách thông báo đã gửi
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const currentUserPayload = await getUserFromRequest(request);
    if (!currentUserPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission - only ADMIN, SUPER_ADMIN, CLUB_LEADER, CLUB_DEPUTY can view sent notifications
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'];
    if (!allowedRoles.includes(currentUserPayload.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Get notifications created by current user
    const query: any = { createdBy: currentUserPayload.userId };
    
    const notifications = await Notification.find(query)
      .populate('userId', 'name studentId email')
      .populate('createdBy', 'name studentId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
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
    console.error('Error fetching sent notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}




























