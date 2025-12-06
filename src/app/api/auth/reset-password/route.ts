import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import User from '@/models/User';
import Membership from '@/models/Membership';
import { dbConnect } from '@/lib/db';
import { validatePassword } from '@/lib/passwordValidation';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { success: false, message: 'Token và mật khẩu mới là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, message: passwordValidation.error },
        { status: 400 }
      );
    }

    // Find user by reset token and check expiry
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() } // Token not expired
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.' },
        { status: 400 }
      );
    }

    // Check if user's membership is REMOVED (except SUPER_ADMIN)
    if (user.role !== 'SUPER_ADMIN') {
      const membership = await Membership.findOne({ userId: user._id })
        .sort({ createdAt: -1 });
      
      if (membership && membership.status === 'REMOVED') {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Tài khoản của bạn đã bị xóa khỏi câu lạc bộ. Vui lòng liên hệ quản trị viên để biết thêm thông tin.' 
          },
          { status: 403 }
        );
      }
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    user.passwordHash = passwordHash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập với mật khẩu mới.'
    });

  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}

