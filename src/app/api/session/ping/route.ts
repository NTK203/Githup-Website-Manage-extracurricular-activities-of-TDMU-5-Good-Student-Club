import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Session from '@/models/Session';

export async function POST(request: NextRequest) {
  try {
    const currentUserPayload = await getUserFromRequest(request);
    if (!currentUserPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Update or create session - không cần await nếu không cần response ngay
    // Fire and forget để không block response
    Session.updateOrCreate(
      new (await import('mongoose')).Types.ObjectId(currentUserPayload.userId),
      currentUserPayload.role
    ).catch(err => {
      // Silent fail - chỉ log error
      console.warn('Error updating session:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Session updated'
    });

  } catch (error: any) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUserPayload = await getUserFromRequest(request);
    if (!currentUserPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Delete session when user closes tab or becomes inactive
    await Session.deleteMany({
      userId: new (await import('mongoose')).Types.ObjectId(currentUserPayload.userId)
    });

    return NextResponse.json({
      success: true,
      message: 'Session deleted'
    });

  } catch (error: any) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

