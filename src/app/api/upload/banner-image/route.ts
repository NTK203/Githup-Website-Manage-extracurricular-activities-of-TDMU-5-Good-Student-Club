import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { dbConnect } from '@/lib/db';

// Configure Cloudinary using CLOUDINARY_URL
const cloudinaryUrl = process.env.CLOUDINARY_URL;

if (!cloudinaryUrl) {
  console.error('Missing CLOUDINARY_URL environment variable');
}

export async function POST(request: NextRequest) {
  try {
    // Check Cloudinary configuration
    if (!cloudinaryUrl) {
      console.error('Cloudinary configuration missing');
      return NextResponse.json(
        { error: 'Cloudinary configuration not found' },
        { status: 500 }
      );
    }

    // Import và cấu hình Cloudinary với URL
    const { v2: cloudinary } = await import('cloudinary');
    
    cloudinary.config({
      cloudinary_url: cloudinaryUrl
    });

    // Verify authentication - MUST be called BEFORE await request.formData()
    // because formData() consumes the request body stream
    const user = getUserFromRequest(request);
    if (!user) {
      console.error('Banner upload POST: No user found in request');
      const authHeader = request.headers.get('authorization');
      console.error('Authorization header:', authHeader ? 'Present' : 'Missing');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permission - only ADMIN, SUPER_ADMIN, CLUB_LEADER can upload banners
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'CLUB_LEADER'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Bạn không có quyền upload banner' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('bannerImage') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Không tìm thấy file ảnh' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File phải là hình ảnh' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB for banner images)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Kích thước file không được vượt quá 10MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary with banner-specific settings
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'banners',
          public_id: `banner_${user.userId}_${Date.now()}`,
          transformation: [
            { width: 1200, height: 400, crop: 'fill' }, // Banner dimensions
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    const uploadResult = result as any;

    return NextResponse.json({
      success: true,
      message: 'Tải ảnh banner thành công',
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id
    });

  } catch (error: any) {
    console.error('Banner image upload error:', error);
    
    return NextResponse.json(
      { error: 'Lỗi tải ảnh. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}

// DELETE banner image
export async function DELETE(request: NextRequest) {
  try {
    // Check Cloudinary configuration
    if (!cloudinaryUrl) {
      console.error('Cloudinary configuration missing');
      return NextResponse.json(
        { error: 'Cloudinary configuration not found' },
        { status: 500 }
      );
    }

    // Import và cấu hình Cloudinary với URL
    const { v2: cloudinary } = await import('cloudinary');
    
    cloudinary.config({
      cloudinary_url: cloudinaryUrl
    });

    // Verify authentication
    const user = getUserFromRequest(request);
    if (!user) {
      console.error('Banner upload DELETE: No user found in request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permission
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'CLUB_LEADER'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Bạn không có quyền xóa banner' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('public_id');

    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID is required' },
        { status: 400 }
      );
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    return NextResponse.json({
      success: true,
      message: 'Xóa ảnh banner thành công',
      result
    });

  } catch (error: any) {
    console.error('Banner image delete error:', error);
    
    return NextResponse.json(
      { error: 'Lỗi xóa ảnh. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}

