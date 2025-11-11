import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import Membership from '@/models/Membership';
import { getUserFromRequest } from '@/lib/auth';

// POST /api/memberships/[id]/restore - Restore removed member
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication - only admins can restore members
    const user = getUserFromRequest(request);
    if (!user || (
      user.role !== 'SUPER_ADMIN' && 
      user.role !== 'CLUB_LEADER'
    )) {
      return NextResponse.json(
        { error: 'Unauthorized - Only admins can restore members' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    const membershipId = params.id;
    const body = await request.json();
    const { restorationReason } = body;

    // Validate restoration reason
    if (!restorationReason || restorationReason.trim() === '') {
      return NextResponse.json(
        { error: 'Lý do duyệt lại là bắt buộc' },
        { status: 400 }
      );
    }

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
        { error: 'Can only restore REMOVED memberships' },
        { status: 400 }
      );
    }

    // Check if user already has an active membership (excluding current membership)
    const existingActiveMembership = await Membership.findOne({
      userId: membership.userId,
      status: 'ACTIVE',
      _id: { $ne: new mongoose.Types.ObjectId(membershipId) }
    });

    if (existingActiveMembership) {
      return NextResponse.json(
        { error: 'User already has an active membership' },
        { status: 409 }
      );
    }

    // Initialize removalHistory if it doesn't exist
    if (!membership.removalHistory) {
      membership.removalHistory = [];
    }
    
    // Không cần thêm entry mới vì đã có trong history từ lần xóa trước
    
    // Tìm entry xóa gần nhất và thêm thông tin duyệt lại
    if (membership.removalHistory.length > 0) {
      const latestRemoval = membership.removalHistory[membership.removalHistory.length - 1];
      
      // Thêm thông tin duyệt lại vào entry xóa gần nhất
      latestRemoval.restoredAt = new Date();
      latestRemoval.restoredBy = new mongoose.Types.ObjectId(user.userId);
      latestRemoval.restorationReason = restorationReason.trim();
    }
    
    // Cập nhật trạng thái hiện tại
    membership.status = 'ACTIVE';
    membership.restoredBy = new mongoose.Types.ObjectId(user.userId);
    membership.restoredAt = new Date();
    membership.restorationReason = restorationReason.trim();
    
    // Giữ nguyên thông tin xóa để theo dõi lịch sử

    await membership.save();

    // Populate user data for response
    await membership.populate(['userId', 'restoredBy']);

    return NextResponse.json({
      success: true,
      message: 'Thành viên đã được duyệt lại thành công',
      data: {
        membershipId: membership._id,
        userId: membership.userId,
        status: membership.status,
        restoredBy: membership.restoredBy,
        restoredAt: membership.restoredAt,
        restorationReason: membership.restorationReason
      }
    });

  } catch (error: unknown) {
    console.error('Error restoring membership:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for specific MongoDB errors
    if (error instanceof Error && error.message.includes('E11000')) {
      return NextResponse.json(
        { error: 'User already has an active membership' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to restore membership', details: errorMessage },
      { status: 500 }
    );
  }
}
