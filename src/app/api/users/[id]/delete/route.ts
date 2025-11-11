import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import Membership from '@/models/Membership';
import { getUserFromRequest } from '@/lib/auth';

// POST /api/users/[id]/delete - Delete user completely with reason
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

    // Parse request body to get removal reason
    const body = await request.json();
    const { removalReason: originalRemovalReason } = body;

    // Validate removal reason (optional now)
    const removalReason = (!originalRemovalReason || !originalRemovalReason.trim()) 
      ? 'Không có lý do cụ thể' 
      : originalRemovalReason;

    await dbConnect();

    const userId = params.id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is the last admin or super admin
    if (user.role === 'ADMIN') {
      const adminCount = await User.countDocuments({ role: 'ADMIN' });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin user' },
          { status: 400 }
        );
      }
    }
    
    if (user.role === 'SUPER_ADMIN') {
      const superAdminCount = await User.countDocuments({ role: 'SUPER_ADMIN' });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last super admin user' },
          { status: 400 }
        );
      }
    }

    // Check if trying to delete yourself
    if (user._id.toString() === currentUser.userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Log the deletion for audit purposes
    console.log(`Admin ${currentUser.userId} is HARD DELETING user ${userId} (${user.name}) with reason: ${removalReason}`);

    // Get current admin user details for audit
    const currentAdminUser = await User.findById(currentUser.userId);
    if (!currentAdminUser) {
      return NextResponse.json(
        { error: 'Current admin user not found' },
        { status: 404 }
      );
    }

    // Hard delete all membership records for this user
    const membershipDeleteResult = await Membership.deleteMany({ userId: user._id });
    console.log(`Hard deleted ${membershipDeleteResult.deletedCount} membership records for user ${userId}`);

    // Hard delete the user (completely remove from database)
    const deletedUser = await User.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }

    console.log(`Hard deleted user: ${userId} (${deletedUser.name}) with reason: ${removalReason}`);

    return NextResponse.json({
      success: true,
      message: 'User permanently deleted from system',
      data: {
        deletedUser: {
          _id: deletedUser._id,
          name: deletedUser.name,
          studentId: deletedUser.studentId,
          email: deletedUser.email,
          role: deletedUser.role
        },
        deletedMemberships: membershipDeleteResult.deletedCount
      }
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
