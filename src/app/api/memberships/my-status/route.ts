import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Membership from '@/models/Membership';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Get membership for current user
    const membership = await Membership.findOne({ 
      userId: user.userId 
    }).select('status createdAt');

    if (!membership) {
      return NextResponse.json({
        success: true,
        membership: null
      });
    }

    return NextResponse.json({
      success: true,
      membership: {
        status: membership.status,
        createdAt: membership.createdAt
      }
    });

  } catch (error: any) {
    console.error('Get membership status error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get membership status' },
      { status: 500 }
    );
  }
}
