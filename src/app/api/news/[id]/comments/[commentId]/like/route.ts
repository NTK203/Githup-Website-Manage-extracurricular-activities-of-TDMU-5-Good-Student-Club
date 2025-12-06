import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Comment from '@/models/Comment';

// POST /api/news/[id]/comments/[commentId]/like - Like/Unlike bình luận
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    await dbConnect();

    // Verify authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const comment = await Comment.findById(params.commentId);
    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bình luận' },
        { status: 404 }
      );
    }

    const userId = user.userId;
    const likes = comment.likes || [];
    const isLiked = likes.some((likeId: any) => likeId.toString() === userId.toString());

    if (isLiked) {
      // Unlike - remove from likes array
      comment.likes = likes.filter((likeId: any) => likeId.toString() !== userId.toString());
    } else {
      // Like - add to likes array
      if (!comment.likes) {
        comment.likes = [];
      }
      comment.likes.push(userId);
    }

    await comment.save();

    return NextResponse.json({
      success: true,
      message: isLiked ? 'Đã bỏ thích' : 'Đã thích',
      data: {
        isLiked: !isLiked,
        likesCount: comment.likes.length
      }
    });
  } catch (error: any) {
    console.error('Error liking comment:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi thích/bỏ thích bình luận' },
      { status: 500 }
    );
  }
}

