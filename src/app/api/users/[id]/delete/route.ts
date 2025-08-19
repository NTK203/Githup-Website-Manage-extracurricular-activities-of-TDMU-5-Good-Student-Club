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
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body to get removal reason
    const body = await request.json();
    const { removalReason } = body;

    // Validate removal reason (optional now)
    if (!removalReason || !removalReason.trim()) {
      // Set default reason if not provided
      removalReason = 'Không có lý do cụ thể';
    }

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

    // Check if user is the last admin
    if (user.role === 'ADMIN') {
      const adminCount = await User.countDocuments({ role: 'ADMIN' });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin user' },
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
    console.log(`Admin ${currentUser.userId} is deleting user ${userId} (${user.name}) with reason: ${removalReason}`);

    // Get current admin user details for audit
    const currentAdminUser = await User.findById(currentUser.userId);
    if (!currentAdminUser) {
      return NextResponse.json(
        { error: 'Current admin user not found' },
        { status: 404 }
      );
    }

    // Soft delete all membership records for this user
    const membershipUpdateResult = await Membership.updateMany(
      { userId: user._id },
      { 
        status: 'REMOVED',
        removedAt: new Date(),
        removedBy: { 
          _id: currentAdminUser._id, 
          name: currentAdminUser.name, 
          studentId: currentAdminUser.studentId 
        },
        removalReason: removalReason.trim()
      }
    );
    console.log(`Soft deleted ${membershipUpdateResult.modifiedCount} membership records for user ${userId}`);

    // Soft delete the user (mark as deleted instead of completely removing)
    const deletedUser = await User.findByIdAndUpdate(
      userId,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: { 
          _id: currentAdminUser._id, 
          name: currentAdminUser.name, 
          studentId: currentAdminUser.studentId 
        },
        deletionReason: removalReason.trim()
      },
      { new: true }
    );
    
    if (!deletedUser) {
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }

    console.log(`Soft deleted user: ${userId} (${deletedUser.name}) with reason: ${removalReason}`);

    return NextResponse.json({
      success: true,
      message: 'User and all related data have been marked as deleted',
      data: {
        deletedUser: {
          _id: deletedUser._id,
          name: deletedUser.name,
          studentId: deletedUser.studentId,
          email: deletedUser.email,
          role: deletedUser.role,
          deletionReason: removalReason.trim(),
          deletedAt: deletedUser.deletedAt,
          deletedBy: deletedUser.deletedBy
        },
        deletedMemberships: membershipUpdateResult.modifiedCount
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
