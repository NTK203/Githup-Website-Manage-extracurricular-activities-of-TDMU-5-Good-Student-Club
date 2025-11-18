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
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    
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
    
    // Filter by date range
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        filter.date.$gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filter.date.$lte = toDate;
      }
    }
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Get activities with pagination
    const activities = await Activity.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('responsiblePerson', 'name email avatarUrl')
      .populate('createdBy', 'name email avatarUrl')
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
    
    // Validate required fields based on activity type
    const missingFields: string[] = [];
    if (!body.name) missingFields.push('name');
    if (!body.description) missingFields.push('description');
    if (!body.responsiblePerson) missingFields.push('responsiblePerson');
    
    // For single day activities, date is required
    // For multiple days activities, startDate and endDate are required
    if (body.type === 'multiple_days') {
      if (!body.startDate) missingFields.push('startDate');
      if (!body.endDate) missingFields.push('endDate');
      if (!body.schedule || !Array.isArray(body.schedule) || body.schedule.length === 0) {
        missingFields.push('schedule');
      }
      // Don't set date for multiple_days - it's optional
      // Only set if explicitly provided
    } else {
      if (!body.date) missingFields.push('date');
    }
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required fields',
          details: missingFields
        },
        { status: 400 }
      );
    }
    
    // Convert date strings to Date objects if needed
    const activityData: any = {
      ...body,
      createdBy: new mongoose.Types.ObjectId(user.userId),
      updatedBy: new mongoose.Types.ObjectId(user.userId),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Convert date strings to Date objects
    if (activityData.date && typeof activityData.date === 'string') {
      activityData.date = new Date(activityData.date);
    }
    if (activityData.startDate && typeof activityData.startDate === 'string') {
      activityData.startDate = new Date(activityData.startDate);
    }
    if (activityData.endDate && typeof activityData.endDate === 'string') {
      activityData.endDate = new Date(activityData.endDate);
    }
    if (activityData.schedule && Array.isArray(activityData.schedule)) {
      activityData.schedule = activityData.schedule.map((item: any) => ({
        ...item,
        date: item.date instanceof Date ? item.date : new Date(item.date)
      }));
    }
    
    // For multiple_days, don't set date field (it's optional and may cause validation issues)
    if (activityData.type === 'multiple_days') {
      // Only keep date if it was explicitly provided, otherwise remove it
      if (!body.date) {
        delete activityData.date;
      }
    }
    
    // Create new activity with user info
    const activity = new Activity(activityData);
    
    let savedActivity;
    try {
      savedActivity = await activity.save();
    } catch (saveError: any) {
      // Handle validation errors
      if (saveError.name === 'ValidationError') {
        const validationErrors = Object.values(saveError.errors || {}).map((err: any) => err.message);
        return NextResponse.json(
          { 
            success: false, 
            message: 'Validation failed',
            details: validationErrors
          },
          { status: 400 }
        );
      }
      
      throw saveError;
    }
    
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
