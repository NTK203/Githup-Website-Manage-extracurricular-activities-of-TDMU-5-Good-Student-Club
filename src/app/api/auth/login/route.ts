import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Membership from '@/models/Membership';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    console.log('Login API called');
    
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return NextResponse.json(
        { error: 'JWT Secret not configured' },
        { status: 500 }
      );
    }

    console.log('Connecting to database...');
    await dbConnect();
    console.log('Database connected');
    
    const body = await request.json();
    const { email, password } = body;
    console.log('Login attempt for email:', email);

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email và mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate email format
    const normalizedEmail = email.toLowerCase().trim();
    
    // Email must be student email format or admin email
    const studentEmailPattern = /^[0-9]{13}@student\.tdmu\.edu\.vn$/;
    const isAdminEmail = normalizedEmail === 'admin@tdmu.edu.vn' || 
                        normalizedEmail === 'admin.clb@tdmu.edu.vn' ||
                        normalizedEmail === 'superadmin@tdmu.edu.vn';
    
    if (!isAdminEmail && !studentEmailPattern.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Email không đúng định dạng' },
        { status: 400 }
      );
    }

    // Find user by email
    console.log('Finding user by email...');
    const user = await User.findOne({ 
      email: normalizedEmail
    });
    
    if (!user) {
      console.log('User not found - email chưa được đăng ký');
      return NextResponse.json(
        { error: 'Email này chưa được đăng ký. Vui lòng đăng ký tài khoản trước.' },
        { status: 404 }
      );
    }

    console.log('User found:', user.studentId, user.email, user.role);

    // Check if user has passwordHash (user registered with email/password)
    if (!user.passwordHash) {
      console.log('User does not have passwordHash - đăng ký bằng Google');
      return NextResponse.json(
        { error: 'Tài khoản này đã được đăng ký bằng Google. Vui lòng đăng nhập bằng Google.' },
        { status: 401 }
      );
    }

    // Verify password using direct bcrypt comparison
    console.log('Verifying password...');
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      console.log('Password invalid');
      return NextResponse.json(
        { error: 'Mật khẩu không đúng' },
        { status: 401 }
      );
    }

    console.log('Password valid, creating token...');

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        studentId: user.studentId,
        name: user.name,
        email: user.email,
        role: user.role
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Initialize role and redirect URL
    let effectiveRole = user.role;
    let redirectUrl = '/student/dashboard'; // Default

    // Check membership status to determine effective role and redirect URL
    let membership = null;
    try {
      membership = await Membership.findOne({ userId: user._id })
        .sort({ createdAt: -1 });
    } catch (membershipError) {
      console.error('Error fetching membership:', membershipError);
      // Continue without membership check if it fails
    }

    // Handle REMOVED membership status - allow login but mark for registration
    if (membership && membership.status === 'REMOVED' && user.role !== 'SUPER_ADMIN') {
      // Also downgrade user role in database if it hasn't been updated yet
      if (['CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER', 'CLUB_STUDENT'].includes(user.role)) {
        user.role = 'STUDENT';
        user.isClubMember = false;
        await user.save();
      }
      
      // Allow login but redirect to registration page
      // User can register again after being removed
      effectiveRole = 'STUDENT';
      redirectUrl = '/student/register'; // Redirect to registration page
    } else {
      // Normal role-based routing
      if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'CLUB_LEADER') {
        redirectUrl = '/admin/dashboard';
      } else if (user.role === 'CLUB_DEPUTY' || user.role === 'CLUB_MEMBER' || user.role === 'OFFICER') {
        redirectUrl = '/officer/dashboard';
      } else if (user.role === 'CLUB_STUDENT' || user.role === 'STUDENT') {
        redirectUrl = '/student/dashboard';
      }
    }

    // Prepare user response with safe field access
    const userResponse = {
      _id: user._id.toString(),
      studentId: user.studentId || '',
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'STUDENT',
      effectiveRole: effectiveRole || user.role || 'STUDENT',
      phone: user.phone || '',
      class: user.class || '',
      faculty: user.faculty || '',
      avatarUrl: user.avatarUrl || ''
    };

    return NextResponse.json({
      success: true,
      message: 'Đăng nhập thành công',
      user: userResponse,
      token: token,
      redirectUrl: redirectUrl
    });

  } catch (error: any) {
    console.error('Login error:', error);
    
    // Log more details for debugging
    if (error.message) {
      console.error('Error message:', error.message);
    }
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    
    // Return more specific error messages if possible
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Lỗi server. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
