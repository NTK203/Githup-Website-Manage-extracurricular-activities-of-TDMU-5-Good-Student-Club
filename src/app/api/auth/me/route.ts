import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import { dbConnect } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const currentUserPayload = await getUserFromRequest(request);

    if (!currentUserPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user from DB to get the latest data, including isClubMember
    const user = await User.findById(currentUserPayload.userId).select('-passwordHash');

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    console.log('Backend - /api/auth/me, User object from DB:', user);

    return NextResponse.json({ success: true, user });

  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
