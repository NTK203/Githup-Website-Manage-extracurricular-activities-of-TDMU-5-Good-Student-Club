import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import News from '@/models/News';
import User from '@/models/User';

// GET /api/news - Lấy danh sách bản tin
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Get user for checking if liked (optional - allow guest access)
    let userId = null;
    try {
      const user = await getUserFromRequest(request);
      userId = user?.userId;
    } catch (error) {
      // Allow guest access - userId will be null
    }

    // Build query
    const query: any = {};

    // Get news posts with author info
    const newsPosts = await News.find(query)
      .populate('author', 'name avatarUrl')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform posts to include like status and counts
    const transformedPosts = newsPosts.map((post: any) => ({
      _id: post._id,
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl, // For backward compatibility
      imageUrls: post.imageUrls || (post.imageUrl ? [post.imageUrl] : []), // Use imageUrls if available, fallback to imageUrl
      pdfUrl: post.pdfUrl,
      author: post.author ? {
        _id: post.author._id,
        name: post.author.name,
        avatarUrl: post.author.avatarUrl
      } : null,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      isPinned: post.isPinned,
      likesCount: post.likes?.length || 0,
      commentsCount: post.comments?.length || 0,
      isLiked: userId ? post.likes?.some((likeId: any) => likeId.toString() === userId.toString()) : false
    }));

    // Get total count
    const totalCount = await News.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        posts: transformedPosts,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tải danh sách bản tin' },
      { status: 500 }
    );
  }
}

// POST /api/news - Tạo bản tin mới
export async function POST(request: NextRequest) {
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

    // Check permission - only ADMIN, SUPER_ADMIN, CLUB_LEADER, CLUB_DEPUTY, CLUB_MEMBER can create news
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, imageUrl, imageUrls, pdfUrl, isPinned } = body;

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Tiêu đề và nội dung là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate imageUrls (max 10)
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Tối đa 10 ảnh' },
        { status: 400 }
      );
    }

    // Create news post
    const newsPost = new News({
      title,
      content,
      imageUrl: imageUrl || undefined, // For backward compatibility
      imageUrls: imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls : undefined,
      pdfUrl: pdfUrl || undefined,
      author: user.userId,
      isPinned: isPinned || false,
      likes: [],
      comments: []
    });

    await newsPost.save();

    // Populate author info
    await newsPost.populate('author', 'name avatarUrl');

    return NextResponse.json({
      success: true,
      message: 'Tạo bản tin thành công',
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
          likesCount: 0,
          commentsCount: 0,
          createdAt: newsPost.createdAt,
          updatedAt: newsPost.updatedAt
        }
      }
    });
  } catch (error: any) {
    console.error('Error creating news:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi tạo bản tin' },
      { status: 500 }
    );
  }
}

