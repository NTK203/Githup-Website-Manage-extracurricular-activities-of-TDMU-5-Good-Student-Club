import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Session from '@/models/Session';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Cleanup old sessions (older than 5 minutes) - standard practice
    // Cleanup runs with 20% probability to reduce database load
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    
    // Periodic cleanup to prevent session table from growing too large
    const shouldCleanup = Math.random() < 0.2; // 20% chance for cleanup
    if (shouldCleanup) {
      Session.deleteMany({
        lastActive: { $lt: fiveMinutesAgo }
      }).catch(err => {
        // Silent fail - doesn't affect counting
        console.warn('Error cleaning up old sessions:', err);
      });
    }

    // Count active users (last activity within 2 minutes) by role
    // This matches standard practice: 1-2 minute active window for real-time stats
    const stats = await Session.countActiveByRole();

    console.log('Active Access Statistics:', stats);

    return NextResponse.json({
      success: true,
      data: {
        admin: stats.admin,
        officer: stats.officer,
        clubStudent: stats.clubStudent,
        student: stats.student
      }
    });

  } catch (error: any) {
    console.error('Error fetching access statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

