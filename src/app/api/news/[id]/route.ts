import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import News from '@/models/News';

// GET /api/news/[id] - Lấy chi tiết bản tin
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const newsPost = await News.findById(params.id)
      .populate('author', 'name avatarUrl')
      .lean();

    if (!newsPost) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bản tin' },
        { status: 404 }
      );
    }

    // Get user for checking if liked
    const user = await getUserFromRequest(request);
    const userId = user?.userId;

    const transformedPost = {
      _id: newsPost._id,
      title: newsPost.title,
      content: newsPost.content,
      imageUrl: newsPost.imageUrl,
      imageUrls: newsPost.imageUrls || (newsPost.imageUrl ? [newsPost.imageUrl] : []),
      pdfUrl: newsPost.pdfUrl,
      author: newsPost.author,
      isPinned: newsPost.isPinned,
      likesCount: newsPost.likes?.length || 0,
      commentsCount: newsPost.comments?.length || 0,
      isLiked: userId ? newsPost.likes?.some((likeId: any) => likeId.toString() === userId.toString()) : false,
      createdAt: newsPost.createdAt,
      updatedAt: newsPost.updatedAt
    };

    return NextResponse.json({
      success: true,
      data: { post: transformedPost }
    });
  } catch (error: any) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tải bản tin' },
      { status: 500 }
    );
  }
}

// PUT /api/news/[id] - Cập nhật bản tin
export async function PUT(
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

    // Check permission
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const newsPost = await News.findById(params.id);
    if (!newsPost) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bản tin' },
        { status: 404 }
      );
    }

    // Check if user is the author or has admin role
    if (newsPost.author.toString() !== user.userId && !['ADMIN', 'SUPER_ADMIN', 'CLUB_LEADER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Bạn không có quyền chỉnh sửa bản tin này' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, imageUrl, imageUrls, pdfUrl, isPinned } = body;

    // Validate imageUrls (max 10)
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Tối đa 10 ảnh' },
        { status: 400 }
      );
    }

    // Update fields
    if (title !== undefined) newsPost.title = title;
    if (content !== undefined) newsPost.content = content;
    if (imageUrl !== undefined) newsPost.imageUrl = imageUrl || undefined;
    if (imageUrls !== undefined) {
      newsPost.imageUrls = Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls : undefined;
    }
    if (pdfUrl !== undefined) newsPost.pdfUrl = pdfUrl || undefined;
    if (isPinned !== undefined) newsPost.isPinned = isPinned;

    await newsPost.save();
    await newsPost.populate('author', 'name avatarUrl');

    return NextResponse.json({
      success: true,
      message: 'Cập nhật bản tin thành công',
      data: {
        post: {
          _id: newsPost._id,
          title: newsPost.title,
          content: newsPost.content,
          imageUrl: newsPost.imageUrl,
          imageUrls: newsPost.imageUrls || (newsPost.imageUrl ? [newsPost.imageUrl] : []),
          pdfUrl: newsPost.pdfUrl,
          author: newsPost.author,
          isPinned: newsPost.isPinned,
          likesCount: newsPost.likes?.length || 0,
          commentsCount: newsPost.comments?.length || 0,
          createdAt: newsPost.createdAt,
          updatedAt: newsPost.updatedAt
        }
      }
    });
  } catch (error: any) {
    console.error('Error updating news:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi cập nhật bản tin' },
      { status: 500 }
    );
  }
}

// DELETE /api/news/[id] - Xóa bản tin
export async function DELETE(
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

    // Check permission
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const newsPost = await News.findById(params.id);
    if (!newsPost) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bản tin' },
        { status: 404 }
      );
    }

    // Check if user is the author or has admin role
    if (newsPost.author.toString() !== user.userId && !['ADMIN', 'SUPER_ADMIN', 'CLUB_LEADER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Bạn không có quyền xóa bản tin này' },
        { status: 403 }
      );
    }

    await News.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Xóa bản tin thành công'
    });
  } catch (error: any) {
    console.error('Error deleting news:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi xóa bản tin' },
      { status: 500 }
    );
  }
}

