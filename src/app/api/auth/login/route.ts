import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import dbConnect from '@/lib/db';
import User from '@/models/User';
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
        email: user.email,
        role: user.role
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      message: 'Đăng nhập thành công',
      user: {
        _id: user._id,
        studentId: user.studentId,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        class: user.class,
        faculty: user.faculty,
        avatarUrl: user.avatarUrl
      },
      token: token
    });

  } catch (error: unknown) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      { error: 'Lỗi server. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
