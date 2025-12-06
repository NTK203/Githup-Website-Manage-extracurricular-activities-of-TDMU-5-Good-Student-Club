import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import Activity from '@/models/Activity';
import ContactRequest from '@/models/ContactRequest';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const currentUserPayload = await getUserFromRequest(request);
    if (!currentUserPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY'];
    if (!allowedRoles.includes(currentUserPayload.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    // Get total club members (all roles except STUDENT - STUDENT is not a club member)
    const totalMembers = await User.countDocuments({ 
      role: { $ne: 'STUDENT' } 
    });

    // Get previous month total for comparison
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalMembersLastMonth = await User.countDocuments({
      role: { $ne: 'STUDENT' },
      createdAt: { $lt: thisMonth }
    });
    
    const membersChange = totalMembersLastMonth > 0 
      ? ((totalMembers - totalMembersLastMonth) / totalMembersLastMonth * 100).toFixed(0)
      : '0';
    const membersChangeType = parseFloat(membersChange) >= 0 ? 'increase' : 'decrease';

    // Get ongoing activities based on current date and activity dates (matching ActivityDashboardLayout logic exactly)
    // Get all activities (matching frontend - it fetches all activities and filters client-side)
    const allActivities = await Activity.find({});
    
    let ongoingCount = 0;
    for (const activity of allActivities) {
      try {
        let isOngoing = false;
        
        // Handle multiple days activities (exact match with frontend)
        if (activity.type === 'multiple_days' && activity.startDate && activity.endDate) {
          const startDate = new Date(activity.startDate);
          const endDate = new Date(activity.endDate);
          // Set end date to end of day (matching frontend logic exactly)
          endDate.setHours(23, 59, 59, 999);
          
          if (now.getTime() >= startDate.getTime() && now.getTime() <= endDate.getTime()) {
            isOngoing = true;
          }
        } 
        // Handle single day activities (exact match with frontend)
        else if (activity.date) {
          const activityDate = new Date(activity.date);
          const activityDateOnly = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
          const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          // Only check if same day (matching frontend logic)
          if (activityDateOnly.getTime() === todayOnly.getTime()) {
            const activeSlots = (activity.timeSlots || []).filter((s: any) => s.isActive);
            
            // Must have active time slots to be ongoing (matching frontend)
            if (activeSlots.length > 0) {
              let startTime: Date | null = null;
              let endTime: Date | null = null;
              
              activeSlots.forEach((slot: any) => {
                const [sh, sm] = (slot.startTime || '00:00').split(':').map((v: string) => parseInt(v, 10));
                const [eh, em] = (slot.endTime || '00:00').split(':').map((v: string) => parseInt(v, 10));
                const s = new Date(activityDate);
                s.setHours(sh || 0, sm || 0, 0, 0);
                const e = new Date(activityDate);
                e.setHours(eh || 0, em || 0, 0, 0);
                
                if (startTime == null) {
                  startTime = s;
                } else if (s.getTime() < startTime.getTime()) {
                  startTime = s;
                }
                if (endTime == null) {
                  endTime = e;
                } else if (e.getTime() > endTime.getTime()) {
                  endTime = e;
                }
              });
              
              if (startTime !== null && endTime !== null) {
                const nowMs = now.getTime();
                const startMs = startTime.getTime();
                const endMs = endTime.getTime();
                
                // Check if current time is within the time slot range (matching frontend exactly)
                if (nowMs >= startMs && nowMs <= endMs) {
                  isOngoing = true;
                }
              }
            }
            // If same day but no active time slots, it's not ongoing (frontend returns 'upcoming')
          }
        }
        
        if (isOngoing) {
          ongoingCount++;
        }
      } catch (error) {
        // Skip activities with invalid data
        console.error('Error processing activity:', activity._id, error);
        continue;
      }
    }
    
    // Debug log (remove in production)
    // console.log('Ongoing activities count:', ongoingCount, 'out of', allActivities.length);

    // Get total published activities for comparison
    const totalPublishedActivities = await Activity.countDocuments({ status: 'published' });
    
    const ongoingChange = ongoingCount;
    const ongoingChangeType = 'increase';

    // Calculate participation statistics across all activities
    let totalMaxParticipants = 0;
    let totalCurrentParticipants = 0;
    let totalAttendanceRate = 0;
    let activitiesWithAttendance = 0;

    // Get all activities with participants
    const activitiesWithData = await Activity.find({}).select('maxParticipants participants').lean();
    
    for (const activity of activitiesWithData) {
      const maxParticipants = activity.maxParticipants || 0;
      const currentParticipants = activity.participants?.length || 0;
      
      totalMaxParticipants += maxParticipants;
      totalCurrentParticipants += currentParticipants;
      
      // Try to get attendance rate for this activity
      try {
        const Attendance = (await import('@/models/Attendance')).default;
        const attendanceDoc = await Attendance.findOne({ activityId: activity._id });
        
        if (attendanceDoc && attendanceDoc.attendances && attendanceDoc.attendances.length > 0) {
          const approvedAttendances = attendanceDoc.attendances.filter((a: any) => a.status === 'approved');
          const uniqueUsers = new Set(approvedAttendances.map((a: any) => a.userId?.toString()));
          const checkedInCount = uniqueUsers.size;
          
          if (currentParticipants > 0) {
            const rate = Math.round((checkedInCount / currentParticipants) * 100);
            totalAttendanceRate += rate;
            activitiesWithAttendance++;
          }
        }
      } catch (error) {
        // Skip if attendance data not available
        console.error('Error fetching attendance for activity:', activity._id, error);
      }
    }

    // Calculate average attendance rate
    const averageAttendanceRate = activitiesWithAttendance > 0 
      ? Math.round(totalAttendanceRate / activitiesWithAttendance) 
      : 0;

    // Calculate participation percentage
    const participationPercentage = totalMaxParticipants > 0
      ? Math.round((totalCurrentParticipants / totalMaxParticipants) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalStudents: {
          value: totalMembers.toLocaleString('vi-VN'),
          change: `${membersChangeType === 'increase' ? '+' : ''}${membersChange}%`,
          changeType: membersChangeType
        },
        ongoingActivities: {
          value: ongoingCount.toString(),
          change: '',
          changeType: 'increase'
        },
        totalActivities: {
          value: totalPublishedActivities.toString(),
          change: '',
          changeType: 'increase'
        },
        totalMembers: {
          value: totalMembers.toString(),
          change: `${membersChangeType === 'increase' ? '+' : ''}${membersChange}%`,
          changeType: membersChangeType
        },
        participationStats: {
          totalMaxParticipants: totalMaxParticipants,
          totalCurrentParticipants: totalCurrentParticipants,
          participationPercentage: participationPercentage,
          averageAttendanceRate: averageAttendanceRate
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}











