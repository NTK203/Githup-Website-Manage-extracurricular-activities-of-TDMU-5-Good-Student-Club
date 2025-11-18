import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Session from '@/models/Session';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // Get current user and delete their session
    const currentUserPayload = await getUserFromRequest(request);
    if (currentUserPayload) {
      await Session.deleteMany({
        userId: new (await import('mongoose')).Types.ObjectId(currentUserPayload.userId)
      });
    }
    
    // Logout is primarily handled on the client side
    // This endpoint can be used for server-side logout if needed
    // (e.g., blacklisting tokens, logging logout events, etc.)
    
    return NextResponse.json({
      success: true,
      message: 'Đăng xuất thành công'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json(
      { error: 'Lỗi server. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
