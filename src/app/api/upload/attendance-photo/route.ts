import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

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

    // Verify authentication
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('attendancePhoto') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Không tìm thấy file ảnh' },
        { status: 400 }
      );
    }

    // Validate file type - only accept JPEG/PNG from camera
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File phải là hình ảnh' },
        { status: 400 }
      );
    }

    // Additional security: Only accept JPEG/PNG (typical camera formats)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: 'Chỉ chấp nhận ảnh JPEG hoặc PNG từ camera' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB) - camera photos are usually smaller
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Kích thước file không được vượt quá 5MB' },
        { status: 400 }
      );
    }

    // Additional check: Camera photos are usually at least 50KB
    const minSize = 50 * 1024; // 50KB
    if (file.size < minSize) {
      return NextResponse.json(
        { error: 'File ảnh không hợp lệ. Vui lòng chụp lại từ camera.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'attendance-photos',
          public_id: `attendance_${user.userId}_${Date.now()}`,
          transformation: [
            { width: 1920, height: 1080, crop: 'limit' },
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
      message: 'Tải ảnh điểm danh thành công',
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id
    });

  } catch (error: any) {
    console.error('Attendance photo upload error:', error);
    
    return NextResponse.json(
      { error: 'Lỗi tải ảnh. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}

