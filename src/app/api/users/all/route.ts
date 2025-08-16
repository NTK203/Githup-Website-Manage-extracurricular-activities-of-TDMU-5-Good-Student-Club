import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Only admins can access this endpoint' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role');

    // Build query - only get ADMIN users from users table
    let query: any = { role: 'ADMIN' };
    if (roleFilter && roleFilter !== 'ALL' && roleFilter !== 'ADMIN') {
      // If filtering for non-admin roles, return empty array
      return NextResponse.json({
        success: true,
        data: { users: [] }
      });
    }

    const users = await User.find(query)
      .select('_id studentId name email role phone class faculty avatarUrl createdAt updatedAt')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: {
        users: users.map(user => ({
          _id: user._id,
          status: 'ACTIVE', // All users in users table are considered active
          joinedAt: user.createdAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          userId: {
            _id: user._id,
            studentId: user.studentId,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            class: user.class,
            faculty: user.faculty,
            avatarUrl: user.avatarUrl
          }
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching all users:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
