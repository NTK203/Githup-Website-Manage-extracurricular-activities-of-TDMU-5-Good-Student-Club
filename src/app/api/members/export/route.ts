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
    if (!decoded || !['SUPER_ADMIN', 'CLUB_LEADER'].includes(decoded.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Connect to database
    await dbConnect();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const role = searchParams.getAll('role');
    const faculty = searchParams.get('faculty');
    const includeRemoved = searchParams.get('includeRemoved') === 'true';

    // Build query for active members
    let activeQuery: any = { status: 'ACTIVE' };
    let removedQuery: any = { status: 'REMOVED' };

    // Add search filter
    if (search) {
      const searchFilter = [
        { 'userId.name': { $regex: search, $options: 'i' } },
        { 'userId.studentId': { $regex: search, $options: 'i' } },
        { 'userId.email': { $regex: search, $options: 'i' } }
      ];
      activeQuery['$or'] = searchFilter;
      removedQuery['$or'] = searchFilter;
    }

    // Add role filter
    if (role.length > 0) {
      activeQuery['userId.role'] = { $in: role };
      removedQuery['userId.role'] = { $in: role };
    }

    // Add faculty filter
    if (faculty && faculty !== 'ALL') {
      activeQuery['userId.faculty'] = faculty;
      removedQuery['userId.faculty'] = faculty;
    }

    // Fetch active memberships
    const activeMemberships = await Membership.find(activeQuery)
      .populate('userId', 'name studentId email role phone class faculty avatarUrl')
      .populate('approvedBy', 'name studentId')
      .sort({ joinedAt: -1 })
      .lean();

    // Fetch removed memberships (if requested)
    let removedMemberships: any[] = [];
    if (includeRemoved) {
      removedMemberships = await Membership.find(removedQuery)
        .populate('userId', 'name studentId email role phone class faculty avatarUrl')
        .populate('removedBy', 'name studentId')
        .populate('restoredBy', 'name studentId')
        .sort({ removedAt: -1 })
        .lean();
    }

    // Prepare data for active members Excel
    const activeExcelData = activeMemberships.map((membership: any) => ({
      'MSSV': membership.userId?.studentId || 'N/A',
      'Họ và Tên': membership.userId?.name || 'N/A',
      'Email': membership.userId?.email || 'N/A',
      'Vai trò': membership.userId?.role === 'SUPER_ADMIN' ? 'Quản Trị Hệ Thống' :
                 membership.userId?.role === 'CLUB_LEADER' ? 'Chủ Nhiệm CLB' :
                 membership.userId?.role === 'CLUB_DEPUTY' ? 'Phó Chủ Nhiệm' :
                 membership.userId?.role === 'CLUB_MEMBER' ? 'Ủy Viên BCH' :
                 membership.userId?.role === 'CLUB_STUDENT' ? 'Thành Viên CLB' :
                 membership.userId?.role === 'STUDENT' ? 'Sinh Viên' : 'Không xác định',
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

    // Prepare data for removed members Excel
    const removedExcelData = removedMemberships.map((membership: any) => ({
      'MSSV': membership.userId?.studentId || 'N/A',
      'Họ và Tên': membership.userId?.name || 'N/A',
      'Email': membership.userId?.email || 'N/A',
      'Vai trò': membership.userId?.role === 'SUPER_ADMIN' ? 'Quản Trị Hệ Thống' :
                 membership.userId?.role === 'CLUB_LEADER' ? 'Chủ Nhiệm CLB' :
                 membership.userId?.role === 'CLUB_DEPUTY' ? 'Phó Chủ Nhiệm' :
                 membership.userId?.role === 'CLUB_MEMBER' ? 'Ủy Viên BCH' :
                 membership.userId?.role === 'CLUB_STUDENT' ? 'Thành Viên CLB' :
                 membership.userId?.role === 'STUDENT' ? 'Sinh Viên' : 'Không xác định',
      'Số điện thoại': membership.userId?.phone || 'N/A',
      'Lớp': membership.userId?.class || 'N/A',
      'Khoa/Viện': membership.userId?.faculty || 'N/A',
      'Ngày tham gia': new Date(membership.joinedAt).toLocaleDateString('vi-VN'),
      'Ngày bị xóa': membership.removedAt ? new Date(membership.removedAt).toLocaleDateString('vi-VN') : 'N/A',
      'Người xóa': membership.removedBy ? `${membership.removedBy.name} (${membership.removedBy.studentId})` : 'N/A',
      'Lý do xóa': membership.removalReasonTrue || membership.removalReason || 'N/A',
      'Ngày duyệt lại': membership.restoredAt ? new Date(membership.restoredAt).toLocaleDateString('vi-VN') : 'N/A',
      'Người duyệt lại': membership.restoredBy ? `${membership.restoredBy.name} (${membership.restoredBy.studentId})` : 'N/A',
      'Lý do duyệt lại': membership.restorationReason || 'N/A',
      'Số lần duyệt lại': membership.removalHistory ? membership.removalHistory.filter((h: any) => h.restoredAt).length : 0,
      'Trạng thái': 'Đã bị xóa'
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Logic: Nếu includeRemoved = true (đang xem thành viên đã bị xóa)
    // thì chỉ xuất sheet thành viên đã bị xóa
    // Nếu includeRemoved = false (đang xem thành viên đang hoạt động)
    // thì chỉ xuất sheet thành viên đang hoạt động

    if (includeRemoved) {
      // Đang xem thành viên đã bị xóa - chỉ xuất sheet thành viên đã bị xóa
      if (removedExcelData.length > 0) {
        const removedWorksheet = XLSX.utils.json_to_sheet(removedExcelData);

        // Set column widths for removed members
        const removedColumnWidths = [
          { wch: 15 }, // MSSV
          { wch: 25 }, // Họ và Tên
          { wch: 30 }, // Email
          { wch: 20 }, // Vai trò
          { wch: 15 }, // Số điện thoại
          { wch: 15 }, // Lớp
          { wch: 40 }, // Khoa/Viện
          { wch: 15 }, // Ngày tham gia
          { wch: 15 }, // Ngày bị xóa
          { wch: 25 }, // Người xóa
          { wch: 30 }, // Lý do xóa
          { wch: 15 }, // Ngày duyệt lại
          { wch: 25 }, // Người duyệt lại
          { wch: 30 }, // Lý do duyệt lại
          { wch: 15 }, // Số lần duyệt lại
          { wch: 15 }  // Trạng thái
        ];
        removedWorksheet['!cols'] = removedColumnWidths;

        // Add removed members worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, removedWorksheet, 'Thành viên đã bị xóa');
      }
    } else {
      // Đang xem thành viên đang hoạt động - chỉ xuất sheet thành viên đang hoạt động
      if (activeExcelData.length > 0) {
        const activeWorksheet = XLSX.utils.json_to_sheet(activeExcelData);

        // Set column widths for active members
        const activeColumnWidths = [
          { wch: 15 }, // MSSV
          { wch: 25 }, // Họ và Tên
          { wch: 30 }, // Email
          { wch: 20 }, // Vai trò
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
        activeWorksheet['!cols'] = activeColumnWidths;

        // Add active members worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, activeWorksheet, 'Thành viên đang hoạt động');
      }
    }

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return Excel file with appropriate filename
    const filename = includeRemoved 
      ? `removed_members_export_${new Date().toISOString().split('T')[0]}.xlsx`
      : `active_members_export_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
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
