import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Banner from '@/models/Banner';

// GET /api/banners/[id] - Lấy chi tiết banner
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const banner = await Banner.findById(params.id)
      .populate('createdBy', 'name avatarUrl')
      .lean();

    if (!banner) {
      return NextResponse.json(
        { success: false, error: 'Banner không tồn tại' },
        { status: 404 }
      );
    }

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
    });
  } catch (error: any) {
    console.error('Error fetching banner:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tải banner' },
      { status: 500 }
    );
  }
}

// PUT /api/banners/[id] - Cập nhật banner
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

    // Check permission - only ADMIN, SUPER_ADMIN, CLUB_LEADER can update banners
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'CLUB_LEADER'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Bạn không có quyền cập nhật banner' },
        { status: 403 }
      );
    }

    const banner = await Banner.findById(params.id);
    if (!banner) {
      return NextResponse.json(
        { success: false, error: 'Banner không tồn tại' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, imageUrl, link, imageFit, order, isActive } = body;

    // Update fields
    if (title !== undefined) banner.title = title;
    if (imageUrl !== undefined) banner.imageUrl = imageUrl;
    if (link !== undefined) banner.link = link || null;
    if (imageFit !== undefined) banner.imageFit = imageFit;
    if (order !== undefined) banner.order = order;
    if (isActive !== undefined) banner.isActive = isActive;

    await banner.save();
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
    });
  } catch (error: any) {
    console.error('Error updating banner:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: errors.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Lỗi khi cập nhật banner' },
      { status: 500 }
    );
  }
}

// DELETE /api/banners/[id] - Xóa banner
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

    // Check permission - only ADMIN, SUPER_ADMIN, CLUB_LEADER can delete banners
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'CLUB_LEADER'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Bạn không có quyền xóa banner' },
        { status: 403 }
      );
    }

    const banner = await Banner.findByIdAndDelete(params.id);
    
    if (!banner) {
      return NextResponse.json(
        { success: false, error: 'Banner không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa banner thành công'
    });
  } catch (error: any) {
    console.error('Error deleting banner:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi xóa banner' },
      { status: 500 }
    );
  }
}
