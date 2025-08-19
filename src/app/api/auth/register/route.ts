import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import User from '@/models/User';
import { dbConnect } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { studentId, name, email, password, phone, class: className, faculty } = body;

    // Validation
    if (!studentId || !name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // Validate studentId format
    if (!studentId.startsWith('admin') && !/^\d{13}$/.test(studentId)) {
      return NextResponse.json(
        { success: false, message: 'Mã số sinh viên phải có 13 chữ số hoặc bắt đầu bằng "admin"' },
        { status: 400 }
      );
    }

    // Validate email format
    if (email !== 'admin@tdmu.edu.vn' && email !== 'admin.clb@tdmu.edu.vn' && !/^[0-9]{13}@student\.tdmu\.edu\.vn$/.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Email phải có định dạng: mã số sinh viên@student.tdmu.edu.vn hoặc admin@tdmu.edu.vn hoặc admin.clb@tdmu.edu.vn' },
        { status: 400 }
      );
    }

    // Check if email matches student ID (only for student emails)
    if (email.includes('@student.tdmu.edu.vn')) {
      const emailStudentId = email.split('@')[0];
      if (emailStudentId !== studentId) {
        return NextResponse.json(
          { success: false, message: 'Email phải khớp với mã số sinh viên' },
          { status: 400 }
        );
      }
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      );
    }

    // Validate phone format (optional)
    if (phone && !/^[0-9]{10,11}$/.test(phone)) {
      return NextResponse.json(
        { success: false, message: 'Số điện thoại phải có 10-11 chữ số' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { studentId }],
      isDeleted: { $ne: true }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email hoặc mã số sinh viên đã tồn tại' },
        { status: 400 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new User({
      studentId,
      name,
      email,
      passwordHash,
      role: 'STUDENT', // Default role for registration (all students are STUDENT)
      phone: phone || undefined,
      class: className || undefined,
      faculty: faculty || undefined,
      isClubMember: false
    });

    await newUser.save();

    // Return success without password
    const userResponse = {
      _id: newUser._id,
      studentId: newUser.studentId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phone: newUser.phone || '',
      class: newUser.class || '',
      faculty: newUser.faculty || '',
      isClubMember: newUser.isClubMember,
      createdAt: newUser.createdAt
    };

    return NextResponse.json({
      success: true,
      message: 'Đăng ký thành công',
      user: userResponse
    });

  } catch (error: any) {
    console.error('Registration error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, message: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === 'email' ? 'Email' : 'Mã số sinh viên';
      return NextResponse.json(
        { success: false, message: `${fieldName} đã tồn tại` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Lỗi server. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
