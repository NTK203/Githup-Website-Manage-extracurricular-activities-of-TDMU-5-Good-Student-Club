import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import Membership from '@/models/Membership';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const role = searchParams.get('role') || '';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build filter conditions
    const filter: any = {
      isClubMember: true // Only get club members
    };

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter (we'll add a status field to User model later)
    // For now, we'll consider all users as ACTIVE
    if (status && status !== 'ALL') {
      // This will be implemented when we add status field to User model
      // filter.status = status;
    }

    // Role filter
    if (role && role !== 'ALL') {
      filter.role = role;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get total count for pagination
    const totalCount = await User.countDocuments(filter);

    // Get users with pagination
    const users = await User.find(filter)
      .select('-passwordHash') // Exclude password hash
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform users to include additional fields for the frontend
    const members = users.map(user => ({
      _id: user._id,
      studentId: user.studentId,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      class: user.class || '',
      faculty: user.faculty || '',
      avatarUrl: user.avatarUrl,
      status: 'ACTIVE', // Default status for now
      joinDate: user.createdAt,
      totalActivities: 0, // Will be calculated from activities collection later
      totalPoints: 0, // Will be calculated from activities collection later
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: {
        members,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNextPage: page * limit < totalCount,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members', details: error.message },
      { status: 500 }
    );
  }
}

// POST method to add new member
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    const body = await request.json();
    const { studentId, name, email, password, role, phone, class: className, faculty } = body;

    // Validate required fields
    if (!studentId || !name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields', details: 'Vui lòng điền đầy đủ thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // Validate studentId format
    if (!studentId.startsWith('admin') && !/^\d{13}$/.test(studentId)) {
      return NextResponse.json(
        { error: 'Invalid student ID format', details: 'Mã số sinh viên phải có 13 chữ số hoặc bắt đầu bằng "admin"' },
        { status: 400 }
      );
    }

    // Validate email format
    if (email !== 'admin@tdmu.edu.vn' && email !== 'admin.clb@tdmu.edu.vn' && !/^[0-9]{13}@student\.tdmu\.edu\.vn$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format', details: 'Email phải có định dạng: mã số sinh viên 13 chữ số@student.tdmu.edu.vn' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ studentId }, { email }]
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this student ID or email already exists' },
        { status: 409 }
      );
    }

    // Create new user
    const newUser = new User({
      studentId,
      name,
      email,
      passwordHash: password, // Will be hashed by pre-save middleware
      role,
      phone: phone || undefined,
      class: className || undefined,
      faculty: faculty || undefined,
      isClubMember: true // Set isClubMember to true for new members
    });

    await newUser.save();

    // Create membership record for the new club member
    const newMembership = new Membership({
      userId: newUser._id,
      studentId: newUser.studentId,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone || '',
      class: newUser.class || '',
      faculty: newUser.faculty || '',
      status: 'ACTIVE', // Directly active since admin is adding them
      approvedAt: new Date(),
      approvedBy: user.userId, // The admin who added the member
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newMembership.save();

    // Return user data without password
    const userResponse = {
      _id: newUser._id,
      studentId: newUser.studentId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phone: newUser.phone,
      class: newUser.class,
      faculty: newUser.faculty,
      avatarUrl: newUser.avatarUrl,
      status: 'ACTIVE',
      joinDate: newUser.createdAt,
      totalActivities: 0,
      totalPoints: 0,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };

    return NextResponse.json({
      success: true,
      message: 'Thành viên đã được thêm thành công và tự động kích hoạt trong câu lạc bộ',
      data: userResponse
    });

  } catch (error: any) {
    console.error('Error adding member:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === 'studentId' ? 'Mã số sinh viên' : field === 'email' ? 'Email' : field;
      return NextResponse.json(
        { error: 'Duplicate entry', details: `${fieldName} đã tồn tại trong hệ thống` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add member', details: error.message },
      { status: 500 }
    );
  }
}
