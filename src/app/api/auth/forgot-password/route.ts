import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import User from '@/models/User';
import Membership from '@/models/Membership';
import { dbConnect } from '@/lib/db';

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

    // In production, send email with reset link
    // For now, we'll return the reset link (for development/testing)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/auth/reset-password?token=${resetToken}`;

    // TODO: Integrate email service here
    // await sendResetPasswordEmail(user.email, resetLink);

    console.log('Reset password link for', normalizedEmail, ':', resetLink);

    return NextResponse.json({
      success: true,
      message: 'Link đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email.',
      // For development: return reset link (remove in production)
      resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}

