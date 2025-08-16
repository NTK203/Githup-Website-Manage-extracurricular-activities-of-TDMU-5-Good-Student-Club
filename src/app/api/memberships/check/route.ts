import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Membership from '@/models/Membership';
import { getUserFromRequest } from '@/lib/auth';

// GET /api/memberships/check - Check membership status for current user
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

    // Get user ID from query params or use authenticated user
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.userId;

    // Find membership for this user
    const membership = await Membership.findOne({ userId })
      .populate('userId', 'name studentId email role')
      .populate('approvedBy', 'name studentId')
      .sort({ createdAt: -1 });

    if (!membership) {
      return NextResponse.json({
        success: true,
        data: {
          hasMembership: false,
          membership: null
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        hasMembership: true,
        membership: {
          _id: membership._id,
          status: membership.status,
          joinedAt: membership.joinedAt,
          approvedAt: membership.approvedAt,
          rejectedAt: membership.rejectedAt,
          rejectionReason: membership.rejectionReason,
          removedAt: membership.removedAt,
          removalReason: membership.removalReason,
          removedBy: membership.removedBy,
          createdAt: membership.createdAt,
          updatedAt: membership.updatedAt,
          user: membership.userId,
          approver: membership.approvedBy
        }
      }
    });

  } catch (error: unknown) {
    console.error('Error checking membership status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to check membership status', details: errorMessage },
      { status: 500 }
    );
  }
}
