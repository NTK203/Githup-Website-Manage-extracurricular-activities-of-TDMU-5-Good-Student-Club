import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Membership from '@/models/Membership';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get token from headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Find the most recent membership for this user
    const membership = await Membership.findOne({ userId: decoded.userId })
      .sort({ createdAt: -1 })
      .populate('approvedBy', 'name studentId')
      .populate('removedBy', 'name studentId')
      .lean();

    if (!membership) {
      return NextResponse.json(
        { success: true, data: { membership: null } },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        data: { 
          membership: {
            _id: membership._id,
            status: membership.status,
            joinedAt: membership.joinedAt,
            approvedAt: membership.approvedAt,
            rejectedAt: membership.rejectedAt,
            removedAt: membership.removedAt,
            rejectionReason: membership.rejectionReason,
            removalReason: membership.removalReason,
            approvedBy: membership.approvedBy,
            removedBy: membership.removedBy,
            motivation: membership.motivation,
            experience: membership.experience,
            expectations: membership.expectations,
            commitment: membership.commitment,
            createdAt: membership.createdAt,
            updatedAt: membership.updatedAt
          }
        } 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error checking membership status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
