import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { validatePassword } from '@/lib/passwordValidation';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const currentUser = getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate new password is required
    if (!newPassword) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập mật khẩu mới' },
        { status: 400 }
      );
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Get user with password hash
    const user = await User.findById(currentUser.userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Người dùng không tồn tại' },
        { status: 404 }
      );
    }

    // If user has passwordHash, require currentPassword for verification
    if (user.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Vui lòng nhập mật khẩu hiện tại' },
          { status: 400 }
        );
      }

      // Verify current password
      console.log('Verifying current password for user:', user.email);
      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      console.log('Password verification result:', isPasswordValid);

      if (!isPasswordValid) {
        console.log('Password verification failed for user:', user.email);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Mật khẩu hiện tại không đúng. Vui lòng kiểm tra lại hoặc sử dụng chức năng "Quên mật khẩu" nếu bạn không nhớ mật khẩu.' 
          },
          { status: 400 }
        );
      }

      // Check if new password is same as current password
      const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
      if (isSamePassword) {
        return NextResponse.json(
          { success: false, error: 'Mật khẩu mới phải khác mật khẩu hiện tại' },
          { status: 400 }
        );
      }
    }
    // If user doesn't have passwordHash (Google-only account), allow setting password for the first time
    // currentPassword is not required in this case

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.passwordHash = newPasswordHash;
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });

  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi server. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}

