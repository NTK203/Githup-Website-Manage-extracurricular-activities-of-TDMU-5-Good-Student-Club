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

    // Get all memberships for current user (including all statuses)
    const memberships = await Membership.find({ 
      userId: user.userId 
    })
      .populate('userId', 'name studentId email')
      .populate('approvedBy', 'name studentId')
      .populate('removedBy', 'name studentId')
      .populate('restoredBy', 'name studentId')
      .populate('rejectedBy', 'name studentId')
      .sort({ createdAt: -1 }); // Sort by newest first

    return NextResponse.json({
      success: true,
      data: {
        memberships: memberships.map(m => ({
          _id: m._id,
          userId: m.userId,
          status: m.status,
          createdAt: m.createdAt,
          joinedAt: m.joinedAt,
          approvedAt: m.approvedAt,
          approvedBy: m.approvedBy,
          rejectedAt: m.rejectedAt,
          rejectedBy: m.rejectedBy,
          rejectionReason: m.rejectionReason,
          removedAt: m.removedAt,
          removedBy: m.removedBy,
          removalReason: m.removalReason,
          removalReasonTrue: m.removalReasonTrue,
          restoredAt: m.restoredAt,
          restoredBy: m.restoredBy,
          restorationReason: m.restorationReason,
          motivation: m.motivation,
          experience: m.experience,
          expectations: m.expectations,
          commitment: m.commitment,
          isReapplication: m.isReapplication,
          reapplicationAt: m.reapplicationAt,
          reapplicationReason: m.reapplicationReason,
          removalHistory: m.removalHistory
        }))
      }
    });

  } catch (error: any) {
    console.error('Get membership history error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get membership history' },
      { status: 500 }
    );
  }
}

