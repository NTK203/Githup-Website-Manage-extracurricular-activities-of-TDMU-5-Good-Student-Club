import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Comment from '@/models/Comment';
import User from '@/models/User';

// GET /api/news/[id]/comments/[commentId]/likes - Lấy danh sách người đã thích bình luận
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    await dbConnect();

    const comment = await Comment.findById(params.commentId)
      .populate('likes', 'name avatarUrl')
      .lean();

    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bình luận' },
        { status: 404 }
      );
    }

    const likes = (comment.likes || []).map((user: any) => ({
      _id: user._id.toString(),
      name: user.name,
      avatarUrl: user.avatarUrl
    }));

    return NextResponse.json({
      success: true,
      data: {
        users: likes
      }
    });
  } catch (error: any) {
    console.error('Error fetching comment likes:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tải danh sách người thích' },
      { status: 500 }
    );
  }
}

