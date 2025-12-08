import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Activity from '@/models/Activity';
import Attendance from '@/models/Attendance';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const currentUserPayload = await getUserFromRequest(request);
    if (!currentUserPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Only officers can view their own reports
    const allowedRoles = ['CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'];
    if (!allowedRoles.includes(currentUserPayload.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const officerId = new mongoose.Types.ObjectId(currentUserPayload.userId);

    // Get date range from query params
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calculate date filter based on dateRange
    let dateFilter: any = {};
    const now = new Date();
    
    if (dateRange === 'custom' && startDate && endDate) {
      // Custom date range - filter by activity date (date or startDate)
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      // Filter activities where activity date falls within the range
      // For single_day: check activity.date
      // For multiple_days: check activity.startDate or activity.endDate overlaps with range
      dateFilter.$or = [
        // Single day activities within range
        {
          type: 'single_day',
          date: { $gte: start, $lte: end }
        },
        // Multiple days activities that overlap with range
        {
          type: 'multiple_days',
          $or: [
            { startDate: { $lte: end }, endDate: { $gte: start } }, // Overlaps
            { startDate: { $gte: start, $lte: end } }, // Starts in range
            { endDate: { $gte: start, $lte: end } } // Ends in range
          ]
        }
      ];
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      // Filter by activity date
      dateFilter.$or = [
        { date: { $gte: weekAgo } },
        { startDate: { $gte: weekAgo } }
      ];
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      monthAgo.setHours(0, 0, 0, 0);
      dateFilter.$or = [
        { date: { $gte: monthAgo } },
        { startDate: { $gte: monthAgo } }
      ];
    } else if (dateRange === 'quarter') {
      const quarterAgo = new Date(now);
      quarterAgo.setMonth(now.getMonth() - 3);
      quarterAgo.setHours(0, 0, 0, 0);
      dateFilter.$or = [
        { date: { $gte: quarterAgo } },
        { startDate: { $gte: quarterAgo } }
      ];
    } else if (dateRange === 'year') {
      const yearAgo = new Date(now);
      yearAgo.setFullYear(now.getFullYear() - 1);
      yearAgo.setHours(0, 0, 0, 0);
      dateFilter.$or = [
        { date: { $gte: yearAgo } },
        { startDate: { $gte: yearAgo } }
      ];
    }
    // 'all' doesn't add any date filter

    // Get all activities this officer is responsible for, filtered by date range
    const activities = await Activity.find({
      responsiblePerson: officerId,
      ...dateFilter
    })
    .populate('participants.userId', 'name email studentId avatarUrl')
    .sort({ createdAt: -1 })
    .lean();

    // Calculate statistics by status
    const byStatus = {
      draft: activities.filter((a: any) => a.status === 'draft').length,
      published: activities.filter((a: any) => a.status === 'published').length,
      ongoing: activities.filter((a: any) => a.status === 'ongoing').length,
      completed: activities.filter((a: any) => a.status === 'completed').length,
      cancelled: activities.filter((a: any) => a.status === 'cancelled').length,
      postponed: activities.filter((a: any) => a.status === 'postponed').length,
    };

    // Get total activities
    const totalActivities = activities.length;

    // Get total participants across all activities
    const totalParticipants = activities.reduce((sum: number, activity: any) => {
      return sum + (activity.participants?.length || 0);
    }, 0);

    // Get approved participants
    const approvedParticipants = activities.reduce((sum: number, activity: any) => {
      if (!activity.participants) return sum;
      return sum + activity.participants.filter((p: any) => p.approvalStatus === 'approved').length;
    }, 0);

    // Get pending participants
    const pendingParticipants = activities.reduce((sum: number, activity: any) => {
      if (!activity.participants) return sum;
      return sum + activity.participants.filter((p: any) => p.approvalStatus === 'pending').length;
    }, 0);

    // Get rejected participants
    const rejectedParticipants = activities.reduce((sum: number, activity: any) => {
      if (!activity.participants) return sum;
      return sum + activity.participants.filter((p: any) => p.approvalStatus === 'rejected').length;
    }, 0);

    // Get activities by type
    const byType = {
      single_day: activities.filter((a: any) => a.type === 'single_day').length,
      multiple_days: activities.filter((a: any) => a.type === 'multiple_days').length,
    };

    // Get activities by month
    const monthMap = new Map<string, number>();
    activities.forEach((activity: any) => {
      if (activity.createdAt) {
        const date = new Date(activity.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
      }
    });

    const byMonth = Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months

    // Get detailed activities with participant statistics and attendance data
    const activitiesWithDetails = await Promise.all(activities.map(async (activity: any) => {
      const participants = activity.participants || [];
      const approved = participants.filter((p: any) => p.approvalStatus === 'approved').length;
      const pending = participants.filter((p: any) => p.approvalStatus === 'pending').length;
      const rejected = participants.filter((p: any) => p.approvalStatus === 'rejected').length;
      const removed = participants.filter((p: any) => p.approvalStatus === 'removed').length;
      
      // Calculate registration rate
      const totalRegistered = participants.length;
      const maxParticipants = activity.maxParticipants || null;
      const registrationRate = maxParticipants && maxParticipants > 0 
        ? Math.round((totalRegistered / maxParticipants) * 100) 
        : null;
      
      // Calculate approval rate (approved / total registered)
      const approvalRate = totalRegistered > 0 
        ? Math.round((approved / totalRegistered) * 100) 
        : 0;
      
      // Calculate detailed attendance statistics
      const approvedParticipants = participants.filter((p: any) => p.approvalStatus === 'approved');
      
      // Get attendance documents for this activity
      const attendanceDocs = await Attendance.find({ 
        activityId: new mongoose.Types.ObjectId(activity._id) 
      }).lean();
      
      // Calculate total expected sessions for completion rate
      let totalExpectedSessions = 0;
      if (activity.type === 'single_day' && activity.timeSlots) {
        // Count active time slots
        totalExpectedSessions = activity.timeSlots.filter((slot: any) => slot.isActive !== false).length;
      } else if (activity.type === 'multiple_days') {
        // For multiple days, count based on registeredDaySlots of participants
        // Each participant may have different registeredDaySlots
        // We'll use the maximum number of unique day-slot combinations
        const uniqueDaySlots = new Set<string>();
        participants.forEach((p: any) => {
          if (p.registeredDaySlots && Array.isArray(p.registeredDaySlots)) {
            p.registeredDaySlots.forEach((ds: any) => {
              const key = `${ds.day}-${ds.slot}`;
              uniqueDaySlots.add(key);
            });
          }
        });
        totalExpectedSessions = uniqueDaySlots.size > 0 
          ? uniqueDaySlots.size 
          : (activity.schedule?.length || 0); // Fallback to schedule length
      }
      
      // Determine activity start time for attendance comparison
      let activityStartTime: Date | null = null;
      if (activity.type === 'single_day' && activity.date) {
        activityStartTime = new Date(activity.date);
        // If there are time slots, use the earliest start time
        if (activity.timeSlots && activity.timeSlots.length > 0) {
          const earliestSlot = activity.timeSlots
            .filter((slot: any) => slot.isActive !== false)
            .sort((a: any, b: any) => {
              const timeA = a.startTime.split(':').map(Number);
              const timeB = b.startTime.split(':').map(Number);
              return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
            })[0];
          
          if (earliestSlot && earliestSlot.startTime) {
            const [hours, minutes] = earliestSlot.startTime.split(':').map(Number);
            activityStartTime = new Date(activity.date);
            activityStartTime.setHours(hours, minutes, 0, 0);
          }
        }
      } else if (activity.type === 'multiple_days' && activity.startDate) {
        activityStartTime = new Date(activity.startDate);
        if (activity.schedule && activity.schedule.length > 0) {
          const firstDay = activity.schedule[0];
          if (firstDay.date) {
            activityStartTime = new Date(firstDay.date);
            activityStartTime.setHours(8, 0, 0, 0); // Default to 8 AM
          }
        }
      }
      
      // Calculate attendance breakdown
      let onTime = 0;
      let late = 0;
      let absent = 0;
      
      approvedParticipants.forEach((p: any) => {
        if (p.checkedIn === true && p.checkedInAt) {
          const checkInTime = new Date(p.checkedInAt);
          if (activityStartTime) {
            // Allow 15 minutes grace period for "on time"
            const gracePeriod = 15 * 60 * 1000; // 15 minutes in milliseconds
            const lateThreshold = new Date(activityStartTime.getTime() + gracePeriod);
            
            if (checkInTime <= lateThreshold) {
              onTime++;
            } else {
              late++;
            }
          } else {
            // If no start time available, consider all check-ins as on time
            onTime++;
          }
        } else {
          absent++;
        }
      });
      
      const checkedIn = onTime + late;
      const attendanceRate = approved > 0 ? Math.round((checkedIn / approved) * 100) : 0;
      const onTimeRate = approved > 0 ? Math.round((onTime / approved) * 100) : 0;
      const lateRate = approved > 0 ? Math.round((late / approved) * 100) : 0;
      const absentRate = approved > 0 ? Math.round((absent / approved) * 100) : 0;
      
      // Get participant details with detailed attendance records
      const participantDetailsWithAttendance = {
        approved: await Promise.all(participants
          .filter((p: any) => p.approvalStatus === 'approved')
          .map(async (p: any) => {
            const userId = p.userId?._id?.toString() || p.userId?.toString();
            // Find attendance document for this user
            const userAttendanceDoc = attendanceDocs.find((doc: any) => 
              doc.userId?.toString() === userId
            );
            
            // Get all attendance records for this user
            const attendanceRecords = userAttendanceDoc?.attendances || [];
            
            // Calculate completion rate for this participant
            const approvedRecords = attendanceRecords.filter((r: any) => r.status === 'approved');
            const completionRate = totalExpectedSessions > 0 
              ? Math.round((approvedRecords.length / totalExpectedSessions) * 100) 
              : (approvedRecords.length > 0 ? 100 : 0);
            
            return {
              userId,
            name: p.userId?.name || p.name || 'Không xác định',
            email: p.userId?.email || p.email,
            studentId: p.userId?.studentId || p.studentId,
            avatarUrl: p.userId?.avatarUrl || p.avatarUrl,
            checkedIn: p.checkedIn || false,
              checkedInAt: p.checkedInAt || null,
              registeredDaySlots: p.registeredDaySlots || [],
              attendanceRecords: attendanceRecords.map((r: any) => ({
                _id: r._id?.toString(),
                timeSlot: r.timeSlot,
                checkInType: r.checkInType,
                checkInTime: r.checkInTime,
                location: r.location,
                photoUrl: r.photoUrl,
                status: r.status,
                verifiedByName: r.verifiedByName,
                verifiedByEmail: r.verifiedByEmail,
                verifiedAt: r.verifiedAt,
                verificationNote: r.verificationNote,
                cancelReason: r.cancelReason,
                lateReason: r.lateReason,
                dayNumber: r.dayNumber,
                slotDate: r.slotDate
              })),
              completionRate,
              totalSessionsAttended: approvedRecords.length,
              totalExpectedSessions
            };
          })),
        pending: participants
          .filter((p: any) => p.approvalStatus === 'pending')
          .map((p: any) => ({
            userId: p.userId?._id?.toString() || p.userId?.toString(),
            name: p.userId?.name || p.name || 'Không xác định',
            email: p.userId?.email || p.email,
            studentId: p.userId?.studentId || p.studentId,
            avatarUrl: p.userId?.avatarUrl || p.avatarUrl,
            registeredDaySlots: p.registeredDaySlots || []
          })),
        rejected: participants
          .filter((p: any) => p.approvalStatus === 'rejected')
          .map((p: any) => ({
            userId: p.userId?._id?.toString() || p.userId?.toString(),
            name: p.userId?.name || p.name || 'Không xác định',
            email: p.userId?.email || p.email,
            studentId: p.userId?.studentId || p.studentId,
            avatarUrl: p.userId?.avatarUrl || p.avatarUrl
          })),
        removed: participants
          .filter((p: any) => p.approvalStatus === 'removed')
          .map((p: any) => ({
            userId: p.userId?._id?.toString() || p.userId?.toString(),
            name: p.userId?.name || p.name || 'Không xác định',
            email: p.userId?.email || p.email,
            studentId: p.userId?.studentId || p.studentId,
            avatarUrl: p.userId?.avatarUrl || p.avatarUrl
          }))
      };

      return {
        activityId: activity._id.toString(),
        activityName: activity.name,
        activityDescription: activity.description,
        activityDate: activity.date || activity.startDate,
        activityEndDate: activity.endDate,
        activityType: activity.type,
        activityStatus: activity.status,
        activityLocation: activity.location,
        maxParticipants: activity.maxParticipants || null,
        registrationThreshold: activity.registrationThreshold || null,
        createdAt: activity.createdAt,
        // Include schedule and timeSlots for export
        timeSlots: activity.timeSlots || [],
        schedule: activity.schedule || [],
        totalExpectedSessions,
        participantsCount: participants.length,
        participantsByStatus: {
          approved,
          pending,
          rejected,
          removed
        },
        registration: {
          totalRegistered,
          maxParticipants,
          registrationRate
        },
        approval: {
          approved,
          approvalRate
        },
        attendance: {
          checkedIn,
          attendanceRate,
          onTime,
          onTimeRate,
          late,
          lateRate,
          absent,
          absentRate,
          notCheckedIn: approved - checkedIn
        },
        participantDetails: participantDetailsWithAttendance
      };
    }));

    // Get top activities by participant count
    const topActivitiesByParticipants = activitiesWithDetails
      .sort((a, b) => b.participantsCount - a.participantsCount)
      .slice(0, 10);

    // Calculate average participants per activity
    const averageParticipants = totalActivities > 0 
      ? Math.round((totalParticipants / totalActivities) * 10) / 10 
      : 0;

    // Calculate approval rate
    const approvalRate = totalParticipants > 0
      ? Math.round((approvedParticipants / totalParticipants) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        dateRange,
        totalActivities,
        totalParticipants,
        approvedParticipants,
        pendingParticipants,
        rejectedParticipants,
        averageParticipants,
        approvalRate,
        byStatus,
        byType,
        byMonth,
        topActivitiesByParticipants,
        activitiesWithDetails // Chi tiết từng hoạt động
      }
    });

  } catch (error: any) {
    console.error('Error fetching officer reports:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

