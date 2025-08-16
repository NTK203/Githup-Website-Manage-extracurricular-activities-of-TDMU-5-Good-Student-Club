import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Membership from '@/models/Membership';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token không hợp lệ' },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Token không hợp lệ' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Find the most recent REMOVED membership for this user
    console.log('Checking removal status for user:', decoded.userId);
    
    const removedMembership = await Membership.findOne({
      userId: new mongoose.Types.ObjectId(decoded.userId),
      status: 'REMOVED'
    }).sort({ updatedAt: -1 }); // Use updatedAt instead of removedAt since some records might not have removedAt

    console.log('Found removed membership:', removedMembership);

    if (!removedMembership) {
      return NextResponse.json({
        success: true,
        data: {
          removalInfo: null
        }
      });
    }

    // Check if user has dismissed the notification
    const dismissed = request.nextUrl.searchParams.get('dismissed') === 'true';

    // Return removal information
    const removalInfo = {
      removedAt: removedMembership.removedAt || removedMembership.updatedAt, // Fallback to updatedAt if removedAt doesn't exist
      removalReason: removedMembership.removalReason || 'Không có lý do cụ thể',
      removedBy: removedMembership.removedBy || {
        name: 'Hệ thống',
        studentId: 'N/A'
      }
    };
    
    console.log('Returning removal info:', removalInfo);
    
    return NextResponse.json({
      success: true,
      data: {
        removalInfo
      }
    });

  } catch (error: any) {
    console.error('Error checking removal status:', error);
    
    return NextResponse.json(
      { success: false, error: 'Lỗi server nội bộ' },
      { status: 500 }
    );
  }
}
