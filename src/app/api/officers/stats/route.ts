import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import Activity from '@/models/Activity';
import Membership from '@/models/Membership';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const currentUserPayload = await getUserFromRequest(request);
    if (!currentUserPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and SUPER_ADMIN can view officer statistics
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(currentUserPayload.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    // Get all officers (CLUB_LEADER, CLUB_DEPUTY, CLUB_MEMBER)
    const officers = await User.find({
      role: { $in: ['CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'] }
    }).lean();

    // Get CLUB_STUDENT (Thành viên CLB)
    const clubStudents = await User.countDocuments({
      role: 'CLUB_STUDENT'
    });

    // Get STUDENT (Sinh viên không thuộc CLB)
    const students = await User.countDocuments({
      role: 'STUDENT'
    });

    // Calculate statistics by role
    const byRole = {
      CLUB_LEADER: officers.filter(o => o.role === 'CLUB_LEADER').length,
      CLUB_DEPUTY: officers.filter(o => o.role === 'CLUB_DEPUTY').length,
      CLUB_MEMBER: officers.filter(o => o.role === 'CLUB_MEMBER').length,
      CLUB_STUDENT: clubStudents,
      STUDENT: students,
    };

    // Get total officers
    const totalOfficers = officers.length;

    // Get officers with active membership
    const officersWithMembership = await User.aggregate([
      {
        $match: {
          role: { $in: ['CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'] }
        }
      },
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
      {
        $match: {
          membership: { $ne: [] }
        }
      },
      {
        $count: 'total'
      }
    ]);

    const activeOfficers = officersWithMembership.length > 0 ? officersWithMembership[0].total : 0;

    // Get officers by faculty
    const facultyMap = new Map<string, number>();
    officers.forEach((officer: any) => {
      if (officer.faculty) {
        facultyMap.set(officer.faculty, (facultyMap.get(officer.faculty) || 0) + 1);
      }
    });

    const byFaculty = Array.from(facultyMap.entries())
      .map(([facultyName, count]) => ({ facultyName, count }))
      .sort((a, b) => b.count - a.count);

    // Get officers by class
    const classMap = new Map<string, number>();
    officers.forEach((officer: any) => {
      if (officer.class) {
        classMap.set(officer.class, (classMap.get(officer.class) || 0) + 1);
      }
    });

    const byClass = Array.from(classMap.entries())
      .map(([className, count]) => ({ className, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 classes

    // Get activities created by officers
    const activitiesByOfficer = await Activity.aggregate([
      {
        $group: {
          _id: '$responsiblePerson',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'officer'
        }
      },
      {
        $unwind: {
          path: '$officer',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          'officer.role': { $in: ['CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'] }
        }
      },
      {
        $project: {
          officerId: '$_id',
          officerName: '$officer.name',
          officerRole: '$officer.role',
          activitiesCount: '$count'
        }
      },
      {
        $sort: { activitiesCount: -1 }
      },
      {
        $limit: 10 // Top 10 officers by activity count
      }
    ]);

    // Get total activities created by officers
    const totalActivitiesByOfficers = await Activity.countDocuments({
      responsiblePerson: { $in: officers.map(o => o._id) }
    });

    // Get activities by status created by officers
    const activitiesByStatus = await Activity.aggregate([
      {
        $match: {
          responsiblePerson: { $in: officers.map(o => o._id) }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const byActivityStatus = {
      draft: activitiesByStatus.find((s: any) => s._id === 'draft')?.count || 0,
      published: activitiesByStatus.find((s: any) => s._id === 'published')?.count || 0,
      ongoing: activitiesByStatus.find((s: any) => s._id === 'ongoing')?.count || 0,
      completed: activitiesByStatus.find((s: any) => s._id === 'completed')?.count || 0,
      cancelled: activitiesByStatus.find((s: any) => s._id === 'cancelled')?.count || 0,
      postponed: activitiesByStatus.find((s: any) => s._id === 'postponed')?.count || 0,
    };

    // Get officers by month (when they joined - based on createdAt)
    const monthMap = new Map<string, number>();
    officers.forEach((officer: any) => {
      if (officer.createdAt) {
        const date = new Date(officer.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
      }
    });

    const byMonth = Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months

    // Get officers with most activities
    const topOfficersByActivities = activitiesByOfficer.map((item: any) => ({
      officerId: item.officerId.toString(),
      officerName: item.officerName,
      officerRole: item.officerRole,
      activitiesCount: item.activitiesCount
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalOfficers,
        activeOfficers,
        byRole,
        byFaculty,
        byClass,
        totalActivitiesByOfficers,
        byActivityStatus,
        byMonth,
        topOfficersByActivities
      }
    });

  } catch (error: any) {
    console.error('Error fetching officer stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


