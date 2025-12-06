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
        { success: false, error: 'Cloudinary configuration not found' },
        { status: 500 }
      );
    }

    // Import và cấu hình Cloudinary với URL
    const { v2: cloudinary } = await import('cloudinary');
    
    // Parse CLOUDINARY_URL if it exists, otherwise use individual env vars
    if (cloudinaryUrl) {
      // CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name
      const urlMatch = cloudinaryUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
      if (urlMatch) {
        const [, apiKey, apiSecret, cloudName] = urlMatch;
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret
        });
      } else {
        // Fallback: try to use the URL directly
        cloudinary.config({
          cloudinary_url: cloudinaryUrl
        });
      }
    } else {
      // Fallback to individual environment variables
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
    }

    // Verify authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy file' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Thiếu tham số type (image hoặc pdf)' },
        { status: 400 }
      );
    }

    // Validate file type based on type parameter
    if (type === 'image') {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { success: false, error: 'File phải là hình ảnh' },
          { status: 400 }
        );
      }
      // Validate file size (max 10MB for images)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { success: false, error: 'Kích thước file không được vượt quá 10MB' },
          { status: 400 }
        );
      }
    } else if (type === 'pdf') {
      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { success: false, error: 'File phải là PDF' },
          { status: 400 }
        );
      }
      // Validate file size (max 20MB for PDFs)
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { success: false, error: 'Kích thước file không được vượt quá 20MB' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Loại file không hợp lệ' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine folder and transformation based on type
    const folder = type === 'image' ? 'news/images' : 'news/pdfs';
    const publicId = type === 'image' 
      ? `news_image_${user.userId}_${Date.now()}`
      : `news_pdf_${user.userId}_${Date.now()}`;

    const uploadOptions: any = {
      folder: folder,
      public_id: publicId,
      resource_type: type === 'pdf' ? 'raw' : 'image'
    };

    // Add image transformations if it's an image
    if (type === 'image') {
      uploadOptions.transformation = [
        { width: 1200, height: 800, crop: 'limit' },
        { quality: 'auto' }
      ];
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    const uploadResult = result as any;

    const imageUrl = uploadResult.secure_url || uploadResult.url;
    
    if (!imageUrl) {
      console.error('No URL in upload result:', uploadResult);
      return NextResponse.json(
        { success: false, error: 'Không nhận được URL từ Cloudinary' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Tải ${type === 'image' ? 'ảnh' : 'PDF'} thành công`,
      data: {
        url: imageUrl,
        secure_url: imageUrl, // Ensure both fields are present
        public_id: uploadResult.public_id
      }
    });

  } catch (error: any) {
    console.error('File upload error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Lỗi tải file. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}

