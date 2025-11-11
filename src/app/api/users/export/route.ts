import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const currentUserPayload = await getUserFromRequest(request);
    if (!currentUserPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or club leader
    if (currentUserPayload.role !== 'ADMIN' && currentUserPayload.role !== 'SUPER_ADMIN' && currentUserPayload.role !== 'CLUB_LEADER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    // Get query parameters (same as users API)
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const roles = searchParams.getAll('role');
    const faculty = searchParams.get('faculty') || '';
    const isClubMember = searchParams.get('isClubMember') || '';
    const clubMembers = searchParams.get('clubMembers') || '';
    const nonClubMembers = searchParams.get('nonClubMembers') || '';

    // Build filter conditions
    const filter: any = {
      // No need to filter by isDeleted since we're doing hard delete now
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

    // Build aggregation pipeline (same as users API)
    const pipeline: any[] = [
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
      
      // Apply club members filter (includes Admin, Club Leaders, and Student members)
      ...(clubMembers === 'true' ? [{
        $match: {
          $or: [
            { role: { $in: ['SUPER_ADMIN', 'ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'] } },
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
      
      // Sort by name
      { $sort: { name: 1 } }
    ];

    // Get all users (no pagination for export)
    const users = await User.aggregate(pipeline);

    // Transform data for Excel export
    const excelData = users.map((user, index) => ({
      'STT': index + 1,
      'Họ và tên': user.name,
      'MSSV': user.studentId,
      'Email': user.email,
      'Số điện thoại': user.phone || '',
      'Lớp': user.class || '',
      'Khoa/Viện': user.faculty || '',
             'Vai trò': user.role === 'SUPER_ADMIN' ? 'Quản Trị Hệ Thống' : 
                  user.role === 'ADMIN' ? 'Admin' : 
                  user.role === 'CLUB_LEADER' ? 'Chủ Nhiệm CLB' : 
                  user.role === 'CLUB_DEPUTY' ? 'Phó Chủ Nhiệm' : 
                  user.role === 'CLUB_MEMBER' ? 'Ủy Viên BCH' : 
                  user.role === 'CLUB_STUDENT' ? 'Thành Viên CLB' : 'Sinh Viên',
       'Thành viên CLB': user.role === 'SUPER_ADMIN' ? 'Quản Trị Hệ Thống' : 
                        user.role === 'ADMIN' ? 'Admin' : 
                        user.role === 'CLUB_LEADER' ? 'Chủ Nhiệm CLB' : 
                        user.role === 'CLUB_DEPUTY' ? 'Phó Chủ Nhiệm' : 
                        user.role === 'CLUB_MEMBER' ? 'Ủy Viên BCH' : 
                        user.role === 'CLUB_STUDENT' ? 'Thành Viên CLB' : (user.isClubMember ? 'Có' : 'Không'),
      'Ngày tạo': new Date(user.createdAt).toLocaleDateString('vi-VN'),
      'Ngày cập nhật': new Date(user.updatedAt).toLocaleDateString('vi-VN')
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 5 },   // STT
      { wch: 25 },  // Họ và tên
      { wch: 15 },  // MSSV
      { wch: 30 },  // Email
      { wch: 15 },  // Số điện thoại
      { wch: 15 },  // Lớp
      { wch: 40 },  // Khoa/Viện
      { wch: 15 },  // Vai trò
      { wch: 15 },  // Thành viên CLB
      { wch: 12 },  // Ngày tạo
      { wch: 12 }   // Ngày cập nhật
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách Users');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Create response with Excel file
    const response = new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });

    return response;

  } catch (error: any) {
    console.error('Error exporting users:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}



