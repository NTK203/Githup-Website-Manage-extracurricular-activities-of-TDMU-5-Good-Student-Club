import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import Membership from '@/models/Membership';
import { dbConnect } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const currentUserPayload = await getUserFromRequest(request);

    if (!currentUserPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user from DB to get the latest data, including isClubMember
    const user = await User.findById(currentUserPayload.userId);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check membership status - if REMOVED, downgrade role (except SUPER_ADMIN)
    let membership = null;
    try {
      // Ensure userId is converted to ObjectId for proper query
      const mongoose = await import('mongoose');
      const userId = new mongoose.Types.ObjectId(user._id);
      membership = await Membership.findOne({ userId })
        .sort({ createdAt: -1 })
        .lean();
    } catch (membershipError) {
      console.error('Error fetching membership:', membershipError);
      // Continue without membership check - don't fail the request
    }

    // If membership is REMOVED, downgrade user role
    if (membership && membership.status === 'REMOVED' && user.role !== 'SUPER_ADMIN') {
      if (['CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER', 'CLUB_STUDENT'].includes(user.role)) {
        try {
          user.role = 'STUDENT';
          user.isClubMember = false;
          await user.save();
          console.log(`Downgraded user ${user._id} role to STUDENT due to REMOVED membership`);
        } catch (saveError) {
          console.error('Error saving user after role downgrade:', saveError);
          // Continue even if save fails
        }
      }
    }

    // Convert to plain object and remove passwordHash
    const userResponse = {
      _id: user._id,
      studentId: user.studentId,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      class: user.class || '',
      faculty: user.faculty || '',
      isClubMember: user.isClubMember || false,
      avatarUrl: user.avatarUrl || '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    console.log('Backend - /api/auth/me, User object from DB:', userResponse);

    return NextResponse.json({ success: true, user: userResponse });

  } catch (error) {
    console.error('Error fetching user data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
