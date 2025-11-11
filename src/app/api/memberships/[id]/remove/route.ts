import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Membership from '@/models/Membership';
import User from '@/models/User';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token không được cung cấp' },
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

    // Check if user has admin permissions
    const user = await User.findById(decoded.userId);
    if (!user || (
      user.role !== 'SUPER_ADMIN' && 
      user.role !== 'CLUB_LEADER'
    )) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền thực hiện hành động này' },
        { status: 403 }
      );
    }

    // Connect to database
    await dbConnect();

    // Get request body
    const { removalReason } = await request.json();

    if (!removalReason || removalReason.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lý do xóa là bắt buộc' },
        { status: 400 }
      );
    }

    // Find membership
    const membership = await Membership.findById(params.id);
    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy membership' },
        { status: 404 }
      );
    }

    // Check if membership is already removed
    if (membership.status === 'REMOVED') {
      return NextResponse.json(
        { success: false, error: 'Membership đã bị xóa trước đó' },
        { status: 400 }
      );
    }

    // Initialize removalHistory if it doesn't exist
    if (!membership.removalHistory) {
      membership.removalHistory = [];
    }

    // Thêm lần xóa mới vào history
    const newRemovalEntry = {
      removedAt: new Date(),
      removedBy: {
        _id: user._id,
        name: user.name,
        studentId: user.studentId
      },
      removalReason: removalReason.trim()
    };

    membership.removalHistory.push(newRemovalEntry);

    // Cập nhật trạng thái hiện tại
    membership.status = 'REMOVED';
    membership.removedAt = new Date();
    membership.removedBy = {
      _id: user._id,
      name: user.name,
      studentId: user.studentId
    };
    
    // Lưu lý do xóa hiện tại vào trường mới thay vì ghi đè removalReason
    membership.removalReasonTrue = removalReason.trim();
    
    // Xóa thông tin duyệt lại vì đây là lần xóa mới
    membership.restoredAt = undefined;
    membership.restoredBy = undefined;
    membership.restorationReason = undefined;

    await membership.save();

    return NextResponse.json({
      success: true,
      message: 'Đã xóa thành viên thành công',
      data: {
        membershipId: membership._id,
        removalCount: membership.removalHistory.length
      }
    });

  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi server khi xóa thành viên' },
      { status: 500 }
    );
  }
}
