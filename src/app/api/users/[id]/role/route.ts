import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';

// GET /api/users/[id]/role - Test route
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const userId = params.id;
    const user = await User.findById(userId).select('-passwordHash');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user._id,
        role: user.role,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Error in GET /api/users/[id]/role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id]/role - Change user role
export async function PATCH(
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
    const requestBody = await request.json();
    const { role } = requestBody;

    // Validate role
    if (!role || !['STUDENT', 'OFFICER', 'ADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be STUDENT, OFFICER, or ADMIN' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent changing own role
    if (user._id.toString() === currentUser._id.toString()) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // Check if trying to demote the last admin
    if (user.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await User.countDocuments({ role: 'ADMIN' });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last admin user' },
          { status: 400 }
        );
      }
    }

    // Additional validation for role changes
    console.log('Role change request:', {
      userId,
      currentRole: user.role,
      newRole: role,
      userFaculty: user.faculty,
      currentUserId: currentUser._id,
      currentUserRole: currentUser.role
    });

    // Update user role
    const updateData: any = { role };
    
    // If changing from ADMIN to other role, clear faculty field to avoid validation error
    if (user.role === 'ADMIN' && role !== 'ADMIN') {
      updateData.faculty = '';
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: false } // Temporarily disable validators to avoid faculty validation issues
    ).select('-passwordHash');

    return NextResponse.json({
      success: true,
      message: `User role changed to ${role}`,
      data: updatedUser
    });

  } catch (error) {
    console.error('Error changing user role:', error);
    console.error('Error details:', {
      userId: params.id,
      role: requestBody?.role || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
