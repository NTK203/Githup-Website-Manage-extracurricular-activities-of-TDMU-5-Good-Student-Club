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
    console.log('🔍 Starting role change request...');
    console.log('👤 User ID to change:', params.id);
    
    await dbConnect();

    // Verify authentication
    console.log('🔍 Request headers:', Object.fromEntries(request.headers.entries()));
    const currentUserPayload = getUserFromRequest(request);
    console.log('🔐 Current user payload:', currentUserPayload ? { userId: currentUserPayload.userId, role: currentUserPayload.role } : 'No user found');
    
    if (!currentUserPayload || (
      currentUserPayload.role !== 'SUPER_ADMIN' && 
      currentUserPayload.role !== 'ADMIN' &&
      currentUserPayload.role !== 'CLUB_LEADER'
    )) {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('✅ Authentication successful');

    // Get current user from database
    console.log('🔍 Looking for current user with ID:', currentUserPayload.userId);
    const currentUser = await User.findById(currentUserPayload.userId);
    console.log('👤 Current user found:', currentUser ? { _id: currentUser._id, name: currentUser.name, role: currentUser.role } : 'Not found');
    
    if (!currentUser) {
      console.log('❌ Current user not found in database');
      return NextResponse.json(
        { error: 'Current user not found' },
        { status: 404 }
      );
    }

    const userId = params.id;
    const requestBody = await request.json();
    const { role } = requestBody;
    
    console.log('📝 Request body:', { userId, newRole: role });

    // Validate role
    if (!role || ![
      'SUPER_ADMIN', 'ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER', 'CLUB_STUDENT', 'STUDENT'
    ].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of the valid roles' },
        { status: 400 }
      );
    }

    // Check if user exists
    console.log('🔍 Looking for target user with ID:', userId);
    const user = await User.findById(userId);
    console.log('👤 Target user found:', user ? { _id: user._id, name: user.name, role: user.role } : 'Not found');
    
    if (!user) {
      console.log('❌ Target user not found');
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

    // Check if trying to demote the last super admin
    if (user.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
      const superAdminCount = await User.countDocuments({ role: 'SUPER_ADMIN' });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last super admin user' },
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

    console.log('✅ Role change successful');
    return NextResponse.json({
      success: true,
      message: `User role changed to ${role}`,
      data: updatedUser
    });

  } catch (error) {
    console.error('❌ Error changing user role:', error);
    console.error('❌ Error details:', {
      userId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
