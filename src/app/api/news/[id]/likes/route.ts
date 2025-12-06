import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import News from '@/models/News';
import User from '@/models/User';

// GET /api/news/[id]/likes - Lấy danh sách người đã thích bản tin
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const newsPost = await News.findById(params.id)
      .populate('likes', 'name avatarUrl')
      .lean();

    if (!newsPost) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bản tin' },
        { status: 404 }
      );
    }

    const likes = (newsPost.likes || []).map((user: any) => ({
      _id: user._id.toString(),
      name: user.name,
      avatarUrl: user.avatarUrl
    }));

    return NextResponse.json({
      success: true,
      data: {
        likes
      }
    });
  } catch (error: any) {
    console.error('Error fetching likes:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tải danh sách người thích' },
      { status: 500 }
    );
  }
}

