import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Membership from '@/models/Membership';
import { getUserFromRequest } from '@/lib/auth';

// POST /api/memberships/[id]/reset-wait-time - Reset wait time for reapplication
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication - only admins can reset wait time
    const user = getUserFromRequest(request);
    if (!user || (
      user.role !== 'SUPER_ADMIN' && 
      user.role !== 'CLUB_LEADER'
    )) {
      return NextResponse.json(
        { error: 'Unauthorized - Only admins can reset wait time' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    const membershipId = params.id;

    // Find membership
    const membership = await Membership.findById(membershipId);
    if (!membership) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      );
    }

    // Check if membership is REMOVED
    if (membership.status !== 'REMOVED') {
      return NextResponse.json(
        { error: 'Can only reset wait time for REMOVED memberships' },
        { status: 400 }
      );
    }

    // Reset the removedAt time to allow immediate reapplication
    // Set it to 2 days ago to ensure it passes the 1-day wait time
    const twoDaysAgo = new Date(Date.now() - (2 * 24 * 60 * 60 * 1000));
    membership.removedAt = twoDaysAgo;
    await membership.save();

    return NextResponse.json({
      success: true,
      message: 'Wait time reset successfully. User can now reapply immediately.',
      data: {
        membershipId: membership._id,
        resetAt: new Date(),
        newRemovedAt: twoDaysAgo
      }
    });

  } catch (error: unknown) {
    console.error('Error resetting wait time:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to reset wait time', details: errorMessage },
      { status: 500 }
    );
  }
}
