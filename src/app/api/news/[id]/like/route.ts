import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import News from '@/models/News';

// POST /api/news/[id]/like - Like/Unlike bản tin
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
    const isLiked = likes.some((likeId: any) => likeId.toString() === userId.toString());

    if (isLiked) {
      // Unlike - remove from likes array
      newsPost.likes = likes.filter((likeId: any) => likeId.toString() !== userId.toString());
    } else {
      // Like - add to likes array
      if (!newsPost.likes) {
        newsPost.likes = [];
      }
      newsPost.likes.push(userId);
    }

    await newsPost.save();

    return NextResponse.json({
      success: true,
      message: isLiked ? 'Đã bỏ thích' : 'Đã thích',
      data: {
        isLiked: !isLiked,
        likesCount: newsPost.likes.length
      }
    });
  } catch (error: any) {
    console.error('Error liking news:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi thích/bỏ thích bản tin' },
      { status: 500 }
    );
  }
}

