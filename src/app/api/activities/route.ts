import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Activity from '@/models/Activity';
import { getUserFromRequest } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    
    // Build filter object
    const filter: any = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Get activities with pagination
    const activities = await Activity.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('responsiblePerson', 'name email')
      .populate('createdBy', 'name email')
      .lean();
    
    // Get total count for pagination
    const total = await Activity.countDocuments(filter);
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return NextResponse.json({
      success: true,
      data: {
        activities,
        pagination: {
          currentPage: page,
          totalPages,
          total,
          limit,
          hasNextPage,
          hasPrevPage
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // Get user from token
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Unauthorized',
          details: ['Token không hợp lệ hoặc đã hết hạn']
        },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    console.log('Received activity data:', body);
    
    // Validate required fields
    if (!body.name || !body.description || !body.date || !body.responsiblePerson) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required fields',
          details: ['name', 'description', 'date', 'responsiblePerson'].filter(field => !body[field])
        },
        { status: 400 }
      );
    }
    
    // Create new activity with user info
    const activity = new Activity({
      ...body,
      createdBy: new mongoose.Types.ObjectId(user.userId),
      updatedBy: new mongoose.Types.ObjectId(user.userId),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const savedActivity = await activity.save();
    console.log('Activity created successfully:', savedActivity);
    
    // Send notification to all club members about new activity
    try {
      const Notification = (await import('@/models/Notification')).default;
      const Membership = (await import('@/models/Membership')).default;
      
      // Get all active club members
      const activeMemberships = await Membership.find({ status: 'ACTIVE' }).select('userId');
      const memberUserIds = activeMemberships.map(m => m.userId);
      
      if (memberUserIds.length > 0) {
        await Notification.createForUsers(
          memberUserIds,
          {
            title: 'Hoạt động mới',
            message: `Hoạt động "${body.name}" đã được tạo. Hãy kiểm tra và đăng ký tham gia!`,
            type: 'info',
            relatedType: 'activity',
            relatedId: savedActivity._id,
            createdBy: user.userId
          }
        );
      }
    } catch (notificationError) {
      console.error('Error sending notification for new activity:', notificationError);
      // Don't fail the request if notification fails
    }
    
    return NextResponse.json({
      success: true,
      message: 'Activity created successfully',
      data: savedActivity
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating activity:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map((err: any) => err.message);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation failed',
          details: validationErrors
        },
        { status: 400 }
      );
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Duplicate activity found',
          details: ['An activity with this name already exists']
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        details: ['Failed to create activity']
      },
      { status: 500 }
    );
  }
}
