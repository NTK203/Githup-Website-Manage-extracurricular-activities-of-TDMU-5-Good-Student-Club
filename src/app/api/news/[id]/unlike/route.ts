import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import News from '@/models/News';

// POST /api/news/[id]/unlike - Unlike bản tin (alias for like endpoint)
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

    const newsPost = await News.findById(params.id);
    if (!newsPost) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bản tin' },
        { status: 404 }
      );
    }

    const userId = user.userId;
    const likes = newsPost.likes || [];
    
    // Remove from likes array
    newsPost.likes = likes.filter((likeId: any) => likeId.toString() !== userId.toString());
    await newsPost.save();

    return NextResponse.json({
      success: true,
      message: 'Đã bỏ thích',
      data: {
        isLiked: false,
        likesCount: newsPost.likes.length
      }
    });
  } catch (error: any) {
    console.error('Error unliking news:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi bỏ thích bản tin' },
      { status: 500 }
    );
  }
}

