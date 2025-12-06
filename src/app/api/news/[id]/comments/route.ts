import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Comment from '@/models/Comment';
import News from '@/models/News';

// GET /api/news/[id]/comments - Lấy danh sách bình luận
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const comments = await Comment.find({ newsId: params.id, parentId: null })
      .populate('author', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .lean();

    // Get user for checking if liked (optional - allow guest access)
    let userId = null;
    try {
      const user = await getUserFromRequest(request);
      userId = user?.userId;
    } catch (error) {
      // Allow guest access - userId will be null
    }

    // Get replies for each comment (with nested replies)
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment: any) => {
        const replies = await Comment.find({ parentId: comment._id })
          .populate('author', 'name avatarUrl')
          .sort({ createdAt: 1 })
          .lean();

        // Get nested replies for each reply
        const repliesWithNested = await Promise.all(
          replies.map(async (reply: any) => {
            const nestedReplies = await Comment.find({ parentId: reply._id })
              .populate('author', 'name avatarUrl')
              .sort({ createdAt: 1 })
              .lean();

            return {
              _id: reply._id.toString(),
              content: reply.content,
              imageUrl: reply.imageUrl,
              author: reply.author ? {
                _id: reply.author._id.toString(),
                name: reply.author.name,
                avatarUrl: reply.author.avatarUrl
              } : null,
              likesCount: reply.likes?.length || 0,
              isLiked: userId ? reply.likes?.some((likeId: any) => likeId.toString() === userId.toString()) : false,
              createdAt: reply.createdAt,
              updatedAt: reply.updatedAt,
              replies: nestedReplies.map((nestedReply: any) => ({
                _id: nestedReply._id.toString(),
                content: nestedReply.content,
                imageUrl: nestedReply.imageUrl,
                author: nestedReply.author ? {
                  _id: nestedReply.author._id.toString(),
                  name: nestedReply.author.name,
                  avatarUrl: nestedReply.author.avatarUrl
                } : null,
                likesCount: nestedReply.likes?.length || 0,
                isLiked: userId ? nestedReply.likes?.some((likeId: any) => likeId.toString() === userId.toString()) : false,
                createdAt: nestedReply.createdAt,
                updatedAt: nestedReply.updatedAt
              }))
            };
          })
        );

        return {
          _id: comment._id.toString(),
          content: comment.content,
          imageUrl: comment.imageUrl,
          author: comment.author ? {
            _id: comment.author._id.toString(),
            name: comment.author.name,
            avatarUrl: comment.author.avatarUrl
          } : null,
          likesCount: comment.likes?.length || 0,
          isLiked: userId ? comment.likes?.some((likeId: any) => likeId.toString() === userId.toString()) : false,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          replies: repliesWithNested
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: { comments: commentsWithReplies }
    });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tải bình luận' },
      { status: 500 }
    );
  }
}

// POST /api/news/[id]/comments - Tạo bình luận mới
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const { content, imageUrl, parentId } = body;

    // Validate content or image
    if ((!content || content.trim().length === 0) && !imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Nội dung bình luận hoặc ảnh là bắt buộc' },
        { status: 400 }
      );
    }

    if (content && content.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Nội dung bình luận không được quá 1000 ký tự' },
        { status: 400 }
      );
    }

    // Check if news exists
    const news = await News.findById(params.id);
    if (!news) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bản tin' },
        { status: 404 }
      );
    }

    // Create comment
    const comment = new Comment({
      newsId: params.id,
      author: user.userId,
      content: content ? content.trim() : '',
      imageUrl: imageUrl || undefined,
      parentId: parentId || null,
      likes: []
    });

    await comment.save();

    // Update news comments array
    if (!news.comments) {
      news.comments = [];
    }
    news.comments.push(comment._id);
    await news.save();

    // Populate author
    await comment.populate('author', 'name avatarUrl');

    return NextResponse.json({
      success: true,
      message: 'Thêm bình luận thành công',
      data: {
        comment: {
          _id: comment._id,
          content: comment.content,
          imageUrl: comment.imageUrl,
          author: comment.author,
          likesCount: 0,
          isLiked: false,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          replies: []
        }
      }
    });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi thêm bình luận' },
      { status: 500 }
    );
  }
}

