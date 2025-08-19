import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Membership from '@/models/Membership';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'No token provided' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Connect to database
    await dbConnect();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const role = searchParams.getAll('role');
    const faculty = searchParams.get('faculty');

    // Build query
    let query: any = { status: 'ACTIVE' };

    // Add search filter
    if (search) {
      query['$or'] = [
        { 'userId.name': { $regex: search, $options: 'i' } },
        { 'userId.studentId': { $regex: search, $options: 'i' } },
        { 'userId.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Add role filter
    if (role.length > 0) {
      query['userId.role'] = { $in: role };
    }

    // Add faculty filter
    if (faculty && faculty !== 'ALL') {
      query['userId.faculty'] = faculty;
    }

    // Fetch memberships with populated user data
    const memberships = await Membership.find(query)
      .populate('userId', 'name studentId email role phone class faculty avatarUrl')
      .populate('approvedBy', 'name studentId')
      .sort({ joinedAt: -1 })
      .lean();

    // Prepare data for Excel
    const excelData = memberships.map((membership: any) => ({
      'MSSV': membership.userId?.studentId || 'N/A',
      'Họ và Tên': membership.userId?.name || 'N/A',
      'Email': membership.userId?.email || 'N/A',
      'Vai trò': membership.userId?.role === 'ADMIN' ? 'Admin' : 
                 membership.userId?.role === 'OFFICER' ? 'Ban Chấp Hành' : 'Thành Viên CLB',
      'Số điện thoại': membership.userId?.phone || 'N/A',
      'Lớp': membership.userId?.class || 'N/A',
      'Khoa/Viện': membership.userId?.faculty || 'N/A',
      'Ngày tham gia': new Date(membership.joinedAt).toLocaleDateString('vi-VN'),
      'Ngày duyệt': membership.approvedAt ? new Date(membership.approvedAt).toLocaleDateString('vi-VN') : 'N/A',
      'Người duyệt': membership.approvedBy ? `${membership.approvedBy.name} (${membership.approvedBy.studentId})` : 'N/A',
      'Lý do tham gia': membership.motivation || 'N/A',
      'Kinh nghiệm': membership.experience || 'N/A',
      'Mong đợi': membership.expectations || 'N/A',
      'Cam kết': membership.commitment || 'N/A',
      'Trạng thái': 'Đã duyệt'
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // MSSV
      { wch: 25 }, // Họ và Tên
      { wch: 30 }, // Email
      { wch: 15 }, // Vai trò
      { wch: 15 }, // Số điện thoại
      { wch: 15 }, // Lớp
      { wch: 40 }, // Khoa/Viện
      { wch: 15 }, // Ngày tham gia
      { wch: 15 }, // Ngày duyệt
      { wch: 25 }, // Người duyệt
      { wch: 30 }, // Lý do tham gia
      { wch: 30 }, // Kinh nghiệm
      { wch: 30 }, // Mong đợi
      { wch: 30 }, // Cam kết
      { wch: 15 }  // Trạng thái
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Thành viên CLB');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="members_export_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });

  } catch (error: any) {
    console.error('Error exporting memberships:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
