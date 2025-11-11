import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Membership from '@/models/Membership';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Get membership for current user with populated user info
    const membership = await Membership.findOne({ 
      userId: user.userId 
    }).populate('userId', 'name studentId email')
      .populate('approvedBy', 'name studentId')
      .populate('removedBy', 'name studentId')
      .populate('restoredBy', 'name studentId');

    if (!membership) {
      return NextResponse.json({
        success: true,
        data: {
          membership: null
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        membership: {
          _id: membership._id,
          userId: membership.userId,
          status: membership.status,
          createdAt: membership.createdAt,
          joinedAt: membership.joinedAt,
          approvedAt: membership.approvedAt,
          approvedBy: membership.approvedBy,
          removedAt: membership.removedAt,
          removedBy: membership.removedBy,
          removalReason: membership.removalReason,
          removalReasonTrue: membership.removalReasonTrue,
          restoredAt: membership.restoredAt,
          restoredBy: membership.restoredBy,
          restorationReason: membership.restorationReason,
          removalHistory: membership.removalHistory
        }
      }
    });

  } catch (error: any) {
    console.error('Get membership status error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get membership status' },
      { status: 500 }
    );
  }
}
