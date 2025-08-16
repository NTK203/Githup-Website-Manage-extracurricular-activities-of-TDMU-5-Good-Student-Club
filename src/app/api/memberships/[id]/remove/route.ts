import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Membership from '@/models/Membership';
import { verifyToken } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    // Get token from headers
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

    // Check if user is admin or officer
    if (decoded.role !== 'ADMIN' && decoded.role !== 'OFFICER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    const { removalReason } = await request.json();

    if (!removalReason || removalReason.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Removal reason is required' },
        { status: 400 }
      );
    }

    // Find the membership and update it
    const membership = await Membership.findByIdAndUpdate(
      params.id,
      {
        status: 'REMOVED',
        removedBy: decoded.userId,
        removedAt: new Date(),
        removalReason: removalReason.trim()
      },
      { new: true }
    );

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Membership not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
      data: membership
    });

  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
