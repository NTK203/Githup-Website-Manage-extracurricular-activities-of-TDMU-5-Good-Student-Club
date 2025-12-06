import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Comment from '@/models/Comment';

// PUT /api/news/[id]/comments/[commentId] - Cập nhật bình luận
export async function PUT(
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

    const body = await request.json();
    const { content, imageUrl } = body;

    if ((!content || content.trim().length === 0) && !imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Nội dung bình luận hoặc ảnh là bắt buộc' },
        { status: 400 }
      );
    }

    const comment = await Comment.findById(params.commentId);
    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bình luận' },
        { status: 404 }
      );
    }

    // Check if user is the author
    if (comment.author.toString() !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Bạn không có quyền chỉnh sửa bình luận này' },
        { status: 403 }
      );
    }

    if (content !== undefined) {
      comment.content = content.trim();
    }
    if (imageUrl !== undefined) {
      // Allow empty string to remove image
      comment.imageUrl = imageUrl === '' ? undefined : imageUrl;
    }
    await comment.save();
    await comment.populate('author', 'name avatarUrl');

    return NextResponse.json({
      success: true,
      message: 'Cập nhật bình luận thành công',
      data: { comment }
    });
  } catch (error: any) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi cập nhật bình luận' },
      { status: 500 }
    );
  }
}

// DELETE /api/news/[id]/comments/[commentId] - Xóa bình luận
export async function DELETE(
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

    // Get the news post to check if user is the post author
    const News = (await import('@/models/News')).default;
    const newsPost = await News.findById(params.id);
    if (!newsPost) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bản tin' },
        { status: 404 }
      );
    }

    // Check if user is the comment author, post author, or admin
    const isCommentAuthor = comment.author.toString() === user.userId;
    const isPostAuthor = newsPost.author.toString() === user.userId;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'CLUB_LEADER'].includes(user.role);

    if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Bạn không có quyền xóa bình luận này' },
        { status: 403 }
      );
    }

    // Delete all replies first
    await Comment.deleteMany({ parentId: params.commentId });

    // Delete the comment
    await Comment.findByIdAndDelete(params.commentId);

    // Remove from news comments array
    await News.findByIdAndUpdate(params.id, {
      $pull: { comments: params.commentId }
    });

    return NextResponse.json({
      success: true,
      message: 'Xóa bình luận thành công'
    });
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi xóa bình luận' },
      { status: 500 }
    );
  }
}

