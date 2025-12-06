import { NextRequest, NextResponse } from 'next/server';
import User from '@/models/User';
import { dbConnect } from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    console.log('Google OAuth API called');
    await dbConnect();
    console.log('Database connected');

    const body = await request.json();
    const { access_token } = body;

    if (!access_token) {
      console.log('No access token provided');
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 400 }
      );
    }

    // Fetch user info from Google
    let googleUserInfo;
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: 'Invalid Google access token' },
          { status: 401 }
        );
      }

      googleUserInfo = await response.json();
    } catch (error) {
      console.error('Error fetching Google user info:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user info from Google' },
        { status: 500 }
      );
    }

    const { id: googleId, email, name, picture } = googleUserInfo;

    if (!email || !name) {
      return NextResponse.json(
        { success: false, error: 'Email và tên là bắt buộc từ Google' },
        { status: 400 }
      );
    }

    // Validate email format
    const normalizedEmail = email.toLowerCase().trim();
    
    // Email must be student email format (@student.tdmu.edu.vn)
    const studentEmailPattern = /^[0-9]{13}@student\.tdmu\.edu\.vn$/;
    
    if (!studentEmailPattern.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Email không đúng định dạng. Chỉ chấp nhận email @student.tdmu.edu.vn' },
        { status: 400 }
      );
    }

    // Check if email already exists in the system
    const existingUserByEmail = await User.findOne({
      email: normalizedEmail
    });

    // Check if user exists by googleId (same Google account)
    const existingUserByGoogleId = await User.findOne({
      googleId
    });

    let user = existingUserByGoogleId || existingUserByEmail;
    let isNewUser = false;
    let studentId: string;
    let needsCompleteProfile = false;

    if (user) {
      // User exists - check different scenarios
      
      // Scenario 1: User exists with same googleId (same Google account) - Allow login
      if (user.googleId === googleId) {
        // Update avatar if changed
        if (picture && user.avatarUrl !== picture) {
          user.avatarUrl = picture;
          await user.save();
        }
        studentId = user.studentId;
      }
      // Scenario 2: Email already exists but with different googleId or no googleId
      else if (user.email === normalizedEmail) {
        if (user.googleId && user.googleId !== googleId) {
          // Email đã được sử dụng bởi Google account khác
          return NextResponse.json(
            { success: false, error: 'Email này đã được sử dụng bởi tài khoản Google khác. Vui lòng sử dụng tài khoản Google đã đăng ký hoặc đăng nhập bằng email/mật khẩu.' },
            { status: 400 }
          );
        } else if (!user.googleId) {
          // Email đã đăng ký bằng email/password - Cho phép liên kết Google account và đăng nhập
          user.googleId = googleId;
          if (picture) user.avatarUrl = picture;
          await user.save();
          studentId = user.studentId;
        }
      }
      // Scenario 3: Different email but same googleId (shouldn't happen, but handle it)
      else {
        return NextResponse.json(
          { success: false, error: 'Tài khoản Google này đã được liên kết với email khác.' },
          { status: 400 }
        );
      }
    } else {
      // New user - create account
      // Email đã được validate là @student.tdmu.edu.vn ở trên
      isNewUser = true;

      // Extract student ID from email (format: 13digits@student.tdmu.edu.vn)
      const emailParts = normalizedEmail.split('@');
      const potentialStudentId = emailParts[0];
      
      if (/^\d{13}$/.test(potentialStudentId)) {
        studentId = potentialStudentId;
      } else {
        // Invalid student email format - should not happen after validation, but handle it
        return NextResponse.json(
          { success: false, error: 'Email không đúng định dạng. Mã số sinh viên phải có 13 chữ số.' },
          { status: 400 }
        );
      }

      // Check if studentId already exists
      const existingStudentId = await User.findOne({ studentId });
      if (existingStudentId) {
        return NextResponse.json(
          { success: false, error: 'Mã số sinh viên đã được sử dụng. Vui lòng đăng nhập bằng email/mật khẩu hoặc Google.' },
          { status: 400 }
        );
      }

      // Create new user
      console.log('Creating new user with:', { studentId, email: normalizedEmail, googleId });
      const userData: any = {
        studentId,
        name,
        email: normalizedEmail,
        googleId,
        role: 'STUDENT',
        isClubMember: false,
        // passwordHash is optional for Google users
      };
      
      // Only set optional fields if they have values
      if (picture) {
        userData.avatarUrl = picture;
      }
      
      // Explicitly don't set faculty (leave it undefined)
      user = new User(userData);

      try {
        await user.save();
        console.log('User created successfully:', user._id);
      } catch (saveError: any) {
        console.error('Error saving user:', saveError);
        console.error('Save error details:', {
          name: saveError.name,
          message: saveError.message,
          code: saveError.code,
          errors: saveError.errors
        });
        throw saveError;
      }
    }

    // Check membership status - block login if REMOVED (except SUPER_ADMIN)
    const Membership = (await import('@/models/Membership')).default;
    let membership = null;
    try {
      membership = await Membership.findOne({ userId: user._id })
        .sort({ createdAt: -1 });
    } catch (membershipError) {
      console.error('Error fetching membership:', membershipError);
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { success: false, error: 'JWT secret not configured' },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        studentId: user.studentId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Return user data (without password)
    const userResponse = {
      _id: user._id,
      studentId: user.studentId,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      class: user.class || '',
      faculty: user.faculty || '',
      isClubMember: user.isClubMember,
      avatarUrl: user.avatarUrl || '',
      createdAt: user.createdAt
    };

    // Determine redirect URL based on role
    let redirectUrl = '/student/dashboard';
    
    // Handle REMOVED membership status - allow login but redirect to registration page
    if (membership && membership.status === 'REMOVED' && user.role !== 'SUPER_ADMIN') {
      // Also downgrade user role in database if it hasn't been updated yet
      if (['CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER', 'CLUB_STUDENT'].includes(user.role)) {
        user.role = 'STUDENT';
        user.isClubMember = false;
        await user.save();
      }
      
      // Allow login but redirect to registration page
      // User can register again after being removed
      redirectUrl = '/student/register'; // Redirect to registration page
    } else if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'CLUB_LEADER') {
      redirectUrl = '/admin/dashboard';
    } else if (user.role === 'CLUB_DEPUTY' || user.role === 'CLUB_MEMBER') {
      redirectUrl = '/officer/dashboard';
    }

    // Check if user needs to set password (new user without passwordHash)
    const needsPassword = isNewUser && !user.passwordHash;

    return NextResponse.json({
      success: true,
      user: userResponse,
      token,
      isNewUser,
      needsCompleteProfile,
      needsPassword, // Flag để frontend biết cần hiển thị form password
      redirectUrl
    });

  } catch (error: any) {
    console.error('Google OAuth error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
      errors: error.errors
    });

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {});
      console.error('Validation errors:', validationErrors);
      
      // Get the first error message (most important)
      const firstError = validationErrors[0] as any;
      if (firstError) {
        // Map field names to user-friendly messages
        const fieldMessages: { [key: string]: string } = {
          'studentId': 'Mã số sinh viên không hợp lệ',
          'email': 'Email không đúng định dạng',
          'passwordHash': 'Mật khẩu phải có ít nhất 6 ký tự, 1 chữ cái viết hoa và 1 ký tự đặc biệt',
          'name': 'Họ và tên không hợp lệ',
          'faculty': 'Khoa/Viện không hợp lệ',
          'phone': 'Số điện thoại không hợp lệ'
        };
        
        const fieldName = firstError.path || '';
        const friendlyMessage = fieldMessages[fieldName] || firstError.message || 'Dữ liệu không hợp lệ';
        
        return NextResponse.json(
          { success: false, error: friendlyMessage },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    // Handle duplicate key errors (MongoDB unique constraint violation)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      const fieldName = field === 'email' ? 'Email' : field === 'googleId' ? 'Google ID' : 'Mã số sinh viên';
      console.error('Duplicate key error:', field, error.keyValue);
      
      // If user was deleted and trying to register again, this should not happen with hard delete
      // But if it does, provide a helpful message
      return NextResponse.json(
        { success: false, error: `${fieldName} đã tồn tại trong hệ thống` },
        { status: 400 }
      );
    }

    // Handle pre-save hook errors
    if (error.message && error.message.includes('must have either passwordHash or googleId')) {
      console.error('Pre-save validation error');
      return NextResponse.json(
        { success: false, error: 'Lỗi tạo tài khoản. Vui lòng thử lại.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi server. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}

