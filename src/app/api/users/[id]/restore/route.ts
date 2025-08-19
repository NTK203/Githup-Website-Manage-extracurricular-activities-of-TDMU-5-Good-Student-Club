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
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const userId = params.id;

    // Check if user exists and is deleted
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.isDeleted) {
      return NextResponse.json(
        { error: 'User is not deleted' },
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

    // Restore the user
    const restoredUser = await User.findByIdAndUpdate(
      userId,
      {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        deletionReason: null
      },
      { new: true }
    ).select('-passwordHash');

    if (!restoredUser) {
      return NextResponse.json(
        { error: 'Failed to restore user' },
        { status: 500 }
      );
    }

    // Restore membership records (change status from REMOVED to ACTIVE if they were active before)
    const membershipUpdateResult = await Membership.updateMany(
      { 
        userId: user._id,
        status: 'REMOVED',
        removalReason: { $exists: true }
      },
      { 
        status: 'ACTIVE',
        removedAt: null,
        removedBy: null,
        removalReason: null
      }
    );

    console.log(`Restored user: ${userId} (${restoredUser.name}) by admin ${currentAdminUser.name}`);
    console.log(`Restored ${membershipUpdateResult.modifiedCount} membership records`);

    return NextResponse.json({
      success: true,
      message: 'User restored successfully',
      data: {
        user: restoredUser,
        restoredMemberships: membershipUpdateResult.modifiedCount
      }
    });

  } catch (error) {
    console.error('Error restoring user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
