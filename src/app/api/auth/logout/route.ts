import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Logout is primarily handled on the client side
    // This endpoint can be used for server-side logout if needed
    // (e.g., blacklisting tokens, logging logout events, etc.)
    
    return NextResponse.json({
      success: true,
      message: 'Đăng xuất thành công'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json(
      { error: 'Lỗi server. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
