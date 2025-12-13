import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import User from '@/models/User';
import Membership from '@/models/Membership';
import { dbConnect } from '@/lib/db';
import { sendResetPasswordEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập email' },
        { status: 400 }
      );
    }

    // Validate email format
    const normalizedEmail = email.toLowerCase().trim();
    const studentEmailPattern = /^[0-9]{13}@student\.tdmu\.edu\.vn$/;
    const isAdminEmail = normalizedEmail === 'admin@tdmu.edu.vn' || 
                        normalizedEmail === 'admin.clb@tdmu.edu.vn' ||
                        normalizedEmail === 'superadmin@tdmu.edu.vn';
    
    if (!isAdminEmail && !studentEmailPattern.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, message: 'Email không đúng định dạng' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Email không tồn tại trong hệ thống
      return NextResponse.json(
        { 
          success: false, 
          message: 'Email này không tồn tại trong hệ thống. Vui lòng kiểm tra lại email hoặc đăng ký tài khoản mới.' 
        },
        { status: 404 }
      );
    }

    // Check if user has passwordHash (not Google-only account)
    if (!user.passwordHash) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Tài khoản này đã được đăng ký bằng Google. Vui lòng đăng nhập bằng Google.' 
        },
        { status: 400 }
      );
    }

    // Check if user's membership is REMOVED (except SUPER_ADMIN)
    if (user.role !== 'SUPER_ADMIN') {
      const membership = await Membership.findOne({ userId: user._id })
        .sort({ createdAt: -1 });
      
      if (membership && membership.status === 'REMOVED') {
        // Don't reveal the exact reason for security
        return NextResponse.json(
          { 
            success: true, 
            message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu.' 
          },
          { status: 200 }
        );
      }
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token expires in 1 hour

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Generate reset link
    // For reset password links, we always use the root base URL (without /student/dashboard)
    // This ensures reset password links work correctly regardless of NEXT_PUBLIC_BASE_URL setting
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Extract root URL (protocol + host + port) - remove any paths like /student/dashboard
    // This allows NEXT_PUBLIC_BASE_URL to be set to /student/dashboard for demo purposes
    // while reset password links still use the correct root URL
    try {
      const url = new URL(baseUrl);
      baseUrl = `${url.protocol}//${url.host}`;
    } catch (e) {
      // Fallback: manually clean common paths
      baseUrl = baseUrl.trim().replace(/\/+$/, '');
      // Remove common path patterns
      baseUrl = baseUrl.split('/student/dashboard')[0]
                       .split('/admin')[0]
                       .split('/officer')[0]
                       .split('/student')[0];
    }
    
    const resetLink = `${baseUrl}/auth/reset-password?token=${resetToken}`;
    
    // Debug logging
    console.log('🔍 Base URL from env:', process.env.NEXT_PUBLIC_BASE_URL);
    console.log('🔍 Root base URL for reset link:', baseUrl);
    console.log('🔍 Final reset link:', resetLink);

    // Send email with reset link
    const emailResult = await sendResetPasswordEmail(
      user.email, 
      resetLink, 
      user.name || 'Bạn'
    );

    if (!emailResult.success) {
      console.warn('Failed to send email, but reset token was saved:', emailResult.error);
      // Even if email fails, we still return success and show reset link in development
      // This allows the system to work even without email configuration
    }

    console.log('Reset password link for', normalizedEmail, ':', resetLink);

    return NextResponse.json({
      success: true,
      message: emailResult.success 
        ? 'Link đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.' 
        : 'Link đặt lại mật khẩu đã được tạo. Vui lòng kiểm tra console log để lấy link.'
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}

