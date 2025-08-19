import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Membership from '@/models/Membership';

export async function GET(
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

    // Check if user has ADMIN or OFFICER role
    if (decoded.role !== 'ADMIN' && decoded.role !== 'OFFICER') {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    await dbConnect();

    const membership = await Membership.findById(params.id)
      .populate({
        path: 'userId',
        select: 'studentId name email role phone class faculty avatarUrl'
      })
      .populate({
        path: 'approvedBy',
        select: 'studentId name'
      })
      .lean();

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thành viên' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: membership
    });

  } catch (error) {
    console.error('Error fetching membership details:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi server' },
      { status: 500 }
    );
  }
}
