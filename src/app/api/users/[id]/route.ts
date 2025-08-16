import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import Membership from '@/models/Membership';
import { getUserFromRequest } from '@/lib/auth';

// GET /api/users/[id] - Get user details
export async function GET(
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

    // Get user with membership info
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's membership info
    const membership = await Membership.findOne({ 
      userId: user._id, 
      status: 'ACTIVE' 
    }).populate('approvedBy', 'name studentId');

    // Get user's membership history
    const membershipHistory = await Membership.find({ 
      userId: user._id 
    }).populate('approvedBy rejectedBy', 'name studentId')
    .sort({ createdAt: -1 })
    .select('-motivation -experience -expectations -commitment');

    const userData = {
      ...user.toJSON(),
      membership: membership ? {
        ...membership.toJSON(),
        approvedBy: membership.approvedBy
      } : null,
      membershipHistory: membershipHistory.map(m => ({
        ...m.toJSON(),
        approvedBy: m.approvedBy,
        rejectedBy: m.rejectedBy
      }))
    };

    return NextResponse.json({
      success: true,
      data: userData
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    // Verify authentication
    const currentUserPayload = getUserFromRequest(request);
    if (!currentUserPayload || currentUserPayload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current user from database
    const currentUser = await User.findById(currentUserPayload.userId);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Current user not found' },
        { status: 404 }
      );
    }

    const userId = params.id;
    const updateData = await request.json();

    console.log('Update user request:', {
      userId,
      updateData,
      currentUserId: currentUser._id
    });

    // Validate required fields
    if (!updateData.name || !updateData.email || !updateData.studentId) {
      return NextResponse.json(
        { error: 'Name, email, and student ID are required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is already taken by another user
    if (updateData.email !== existingUser.email) {
      const emailExists = await User.findOne({ 
        email: updateData.email,
        _id: { $ne: userId }
      });
      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Check if student ID is already taken by another user
    if (updateData.studentId !== existingUser.studentId) {
      const studentIdExists = await User.findOne({ 
        studentId: updateData.studentId,
        _id: { $ne: userId }
      });
      if (studentIdExists) {
        return NextResponse.json(
          { error: 'Student ID already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateFields: any = {
      name: updateData.name,
      email: updateData.email,
      studentId: updateData.studentId,
      phone: updateData.phone || '',
      avatarUrl: updateData.avatarUrl || '',
      role: updateData.role
    };

    // Handle faculty and class fields based on role
    if (updateData.role === 'ADMIN') {
      updateFields.faculty = '';
      updateFields.class = '';
    } else {
      updateFields.faculty = updateData.faculty || '';
      updateFields.class = updateData.class || '';
    }

    console.log('Update fields:', updateFields);

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true, runValidators: false } // Temporarily disable validators
    ).select('-passwordHash');

    return NextResponse.json({
      success: true,
      data: updatedUser
    });

  } catch (error) {
    console.error('Error updating user:', error);
    console.error('Error details:', {
      userId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user (soft delete)
export async function DELETE(
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

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has active membership
    const activeMembership = await Membership.findOne({
      userId: user._id,
      status: 'ACTIVE'
    });

    if (activeMembership) {
      return NextResponse.json(
        { error: 'Cannot delete user with active membership. Please remove membership first.' },
        { status: 400 }
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

    // Soft delete - add isDeleted field instead of actually deleting
    const deletedUser = await User.findByIdAndUpdate(
      userId,
      { 
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: currentUser._id
      },
      { new: true }
    ).select('-passwordHash');

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      data: deletedUser
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
