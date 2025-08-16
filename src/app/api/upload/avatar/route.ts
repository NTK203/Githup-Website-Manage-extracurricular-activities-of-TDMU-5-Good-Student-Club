import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';

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
    const file = formData.get('avatar') as File;

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

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Kích thước file không được vượt quá 5MB' },
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
          folder: 'avatars',
          public_id: `user_${user.userId}_${Date.now()}`,
          transformation: [
            { width: 400, height: 400, crop: 'fill' },
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

    // Connect to database and update user's avatar URL
    try {
      await dbConnect();
      
      const updatedUser = await User.findByIdAndUpdate(
        user.userId,
        { 
          avatarUrl: uploadResult.secure_url,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        console.error('User not found for avatar update');
      } else {
        console.log('Avatar URL saved to database:', uploadResult.secure_url);
      }
    } catch (dbError) {
      console.error('Database error when saving avatar URL:', dbError);
      // Continue even if database update fails, as image is already uploaded
    }

    return NextResponse.json({
      success: true,
      message: 'Tải ảnh đại diện thành công',
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id
    });

  } catch (error: any) {
    console.error('Avatar upload error:', error);
    
    return NextResponse.json(
      { error: 'Lỗi tải ảnh. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}

// DELETE avatar
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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
      message: 'Xóa ảnh đại diện thành công',
      result
    });

  } catch (error: any) {
    console.error('Avatar delete error:', error);
    
    return NextResponse.json(
      { error: 'Lỗi xóa ảnh. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
