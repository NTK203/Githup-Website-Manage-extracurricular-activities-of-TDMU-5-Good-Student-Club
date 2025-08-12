import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cloudinaryUrl = process.env.CLOUDINARY_URL;
    
    if (!cloudinaryUrl) {
      return NextResponse.json({
        ok: false,
        error: "Missing CLOUDINARY_URL environment variable"
      });
    }

    // Import và cấu hình Cloudinary với URL
    const { v2 } = await import('cloudinary');
    
    v2.config({
      cloudinary_url: cloudinaryUrl
    });

    // Test kết nối
    const result = await v2.api.ping();
    
    if (result.status === 'ok') {
      return NextResponse.json({
        ok: true,
        message: "Cloudinary connection successful!",
        cloud_url: cloudinaryUrl.replace(/\/\/.*@/, '//***:***@') // Ẩn thông tin nhạy cảm
      });
    } else {
      throw new Error("Ping failed");
    }

  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message
    });
  }
} 