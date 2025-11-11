import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import Membership from '@/models/Membership';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const currentUserPayload = await getUserFromRequest(request);
    if (!currentUserPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Current user role for /api/users/stats:', currentUserPayload.role);

    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'CLUB_LEADER', 'CLUB_STUDENT'];
    if (!allowedRoles.includes(currentUserPayload.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    // Base pipeline to calculate isClubMember
    const basePipeline = [
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
        $addFields: {
          isClubMember: { $gt: [{ $size: '$membership' }, 0] }
        }
      }
    ];

    // Get total users count
    const totalUsersResult = await User.aggregate([
      ...basePipeline,
      { $count: 'total' }
    ]);
    const totalUsers = totalUsersResult.length > 0 ? totalUsersResult[0].total : 0;

    // Get total club members (Admin + Club Leaders + Students with isClubMember = true)
    const totalClubMembersResult = await User.aggregate([
      ...basePipeline,
      {
        $match: {
          $or: [
            { role: { $in: ['SUPER_ADMIN', 'ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'] } },
            { isClubMember: true }
          ]
        }
      },
      { $count: 'total' }
    ]);
    const totalClubMembers = totalClubMembersResult.length > 0 ? totalClubMembersResult[0].total : 0;

    // Get total non-club members (only students with isClubMember = false)
    const totalNonClubMembersResult = await User.aggregate([
      ...basePipeline,
      {
        $match: {
          role: 'STUDENT',
          isClubMember: false
        }
      },
      { $count: 'total' }
    ]);
    const totalNonClubMembers = totalNonClubMembersResult.length > 0 ? totalNonClubMembersResult[0].total : 0;

    // Get total management staff (Admin + Club Leaders)
    const totalManagementStaffResult = await User.aggregate([
      ...basePipeline,
      {
        $match: {
          role: { $in: ['SUPER_ADMIN', 'ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'] }
        }
      },
      { $count: 'total' }
    ]);
    const totalManagementStaff = totalManagementStaffResult.length > 0 ? totalManagementStaffResult[0].total : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalClubMembers,
        totalNonClubMembers,
        totalManagementStaff
      }
    });

  } catch (error: any) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
