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

    // Get total students (users with role STUDENT)
    const totalStudents = await User.countDocuments({ role: 'STUDENT' });

    // Get previous month total for comparison
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalStudentsLastMonth = await User.countDocuments({
      role: 'STUDENT',
      createdAt: { $lt: thisMonth }
    });
    
    const studentsChange = totalStudentsLastMonth > 0 
      ? ((totalStudents - totalStudentsLastMonth) / totalStudentsLastMonth * 100).toFixed(0)
      : '0';
    const studentsChangeType = parseFloat(studentsChange) >= 0 ? 'increase' : 'decrease';

    // Get ongoing activities (status = 'ongoing' or based on date/time)
    const nowDate = new Date();
    const ongoingActivities = await Activity.countDocuments({
      status: 'ongoing'
    });

    // Get ongoing activities from last month for comparison
    const ongoingActivitiesLastMonth = await Activity.countDocuments({
      status: 'ongoing',
      createdAt: { $lt: thisMonth }
    });
    
    const ongoingChange = ongoingActivities - ongoingActivitiesLastMonth;
    const ongoingChangeType = ongoingChange >= 0 ? 'increase' : 'decrease';

    // Calculate average score (placeholder - would need actual scoring system)
    // For now, using a calculation based on completed activities
    const completedActivities = await Activity.countDocuments({ status: 'completed' });
    const totalActivities = await Activity.countDocuments({});
    const averageScore = totalActivities > 0 
      ? ((completedActivities / totalActivities) * 10).toFixed(1)
      : '0.0';
    
    // Get average score from last month (simplified)
    const averageScoreLastMonth = '8.2'; // Placeholder
    const scoreChange = (parseFloat(averageScore) - parseFloat(averageScoreLastMonth)).toFixed(1);
    const scoreChangeType = parseFloat(scoreChange) >= 0 ? 'increase' : 'decrease';

    // Get pending reports (contact requests with status PENDING)
    const pendingReports = await ContactRequest.countDocuments({ status: 'PENDING' });
    
    // Get pending reports from last month
    const pendingReportsLastMonth = await ContactRequest.countDocuments({
      status: 'PENDING',
      createdAt: { $lt: thisMonth }
    });
    
    const reportsChange = pendingReportsLastMonth - pendingReports;
    const reportsChangeType = reportsChange >= 0 ? 'decrease' : 'increase';

    return NextResponse.json({
      success: true,
      data: {
        totalStudents: {
          value: totalStudents.toLocaleString('vi-VN'),
          change: `${studentsChangeType === 'increase' ? '+' : ''}${studentsChange}%`,
          changeType: studentsChangeType
        },
        ongoingActivities: {
          value: ongoingActivities.toString(),
          change: `${ongoingChangeType === 'increase' ? '+' : ''}${ongoingChange}`,
          changeType: ongoingChangeType
        },
        averageScore: {
          value: averageScore,
          change: `${scoreChangeType === 'increase' ? '+' : ''}${scoreChange}`,
          changeType: scoreChangeType
        },
        pendingReports: {
          value: pendingReports.toString(),
          change: `${reportsChangeType === 'increase' ? '+' : ''}${Math.abs(reportsChange)}`,
          changeType: reportsChangeType
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











