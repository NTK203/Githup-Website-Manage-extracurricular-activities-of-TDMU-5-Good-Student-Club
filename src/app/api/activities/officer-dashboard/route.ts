import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Activity from '@/models/Activity';
import { getUserFromRequest } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Get user from request
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission to view officer dashboard
    // CLUB_DEPUTY, OFFICER, and CLUB_MEMBER have access
    const allowedRoles = ['CLUB_DEPUTY', 'OFFICER', 'CLUB_MEMBER'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || 'all';
    
    // Build filter object
    const filter: any = {};
    
    // Only show activities they are responsible for (CLUB_DEPUTY, OFFICER, and CLUB_MEMBER)
    try {
      // Convert userId to ObjectId - MongoDB will match it with ObjectId field
      if (!mongoose.Types.ObjectId.isValid(user.userId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid user ID format' },
          { status: 400 }
        );
      }
      
      const userIdObjectId = new mongoose.Types.ObjectId(user.userId);
      filter.responsiblePerson = userIdObjectId;
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format', error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      );
    }
    
    // Add status filter if not 'all' - merge with existing filter
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Get activities with pagination
    // Make sure query executes correctly - filter is applied before populate
    let activities;
    let totalActivities;
    let totalPages;
    
    try {
      activities = await Activity.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('responsiblePerson', 'name email')
        .populate('createdBy', 'name email')
        .lean();
      
      // Get total count for pagination
      totalActivities = await Activity.countDocuments(filter);
      totalPages = Math.ceil(totalActivities / limit);
    } catch (queryError) {
      // Fallback: try without populate first
      activities = await Activity.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      totalActivities = await Activity.countDocuments(filter);
      totalPages = Math.ceil(totalActivities / limit);
      
      // Manually populate if needed
      if (activities.length > 0) {
        const User = (await import('@/models/User')).default;
        activities = await Promise.all(activities.map(async (activity: any) => {
          if (activity.responsiblePerson) {
            const responsiblePerson = await User.findById(activity.responsiblePerson).select('name email').lean();
            activity.responsiblePerson = responsiblePerson;
          }
          if (activity.createdBy) {
            const createdBy = await User.findById(activity.createdBy).select('name email').lean();
            activity.createdBy = createdBy;
          }
          return activity;
        }));
      }
    }

    // Calculate officer statistics
    const stats = await calculateOfficerStats(user.userId, user.role);
    
    // Format activities for frontend
    const formattedActivities = activities.map(activity => ({
      _id: activity._id,
      name: activity.name,
      description: activity.description,
      date: activity.date,
      timeSlots: activity.timeSlots,
      location: activity.location,
      detailedLocation: activity.detailedLocation,
      maxParticipants: activity.maxParticipants,
      visibility: activity.visibility,
      responsiblePerson: activity.responsiblePerson,
      status: activity.status,
      type: activity.type,
      imageUrl: activity.imageUrl,
      overview: activity.overview,
      participants: activity.participants || [],
      createdBy: activity.createdBy,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: {
        activities: formattedActivities,
        stats: stats,
        pagination: {
          total: totalActivities,
          totalPages: totalPages,
          currentPage: page,
          limit: limit
        }
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// Calculate officer statistics
async function calculateOfficerStats(userId: string, userRole: string) {
  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Build base filter - only show activities they are responsible for
    const baseFilter: any = {
      responsiblePerson: userObjectId
    };
    
    // Total activities managed by this officer
    const totalActivities = await Activity.countDocuments(baseFilter);
    
    // Activities by status
    const activitiesByStatus = await Activity.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Total participants across all activities
    const totalParticipants = await Activity.aggregate([
      { $match: baseFilter },
      { $unwind: '$participants' },
      { $count: 'total' }
    ]);
    
    // Activities this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const activitiesThisMonth = await Activity.countDocuments({
      ...baseFilter,
      createdAt: { $gte: thisMonth }
    });
    
    // Format status counts
    const statusCounts = {
      draft: 0,
      published: 0,
      ongoing: 0,
      completed: 0,
      cancelled: 0,
      postponed: 0
    };
    
    activitiesByStatus.forEach(item => {
      if (statusCounts.hasOwnProperty(item._id)) {
        statusCounts[item._id as keyof typeof statusCounts] = item.count;
      }
    });
    
    return {
      totalActivities,
      totalParticipants: totalParticipants[0]?.total || 0,
      activitiesThisMonth,
      statusCounts,
      // Additional stats for dashboard
      activeActivities: statusCounts.ongoing,
      completedActivities: statusCounts.completed,
      pendingReports: 0 // Placeholder - would need separate reports collection
    };
    
  } catch (error) {
    return {
      totalActivities: 0,
      totalParticipants: 0,
      activitiesThisMonth: 0,
      statusCounts: {
        draft: 0,
        published: 0,
        ongoing: 0,
        completed: 0,
        cancelled: 0,
        postponed: 0
      },
      activeActivities: 0,
      completedActivities: 0,
      pendingReports: 0
    };
  }
}
