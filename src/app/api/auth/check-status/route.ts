import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Membership from '@/models/Membership';

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

    await dbConnect();

    // Get user from database
    const userDoc = await User.findById(user.userId);
    if (!userDoc) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check membership status
    const membership = await Membership.findOne({ userId: user.userId })
      .populate('removedBy', 'name studentId')
      .populate('restoredBy', 'name studentId')
      .sort({ createdAt: -1 });

    let effectiveRole = userDoc.role;
    let membershipStatus = null;
    let shouldRedirect = false;
    let redirectUrl = null;

    if (membership) {
      membershipStatus = membership.status;
      
      // If membership is REMOVED, downgrade all roles to STUDENT
      if (membership.status === 'REMOVED') {
        effectiveRole = 'STUDENT';
        shouldRedirect = false;
        redirectUrl = '/student/dashboard';
      }
      
      // If membership is ACTIVE and user is an officer, they should be on officer dashboard
      if (membership.status === 'ACTIVE' && 
          ['CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'].includes(userDoc.role)) {
        effectiveRole = userDoc.role;
        shouldRedirect = true;
        redirectUrl = '/officer/dashboard';
      }
      
      // If membership is ACTIVE and user is CLUB_STUDENT, they should be on student dashboard
      if (membership.status === 'ACTIVE' && userDoc.role === 'CLUB_STUDENT') {
        effectiveRole = 'CLUB_STUDENT';
        shouldRedirect = true;
        redirectUrl = '/student/dashboard';
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          _id: userDoc._id,
          studentId: userDoc.studentId,
          name: userDoc.name,
          email: userDoc.email,
          role: userDoc.role,
          effectiveRole: effectiveRole,
          phone: userDoc.phone,
          class: userDoc.class,
          faculty: userDoc.faculty,
          avatarUrl: userDoc.avatarUrl
        },
        membership: membership ? {
          status: membership.status,
          joinedAt: membership.joinedAt,
          removedAt: membership.removedAt,
          removalReason: membership.removalReason,
          removalReasonTrue: membership.removalReasonTrue,
          removedBy: membership.removedBy,
          restoredAt: membership.restoredAt,
          restoredBy: membership.restoredBy,
          restorationReason: membership.restorationReason,
          removalHistory: membership.removalHistory
        } : null,
        shouldRedirect: shouldRedirect,
        redirectUrl: redirectUrl
      }
    });

  } catch (error: unknown) {
    console.error('Error checking user status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: 'Failed to check user status', details: errorMessage },
      { status: 500 }
    );
  }
}
