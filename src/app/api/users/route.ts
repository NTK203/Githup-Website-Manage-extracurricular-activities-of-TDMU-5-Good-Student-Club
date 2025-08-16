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
    const roles = searchParams.getAll('role'); // Get all role parameters
    const faculty = searchParams.get('faculty') || '';
    const isClubMember = searchParams.get('isClubMember') || '';
    const clubMembers = searchParams.get('clubMembers') || '';
    const nonClubMembers = searchParams.get('nonClubMembers') || '';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build filter conditions
    const filter: any = {
      isDeleted: { $ne: true } // Only get non-deleted users
    };

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Role filter
    if (roles.length > 0) {
      filter.role = { $in: roles };
    }

    // Faculty filter
    if (faculty && faculty !== 'ALL') {
      filter.faculty = faculty;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Build aggregation pipeline
    const pipeline: any[] = [
      // Match stage for filtering (search and role only)
      { $match: filter },
      
      // Lookup memberships to determine if user is a club member
      {
        $lookup: {
          from: 'memberships',
          localField: '_id',
          foreignField: 'userId',
          pipeline: [
            {
              $match: {
                status: 'ACTIVE'
              }
            }
          ],
          as: 'membership'
        }
      },
      
      // Add isClubMember field based on membership existence
      {
        $addFields: {
          isClubMember: { $gt: [{ $size: '$membership' }, 0] }
        }
      },
      
      // Apply club membership filter if specified
      ...(isClubMember && isClubMember !== 'ALL' ? [{
        $match: {
          isClubMember: isClubMember === 'true'
        }
      }] : []),
      
      // Apply club members filter (includes Admin, Officer, and Student members)
      ...(clubMembers === 'true' ? [{
        $match: {
          $or: [
            { role: { $in: ['ADMIN', 'OFFICER'] } },
            { isClubMember: true }
          ]
        }
      }] : []),
      
      // Apply non-club members filter (only students who are not members)
      ...(nonClubMembers === 'true' ? [{
        $match: {
          role: 'STUDENT',
          isClubMember: false
        }
      }] : []),
      
      // Project stage to exclude password and membership array
      {
        $project: {
          passwordHash: 0,
          membership: 0
        }
      },
      
      // Sort stage
      { $sort: sort }
    ];

    // Get total count for pagination
    const totalCountPipeline = [
      ...pipeline.slice(0, -1), // Remove sort stage for counting
      { $count: 'total' }
    ];
    
    const totalCountResult = await User.aggregate(totalCountPipeline);
    const totalCount = totalCountResult.length > 0 ? totalCountResult[0].total : 0;

    // Get users with pagination
    const users = await User.aggregate([
      ...pipeline,
      { $skip: skip },
      { $limit: limit }
    ]);

    // Debug logging
    console.log('Query params:', { search, roles, faculty, isClubMember, clubMembers, nonClubMembers, sortBy, sortOrder, page, limit });
    console.log('Filter:', filter);
    console.log('Pipeline stages:', pipeline.length);
    console.log('Users found:', users.length);
    if (users.length > 0) {
      console.log('Sample user:', {
        _id: users[0]._id,
        name: users[0].name,
        isClubMember: users[0].isClubMember,
        membershipCount: users[0].membership ? users[0].membership.length : 0
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        users,
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
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    );
  }
}

// POST method to add new user
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
        { error: 'Missing required fields' },
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
      phone,
      class: className,
      faculty
    });

    await newUser.save();

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
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };

    return NextResponse.json({
      success: true,
      message: 'User added successfully',
      data: userResponse
    });

  } catch (error: any) {
    console.error('Error adding user:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add user', details: error.message },
      { status: 500 }
    );
  }
}
