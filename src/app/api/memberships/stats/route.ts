import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Membership from '@/models/Membership';

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

    // Check if user is ADMIN or OFFICER
    if (user.role !== 'ADMIN' && user.role !== 'OFFICER') {
      return NextResponse.json(
        { error: 'Forbidden - Admin or Officer access required' },
        { status: 403 }
      );
    }

    // Connect to database
    await dbConnect();

    // Get membership statistics
    const stats = await Membership.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert to object format
    const statsObject = {
      total: 0,
      active: 0,
      pending: 0,
      rejected: 0
    };

    stats.forEach(stat => {
      statsObject[stat._id.toLowerCase() as keyof typeof statsObject] = stat.count;
      statsObject.total += stat.count;
    });

    return NextResponse.json({
      success: true,
      data: statsObject
    });

  } catch (error: unknown) {
    console.error('Error getting membership stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get membership stats', details: errorMessage },
      { status: 500 }
    );
  }
}
