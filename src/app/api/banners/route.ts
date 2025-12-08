import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Banner from '@/models/Banner';

// GET /api/banners - Lấy danh sách banner
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // Build query
    const query: any = {};
    if (activeOnly) {
      query.isActive = true;
    }

    // Get banners, sort by order then createdAt
    const banners = await Banner.find(query)
      .populate('createdBy', 'name avatarUrl')
      .sort({ order: 1, createdAt: -1 })
      .lean();

    // Transform banners
    const transformedBanners = banners.map((banner: any) => ({
      id: banner._id.toString(),
      title: banner.title,
      imageUrl: banner.imageUrl,
      link: banner.link || null,
      imageFit: banner.imageFit || 'cover',
      order: banner.order,
      isActive: banner.isActive,
      createdBy: banner.createdBy ? {
        _id: banner.createdBy._id,
        name: banner.createdBy.name,
        avatarUrl: banner.createdBy.avatarUrl
      } : null,
      createdAt: banner.createdAt,
      updatedAt: banner.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: transformedBanners
    });
  } catch (error: any) {
    console.error('Error fetching banners:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tải danh sách banner' },
      { status: 500 }
    );
  }
}

// POST /api/banners - Tạo banner mới
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

    // Check permission - only ADMIN, SUPER_ADMIN, CLUB_LEADER can create banners
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'CLUB_LEADER'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Bạn không có quyền tạo banner' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, imageUrl, link, imageFit, order, isActive } = body;

    // Validation
    if (!title || !imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Tiêu đề và URL ảnh là bắt buộc' },
        { status: 400 }
      );
    }

    // Create banner
    const banner = new Banner({
      title,
      imageUrl,
      link: link || null,
      imageFit: imageFit || 'cover',
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: user.userId
    });

    await banner.save();

    // Populate createdBy
    await banner.populate('createdBy', 'name avatarUrl');

    return NextResponse.json({
      success: true,
      data: {
        id: banner._id.toString(),
        title: banner.title,
        imageUrl: banner.imageUrl,
        link: banner.link || null,
        imageFit: banner.imageFit || 'cover',
        order: banner.order,
        isActive: banner.isActive,
        createdBy: banner.createdBy ? {
          _id: banner.createdBy._id,
          name: banner.createdBy.name,
          avatarUrl: banner.createdBy.avatarUrl
        } : null,
        createdAt: banner.createdAt,
        updatedAt: banner.updatedAt
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating banner:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: errors.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Lỗi khi tạo banner' },
      { status: 500 }
    );
  }
}
