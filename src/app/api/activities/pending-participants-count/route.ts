import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Activity from '@/models/Activity';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const currentUserPayload = await getUserFromRequest(request);
    if (!currentUserPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['CLUB_MEMBER', 'CLUB_DEPUTY', 'CLUB_LEADER', 'ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(currentUserPayload.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const officerId = new mongoose.Types.ObjectId(currentUserPayload.userId);

    // Use aggregation for faster query
    const pendingCountResult = await Activity.aggregate([
      { $match: { responsiblePerson: officerId } },
      { $unwind: '$participants' },
      { $match: { 'participants.approvalStatus': 'pending' } },
      { $count: 'totalPending' }
    ]);

    const totalPending = pendingCountResult.length > 0 ? pendingCountResult[0].totalPending : 0;

    return NextResponse.json({ 
      success: true, 
      data: { count: totalPending } 
    });

  } catch (error) {
    console.error('Error fetching pending participants count:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}










