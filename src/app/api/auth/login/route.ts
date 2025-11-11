import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Membership from '@/models/Membership';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      return NextResponse.json(
        { error: 'JWT Secret not configured' },
        { status: 500 }
      );
    }

    await dbConnect();
    
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email và mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }

    // Find user by email (exclude deleted users)
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      isDeleted: { $ne: true }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Verify password using direct bcrypt comparison
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        studentId: user.studentId,
        name: user.name,
        email: user.email,
        role: user.role
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Check membership status to determine effective role and redirect URL
    const membership = await Membership.findOne({ userId: user._id })
      .sort({ createdAt: -1 });

    let effectiveRole = user.role;
    let redirectUrl = '/student/dashboard'; // Default

    // Normal role-based routing first
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'CLUB_LEADER') {
      redirectUrl = '/admin/dashboard';
    } else if (user.role === 'CLUB_DEPUTY' || user.role === 'CLUB_MEMBER' || user.role === 'OFFICER') {
      redirectUrl = '/officer/dashboard';
    } else if (user.role === 'CLUB_STUDENT' || user.role === 'STUDENT') {
      redirectUrl = '/student/dashboard';
    }

    // Override routing if membership is REMOVED
    if (membership && membership.status === 'REMOVED') {
      // If membership is REMOVED, downgrade to STUDENT regardless of role
      // But CLUB_LEADER still keeps admin access
      if (['CLUB_DEPUTY', 'CLUB_MEMBER', 'CLUB_STUDENT'].includes(user.role)) {
        effectiveRole = 'STUDENT';
        redirectUrl = '/student/dashboard';
      }
      // CLUB_LEADER keeps their admin access even if membership is REMOVED
    }

    return NextResponse.json({
      success: true,
      message: 'Đăng nhập thành công',
      user: {
        _id: user._id,
        studentId: user.studentId,
        name: user.name,
        email: user.email,
        role: user.role,
        effectiveRole: effectiveRole,
        phone: user.phone,
        class: user.class,
        faculty: user.faculty,
        avatarUrl: user.avatarUrl
      },
      token: token,
      redirectUrl: redirectUrl
    });

  } catch (error: unknown) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      { error: 'Lỗi server. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
