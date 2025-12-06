import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import User from '@/models/User';
import { dbConnect } from '@/lib/db';
import { validatePassword } from '@/lib/passwordValidation';

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

    // Email must be student email format or admin email
    const studentEmailPattern = /^[0-9]{13}@student\.tdmu\.edu\.vn$/;
    const isAdminEmail = email.toLowerCase() === 'admin@tdmu.edu.vn' || 
                        email.toLowerCase() === 'admin.clb@tdmu.edu.vn';
    
    if (!isAdminEmail && !studentEmailPattern.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Email không đúng định dạng' },
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

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, message: passwordValidation.error },
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
      $or: [{ email: email.toLowerCase() }, { studentId }]
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
    const userData: any = {
      studentId,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'STUDENT', // Default role for registration (all students are STUDENT)
      isClubMember: false
    };
    
    // Only set optional fields if they have values
    if (phone && phone.trim()) {
      userData.phone = phone.trim();
    }
    if (className && className.trim()) {
      userData.class = className.trim();
    }
    // Handle faculty - if "Khác" is selected, the actual faculty name should be in the request body
    // The frontend sends otherFaculty when "Khác" is selected
    if (faculty && faculty.trim()) {
      userData.faculty = faculty.trim();
    }
    
    const newUser = new User(userData);

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
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
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
          { success: false, message: friendlyMessage },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { success: false, message: 'Dữ liệu không hợp lệ' },
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
        { success: false, message: `${fieldName} đã tồn tại trong hệ thống` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi server. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
