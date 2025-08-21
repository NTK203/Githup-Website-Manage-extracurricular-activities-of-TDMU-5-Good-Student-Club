import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Membership from '@/models/Membership';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';

// GET /api/memberships - Get all memberships with filtering
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(request);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'OFFICER')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const role = searchParams.get('role') || '';
    const faculty = searchParams.get('faculty') || '';
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'joinedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build filter conditions
    const filter: Record<string, unknown> = {};

    // Status filter
    if (status && status !== 'ALL') {
      filter.status = status;
    }

    // Search filter (search in user name, studentId, email)
    if (search) {
      // We need to populate user data to search in user fields
      // This will be handled in the aggregation pipeline
    }

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    
    // Handle sorting for user fields
    if (sortBy === 'name') {
      sort['user.name'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'studentId') {
      sort['user.studentId'] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // Use aggregation to join with user data and apply search
    const pipeline: any[] = [
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      }
    ];

    // Add status filter to include/exclude removed memberships
    if (status && status !== 'ALL') {
      pipeline.push({
        $match: { status }
      });
    } else {
      // Default: exclude REMOVED memberships unless specifically requested
      pipeline.push({
        $match: {
          status: { $ne: 'REMOVED' }
        }
      });
    }

    // Add search filter if provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.name': { $regex: search, $options: 'i' } },
            { 'user.studentId': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Add role filter
    if (role && role !== 'ALL') {
      pipeline.push({
        $match: { 'user.role': role }
      });
    }

    // Add faculty filter
    if (faculty && faculty !== 'ALL') {
      pipeline.push({
        $match: { 'user.faculty': faculty }
      });
    }

    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Membership.aggregate(countPipeline);
    const totalCount = countResult.length > 0 ? countResult[0].total : 0;

    // Add sorting and pagination
    pipeline.push(
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'approvedBy',
          foreignField: '_id',
          as: 'approver'
        }
      },
      {
        $unwind: {
          path: '$approver',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'rejectedBy',
          foreignField: '_id',
          as: 'rejecter'
        }
      },
      {
        $unwind: {
          path: '$rejecter',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'removedBy._id',
          foreignField: '_id',
          as: 'remover'
        }
      },
      {
        $unwind: {
          path: '$remover',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          status: 1,
          joinedAt: 1,
          approvedAt: 1,
          rejectedAt: 1,
          rejectionReason: 1,
          motivation: 1,
          experience: 1,
          expectations: 1,
          commitment: 1,
          createdAt: 1,
          updatedAt: 1,
          userId: {
            _id: '$user._id',
            studentId: '$user.studentId',
            name: '$user.name',
            email: '$user.email',
            role: '$user.role',
            phone: '$user.phone',
            class: '$user.class',
            faculty: '$user.faculty',
            avatarUrl: '$user.avatarUrl'
          },
          approvedBy: {
            _id: '$approver._id',
            name: '$approver.name',
            studentId: '$approver.studentId'
          },
          rejectedBy: {
            _id: '$rejecter._id',
            name: '$rejecter.name',
            studentId: '$rejecter.studentId'
          },
          removedBy: {
            _id: '$remover._id',
            name: '$remover.name',
            studentId: '$remover.studentId'
          },
          removedAt: 1,
          removalReason: 1
        }
      }
    );

    const memberships = await Membership.aggregate(pipeline);
    
    console.log('API - Status filter:', status);
    console.log('API - Memberships count:', memberships.length);
    console.log('API - First membership:', memberships[0]);

    return NextResponse.json({
      success: true,
      data: {
        memberships,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNextPage: page * limit < totalCount,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching memberships:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch memberships', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/memberships - Create new membership application
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    const body = await request.json();
    const { userId, motivation, experience, expectations, commitment } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user already has an active membership
    const existingActiveMembership = await Membership.findOne({
      userId,
      status: 'ACTIVE'
    });

    if (existingActiveMembership) {
      return NextResponse.json(
        { error: 'User already has an active membership' },
        { status: 409 }
      );
    }

    // Check if user has a pending membership
    const existingPendingMembership = await Membership.findOne({
      userId,
      status: 'PENDING'
    });

    if (existingPendingMembership) {
      return NextResponse.json(
        { error: 'User already has a pending membership application' },
        { status: 409 }
      );
    }

    // Create new membership
    const newMembership = new Membership({
      userId,
      status: 'PENDING',
      joinedAt: new Date(),
      motivation,
      experience,
      expectations,
      commitment
    });

    await newMembership.save();

    // Populate user data for response
    await newMembership.populate('userId');

    return NextResponse.json({
      success: true,
      message: 'Membership application created successfully',
      data: newMembership
    });

  } catch (error: unknown) {
    console.error('Error creating membership:', error);

    // Handle validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      const validationErrors = Object.values((error as any).errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      );
    }

    // Handle duplicate key error
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        { error: 'Membership already exists for this user' },
        { status: 409 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create membership', details: errorMessage },
      { status: 500 }
    );
  }
}

// PATCH /api/memberships - Update membership status (approve/reject)
export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(request);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'OFFICER')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    const body = await request.json();
    const { membershipId, action, rejectionReason } = body;

    // Validate required fields
    if (!membershipId || !action) {
      return NextResponse.json(
        { error: 'Membership ID and action are required' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required when rejecting membership' },
        { status: 400 }
      );
    }

    // Find membership
    const membership = await Membership.findById(membershipId);
    if (!membership) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      );
    }

    // Check if membership is in valid status for action
    if (action === 'approve') {
      // Can approve PENDING or REJECTED memberships
      if (membership.status !== 'PENDING' && membership.status !== 'REJECTED') {
        return NextResponse.json(
          { error: 'Can only approve pending or rejected memberships' },
          { status: 400 }
        );
      }
    } else if (action === 'reject') {
      // Can only reject PENDING memberships
      if (membership.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Can only reject pending memberships' },
          { status: 400 }
        );
      }
    }

    // Update membership based on action
    if (action === 'approve') {
      await membership.approve(user.userId);
    } else if (action === 'reject') {
      await membership.reject(rejectionReason);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Populate user data for response
    await membership.populate(['userId', 'approvedBy']);

    return NextResponse.json({
      success: true,
      message: `Membership ${action}ed successfully`,
      data: membership
    });

  } catch (error: unknown) {
    console.error('Error updating membership:', error);

    // Handle validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      const validationErrors = Object.values((error as any).errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update membership', details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/memberships - Delete membership (for students to cancel their application)
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const membershipId = searchParams.get('id');

    if (!membershipId) {
      return NextResponse.json(
        { error: 'Membership ID is required' },
        { status: 400 }
      );
    }

    const membership = await Membership.findById(membershipId);
    if (!membership) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      );
    }

    // Only allow students to delete their own membership applications
    // Admins and officers can delete any membership
    if (user.role === 'STUDENT' && membership.userId.toString() !== user.userId) {
      return NextResponse.json(
        { error: 'You can only delete your own membership application' },
        { status: 403 }
      );
    }

    // Only allow deletion of PENDING applications
    if (membership.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending applications can be deleted' },
        { status: 400 }
      );
    }

    await Membership.findByIdAndDelete(membershipId);

    return NextResponse.json({
      success: true,
      message: 'Membership application deleted successfully'
    });

  } catch (error: unknown) {
    console.error('Error deleting membership:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete membership', details: errorMessage },
      { status: 500 }
    );
  }
}
