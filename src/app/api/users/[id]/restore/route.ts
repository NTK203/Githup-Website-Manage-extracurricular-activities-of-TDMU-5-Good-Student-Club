import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import Membership from '@/models/Membership';
import { getUserFromRequest } from '@/lib/auth';

// POST /api/users/[id]/restore - Restore a deleted user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const currentUser = getUserFromRequest(request);
    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'CLUB_LEADER')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const userId = params.id;

    // Check if user exists (since we're doing hard delete, user should not exist)
    const user = await User.findById(userId);
    if (user) {
      return NextResponse.json(
        { error: 'User still exists in database. Cannot restore a user that was not deleted.' },
        { status: 400 }
      );
    }

    // Get current admin user details for audit
    const currentAdminUser = await User.findById(currentUser.userId);
    if (!currentAdminUser) {
      return NextResponse.json(
        { error: 'Current admin user not found' },
        { status: 404 }
      );
    }

    // Since we're doing hard delete, restoration is not possible
    // This API endpoint is now deprecated
    return NextResponse.json({
      success: false,
      message: 'User restoration is not available with hard delete system',
      error: 'Hard delete does not support restoration'
    }, { status: 400 });

  } catch (error) {
    console.error('Error restoring user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


