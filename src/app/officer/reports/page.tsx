'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import OfficerNav from '@/components/officer/OfficerNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import ExcelJS from 'exceljs';
import {
  BarChart3,
  Activity,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Download,
  Calendar,
  Target,
  Award,
  Eye,
  X,
  Copy,
  Check,
  FileText,
  PieChart,
  LineChart,
  AlertCircle,
  PlayCircle,
  CheckSquare,
  Ban,
  CalendarDays,
  UserCheck,
  UserX,
  UserCog,
  MapPin,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Info,
  Trash2
} from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ActivityDetail {
  activityId: string;
  activityName: string;
  activityDescription?: string;
  activityDate?: string;
  activityEndDate?: string;
  activityType: string;
  activityStatus: string;
  activityLocation?: string;
  maxParticipants?: number | null;
  registrationThreshold?: number | null;
  createdAt: string;
  participantsCount: number;
  participantsByStatus: {
    approved: number;
    pending: number;
    rejected: number;
    removed: number;
  };
  registration: {
    totalRegistered: number;
    maxParticipants: number | null;
    registrationRate: number | null;
  };
  approval: {
    approved: number;
    approvalRate: number;
  };
  attendance: {
    checkedIn: number;
    attendanceRate: number;
    onTime: number;
    onTimeRate: number;
    late: number;
    lateRate: number;
    absent: number;
    absentRate: number;
    notCheckedIn: number;
  };
  participantDetails: {
    approved: Array<{
      userId: string;
      name: string;
      email?: string;
      studentId?: string;
      avatarUrl?: string;
      checkedIn?: boolean;
      checkedInAt?: string | null;
    }>;
    pending: Array<{
      userId: string;
      name: string;
      email?: string;
      studentId?: string;
      avatarUrl?: string;
    }>;
    rejected: Array<{
      userId: string;
      name: string;
      email?: string;
      studentId?: string;
      avatarUrl?: string;
    }>;
    removed?: Array<{
      userId: string;
      name: string;
      email?: string;
      studentId?: string;
      avatarUrl?: string;
    }>;
  };
}

interface OfficerReportStats {
  dateRange?: string;
  totalActivities: number;
  totalParticipants: number;
  approvedParticipants: number;
  pendingParticipants: number;
  rejectedParticipants: number;
  averageParticipants: number;
  approvalRate: number;
  byStatus: {
    draft: number;
    published: number;
    ongoing: number;
    completed: number;
    cancelled: number;
    postponed: number;
  };
  byType: {
    single_day: number;
    multiple_days: number;
  };
  byMonth: Array<{
    month: string;
    count: number;
  }>;
  topActivitiesByParticipants: Array<ActivityDetail>;
  activitiesWithDetails?: Array<ActivityDetail>;
}

export default function OfficerReportsPage() {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportStats, setReportStats] = useState<OfficerReportStats | null>(null);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [dateError, setDateError] = useState<string>('');
  const [maxActivityDate, setMaxActivityDate] = useState<string>(''); // Ngày xa nhất của hoạt động
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'overview' | 'details'>('overview');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<{ activityId: string; x: number; y: number } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const toggleActivity = (activityId: string) => {
    setExpandedActivities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  // Helper function để sắp xếp activities theo thời gian (đảm bảo nhất quán)
  const sortActivitiesByDate = (activities: ActivityDetail[]) => {
    return [...activities].sort((a, b) => {
      const getSortDate = (activity: ActivityDetail) => {
        const dateStr = activity.activityEndDate || activity.activityDate;
        if (!dateStr) return new Date(0);
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? new Date(0) : date;
      };
      
      const dateA = getSortDate(a);
      const dateB = getSortDate(b);
      
      // Sắp xếp từ mới nhất đến cũ nhất
      return dateB.getTime() - dateA.getTime();
    });
  };

  // Validate custom date range
  const validateCustomDateRange = (): boolean => {
    if (dateRange !== 'custom') {
      setDateError('');
      return true;
    }
    
    if (!customStartDate || !customEndDate) {
      setDateError('Vui lòng chọn đầy đủ từ ngày và đến ngày');
      return false;
    }
    
    // Parse dates và đảm bảo format đúng
    const start = new Date(customStartDate + 'T00:00:00');
    const end = new Date(customEndDate + 'T23:59:59');
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // Kiểm tra date hợp lệ
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setDateError('Ngày không hợp lệ. Vui lòng chọn lại');
      return false;
    }
    
    // Kiểm tra startDate <= endDate
    if (start > end) {
      setDateError('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
      return false;
    }
    
    // Kiểm tra không được chọn ngày trong tương lai quá xa
    // Sử dụng maxActivityDate nếu có, nếu không thì giới hạn 1 năm
    const maxAllowedDate = maxActivityDate 
      ? new Date(maxActivityDate + 'T23:59:59')
      : (() => {
          const oneYearFromNow = new Date();
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
          oneYearFromNow.setHours(23, 59, 59, 999);
          return oneYearFromNow;
        })();
    
    if (start > maxAllowedDate || end > maxAllowedDate) {
      const maxDateStr = maxAllowedDate.toLocaleDateString('vi-VN');
      setDateError(`Không thể chọn ngày quá ${maxDateStr} (dựa trên các hoạt động thực tế)`);
      return false;
    }
    
    // Kiểm tra khoảng thời gian không quá dài (không quá 5 năm)
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const maxDays = 365 * 5; // 5 năm
    
    if (diffDays > maxDays) {
      setDateError('Khoảng thời gian không được vượt quá 5 năm');
      return false;
    }
    
    // Kiểm tra khoảng thời gian tối thiểu (ít nhất 1 ngày)
    if (diffDays < 1) {
      setDateError('Khoảng thời gian phải ít nhất 1 ngày');
      return false;
    }
    
    setDateError('');
    return true;
  };

  // Fetch officer report stats
  const fetchReportStats = async () => {
    try {
      // Validate trước khi fetch
      if (!validateCustomDateRange()) {
        return;
      }
      
      const token = localStorage.getItem('token');
      let url = `/api/officers/reports?dateRange=${dateRange}`;
      
      // Nếu là custom date range, thêm startDate và endDate
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        // Đảm bảo format đúng (YYYY-MM-DD) - input type="date" đã trả về format này
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReportStats(data.data);
          
          // Tính toán ngày xa nhất từ các hoạt động để giới hạn date picker
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const oneYearFromNow = new Date();
          oneYearFromNow.setFullYear(today.getFullYear() + 1);
          oneYearFromNow.setHours(23, 59, 59, 999);
          
          let finalMaxDate: Date = oneYearFromNow; // Default: 1 năm từ hôm nay
          
          if (data.data.activitiesWithDetails && data.data.activitiesWithDetails.length > 0) {
            let maxDateValue: number | null = null;
            
            for (const activity of data.data.activitiesWithDetails) {
              let activityEndDate: Date | null = null;
              
              if (activity.activityType === 'multiple_days' && activity.activityEndDate) {
                activityEndDate = new Date(activity.activityEndDate);
              } else if (activity.activityDate) {
                activityEndDate = new Date(activity.activityDate);
              }
              
              if (activityEndDate) {
                const endDateTime = activityEndDate.getTime();
                if (maxDateValue === null || endDateTime > maxDateValue) {
                  maxDateValue = endDateTime;
                }
              }
            }
            
            // Set max date (thêm 1 tháng buffer) nếu có hoạt động trong tương lai
            if (maxDateValue !== null) {
              const todayTime = today.getTime();
              if (maxDateValue > todayTime) {
                // Có hoạt động trong tương lai, thêm 1 tháng buffer
                const bufferedDate = new Date(maxDateValue + 30 * 24 * 60 * 60 * 1000);
                finalMaxDate = bufferedDate;
              }
            }
            
            // Giới hạn tối đa 1 năm từ hôm nay
            const oneYearTime = oneYearFromNow.getTime();
            if (finalMaxDate.getTime() > oneYearTime) {
              finalMaxDate = oneYearFromNow;
            }
          }
          
          setMaxActivityDate(finalMaxDate.toISOString().split('T')[0]);
        } else {
          setError(data.error || 'Có lỗi xảy ra khi tải dữ liệu thống kê');
        }
      } else {
        setError('Có lỗi xảy ra khi tải dữ liệu thống kê');
      }
    } catch (err) {
      console.error('Error fetching officer report stats:', err);
      setError('Có lỗi xảy ra khi tải dữ liệu thống kê');
    }
  };

  // Load stats
  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchReportStats();
      } catch (err) {
        setError('Có lỗi xảy ra khi tải dữ liệu thống kê');
        console.error('Error loading stats:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadStats();
    }
  }, [user, dateRange, customStartDate, customEndDate]);

  // Format report data for export
  const formatReportData = () => {
    if (!reportStats || !reportStats.activitiesWithDetails) return null;

    const activitiesWithDetails = reportStats.activitiesWithDetails || [];

    return {
      metadata: {
        generatedAt: new Date().toLocaleString('vi-VN'),
        generatedAtISO: new Date().toISOString(),
        dateRange,
        dateRangeLabel: getDateRangeLabel(),
        officerName: user?.name,
        officerEmail: user?.email
      },
      summary: {
        totalActivities: reportStats.totalActivities,
        totalParticipants: reportStats.totalParticipants,
        approvedParticipants: reportStats.approvedParticipants,
        pendingParticipants: reportStats.pendingParticipants,
        rejectedParticipants: reportStats.rejectedParticipants,
        averageParticipants: reportStats.averageParticipants,
        approvalRate: reportStats.approvalRate
      },
      activities: activitiesWithDetails.map((activity: any) => ({
        // Basic activity info
        activityId: activity.activityId,
        activityName: activity.activityName,
        activityDescription: activity.activityDescription,
        activityType: activity.activityType,
        activityStatus: activity.activityStatus,
        activityLocation: activity.activityLocation,
        activityDate: activity.activityDate,
        activityEndDate: activity.activityEndDate,
        createdAt: activity.createdAt,
        
        // Schedule information
        timeSlots: activity.timeSlots || [],
        schedule: activity.schedule || [],
        totalExpectedSessions: activity.totalExpectedSessions || 0,
        
        // Registration info
        maxParticipants: activity.maxParticipants,
        registrationThreshold: activity.registrationThreshold,
        participantsCount: activity.participantsCount,
        registration: activity.registration,
        approval: activity.approval,
        
        // Attendance statistics
        attendance: activity.attendance,
        
        // Detailed participant information with attendance records
        participants: {
          approved: activity.participantDetails.approved.map((p: any) => ({
            userId: p.userId,
            name: p.name,
            email: p.email,
            studentId: p.studentId,
            registeredDaySlots: p.registeredDaySlots || [],
            // Attendance records for each session
            attendanceRecords: p.attendanceRecords || [],
            // Completion statistics
            completionRate: p.completionRate || 0,
            totalSessionsAttended: p.totalSessionsAttended || 0,
            totalExpectedSessions: p.totalExpectedSessions || 0,
            checkedIn: p.checkedIn,
            checkedInAt: p.checkedInAt
          })),
          pending: activity.participantDetails.pending || [],
          rejected: activity.participantDetails.rejected || [],
          removed: activity.participantDetails.removed || []
        }
      }))
    };
  };

  // Preview export data - Show summary info
  const handlePreviewExport = () => {
    if (!reportStats || !reportStats.activitiesWithDetails) {
      alert('Không có dữ liệu để xem trước');
      return;
    }

    // Create preview text showing what will be exported
    const previewText = `BÁO CÁO THỐNG KÊ HOẠT ĐỘNG NGOẠI KHÓA
═══════════════════════════════════════════════════════

📊 TỔNG QUAN:
- Tổng số hoạt động: ${reportStats.totalActivities}
- Tổng số người tham gia: ${reportStats.totalParticipants}
- Đã duyệt: ${reportStats.approvedParticipants}
- Chờ duyệt: ${reportStats.pendingParticipants}
- Từ chối: ${reportStats.rejectedParticipants}
- Trung bình người tham gia/hoạt động: ${reportStats.averageParticipants}
- Tỷ lệ duyệt: ${reportStats.approvalRate}%
- Khoảng thời gian: ${getDateRangeLabel()}

📋 DANH SÁCH HOẠT ĐỘNG (${reportStats.activitiesWithDetails.length} hoạt động):
${reportStats.activitiesWithDetails.map((activity: any, index: number) => 
  `${index + 1}. ${activity.activityName}
   - Loại: ${activity.activityType === 'single_day' ? 'Một ngày' : 'Nhiều ngày'}
   - Người tham gia: ${activity.participantsCount} (Đã duyệt: ${activity.participantsByStatus.approved})
   - Tỷ lệ điểm danh: ${activity.attendance.attendanceRate}%
   - Tỷ lệ hoàn thành: ${activity.participantDetails?.approved?.reduce((sum: number, p: any) => sum + (p.completionRate || 0), 0) / (activity.participantDetails?.approved?.length || 1) || 0}%`
).join('\n\n')}

📄 FILE EXCEL SẼ BAO GỒM:
1. Sheet "Tổng Quan" - Thống kê tổng quan
2. Sheet "Danh Sách Hoạt Động" - Danh sách tất cả hoạt động
3. Sheet cho mỗi hoạt động - Chi tiết người tham gia và điểm danh từng buổi

💾 File sẽ được lưu dưới dạng: .xlsx`;

    setPreviewData(previewText);
    setShowPreviewModal(true);
    setCopied(false);
  };

  // Export report to Excel
  const handleExportReport = async () => {
    if (!reportStats || !reportStats.activitiesWithDetails) {
      alert('Không có dữ liệu để xuất báo cáo');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();

      // Sheet 1: Tổng Quan - Chi tiết và đẹp mắt
      const summarySheet = workbook.addWorksheet('Tổng Quan');
      
      // Set column widths
      summarySheet.getColumn(1).width = 35;
      summarySheet.getColumn(2).width = 25;
      summarySheet.getColumn(3).width = 25;
      
      // Helper function to apply border
      const applyBorder = (cell: ExcelJS.Cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };
      };
      
      // 1) HEADER - THÔNG TIN BÁO CÁO
      summarySheet.mergeCells('A1:D1');
      const headerCell = summarySheet.getCell('A1');
      headerCell.value = 'BÁO CÁO THỐNG KÊ HOẠT ĐỘNG NGOẠI KHÓA';
      headerCell.font = { size: 16, bold: true };
      headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
      headerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F4F8' }
      };
      applyBorder(headerCell);
      summarySheet.getRow(1).height = 28;
      
      // 2) THÔNG TIN NGƯỜI XUẤT
      summarySheet.getCell('A3').value = 'Người xuất báo cáo';
      summarySheet.getCell('B3').value = user?.name || 'N/A';
      summarySheet.getCell('A4').value = 'Email';
      summarySheet.getCell('B4').value = user?.email || 'N/A';
      summarySheet.getCell('A5').value = 'Khoảng thời gian';
      summarySheet.getCell('B5').value = getDateRangeLabel();
      summarySheet.getCell('A6').value = 'Ngày xuất báo cáo';
      summarySheet.getCell('B6').value = new Date().toLocaleString('vi-VN');
      
      // Style info rows
      for (let row = 3; row <= 6; row++) {
        const labelCell = summarySheet.getCell(`A${row}`);
        const valueCell = summarySheet.getCell(`B${row}`);
        labelCell.font = { size: 11 };
        valueCell.font = { size: 11 };
        labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
        valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
        applyBorder(labelCell);
        applyBorder(valueCell);
        summarySheet.getRow(row).height = 26;
      }
      
      // Empty row
      summarySheet.getRow(7).height = 10;
      
      // 3) TỔNG QUAN HOẠT ĐỘNG
      summarySheet.mergeCells('A8:D8');
      const sectionHeader1 = summarySheet.getCell('A8');
      sectionHeader1.value = 'TỔNG QUAN HOẠT ĐỘNG';
      sectionHeader1.font = { size: 12, bold: true };
      sectionHeader1.alignment = { horizontal: 'left', vertical: 'middle' };
      sectionHeader1.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' }
      };
      applyBorder(sectionHeader1);
      summarySheet.getRow(8).height = 26;
      
      let rowNum = 10;
      summarySheet.getCell(`A${rowNum}`).value = 'Tổng số hoạt động';
      summarySheet.getCell(`B${rowNum}`).value = reportStats.totalActivities;
      
      const singleDayCount = reportStats.activitiesWithDetails.filter((a: any) => a.activityType === 'single_day').length;
      const multipleDaysCount = reportStats.activitiesWithDetails.filter((a: any) => a.activityType === 'multiple_days').length;
      
      rowNum++;
      summarySheet.getCell(`A${rowNum}`).value = 'Hoạt động một ngày';
      summarySheet.getCell(`B${rowNum}`).value = singleDayCount;
      
      rowNum++;
      summarySheet.getCell(`A${rowNum}`).value = 'Hoạt động nhiều ngày';
      summarySheet.getCell(`B${rowNum}`).value = multipleDaysCount;
      
      const statusCounts: any = {};
      reportStats.activitiesWithDetails.forEach((a: any) => {
        statusCounts[a.activityStatus] = (statusCounts[a.activityStatus] || 0) + 1;
      });
      
      Object.entries(statusCounts).forEach(([status, count]) => {
        rowNum++;
        summarySheet.getCell(`A${rowNum}`).value = `Hoạt động ${status}`;
        summarySheet.getCell(`B${rowNum}`).value = count as number;
      });
      
      // Style activity overview rows
      for (let r = 10; r <= rowNum; r++) {
        const labelCell = summarySheet.getCell(`A${r}`);
        const valueCell = summarySheet.getCell(`B${r}`);
        labelCell.font = { size: 11 };
        valueCell.font = { size: 11 };
        labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
        valueCell.alignment = { horizontal: 'right', vertical: 'middle' };
        valueCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0F2FE' }
        };
        applyBorder(labelCell);
        applyBorder(valueCell);
        summarySheet.getRow(r).height = 26;
      }
      
      // Empty row
      rowNum++;
      summarySheet.getRow(rowNum).height = 10;
      
      // 4) TỔNG QUAN NGƯỜI THAM GIA
      rowNum++;
      summarySheet.mergeCells(`A${rowNum}:D${rowNum}`);
      const sectionHeader2 = summarySheet.getCell(`A${rowNum}`);
      sectionHeader2.value = 'TỔNG QUAN NGƯỜI THAM GIA';
      sectionHeader2.font = { size: 12, bold: true };
      sectionHeader2.alignment = { horizontal: 'left', vertical: 'middle' };
      sectionHeader2.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' }
      };
      applyBorder(sectionHeader2);
      summarySheet.getRow(rowNum).height = 26;
      
      rowNum++;
      summarySheet.getCell(`A${rowNum}`).value = 'Tổng số người tham gia';
      summarySheet.getCell(`B${rowNum}`).value = reportStats.totalParticipants;
      
      rowNum++;
      summarySheet.getCell(`A${rowNum}`).value = 'Đã duyệt';
      summarySheet.getCell(`B${rowNum}`).value = reportStats.approvedParticipants;
      
      rowNum++;
      summarySheet.getCell(`A${rowNum}`).value = 'Chờ duyệt';
      summarySheet.getCell(`B${rowNum}`).value = reportStats.pendingParticipants;
      
      rowNum++;
      summarySheet.getCell(`A${rowNum}`).value = 'Từ chối';
      summarySheet.getCell(`B${rowNum}`).value = reportStats.rejectedParticipants;
      
      rowNum++;
      summarySheet.getCell(`A${rowNum}`).value = 'Trung bình người tham gia/hoạt động';
      summarySheet.getCell(`B${rowNum}`).value = reportStats.averageParticipants.toFixed(1);
      
      rowNum++;
      summarySheet.getCell(`A${rowNum}`).value = 'Tỷ lệ duyệt (%)';
      summarySheet.getCell(`B${rowNum}`).value = `${reportStats.approvalRate}%`;
      
      // Style participant overview rows
      const participantStartRow = rowNum - 5;
      for (let r = participantStartRow; r <= rowNum; r++) {
        const labelCell = summarySheet.getCell(`A${r}`);
        const valueCell = summarySheet.getCell(`B${r}`);
        labelCell.font = { size: 11 };
        valueCell.font = { size: 11 };
        labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
        valueCell.alignment = { horizontal: 'right', vertical: 'middle' };
        
        const labelText = String(labelCell.value || '').toUpperCase();
        if (labelText.includes('ĐÃ DUYỆT')) {
          valueCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD1FAE5' }
          };
        } else if (labelText.includes('CHỜ DUYỆT')) {
          valueCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEF3C7' }
          };
        }
        
        applyBorder(labelCell);
        applyBorder(valueCell);
        summarySheet.getRow(r).height = 26;
      }
      
      // Empty row
      rowNum++;
      summarySheet.getRow(rowNum).height = 10;
      
      // 5) THỐNG KÊ ĐIỂM DANH TỔNG HỢP
      rowNum++;
      summarySheet.mergeCells(`A${rowNum}:D${rowNum}`);
      const sectionHeader3 = summarySheet.getCell(`A${rowNum}`);
      sectionHeader3.value = 'THỐNG KÊ ĐIỂM DANH TỔNG HỢP';
      sectionHeader3.font = { size: 12, bold: true };
      sectionHeader3.alignment = { horizontal: 'left', vertical: 'middle' };
      sectionHeader3.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' }
      };
      applyBorder(sectionHeader3);
      summarySheet.getRow(rowNum).height = 26;
      
      const totalCheckedIn = reportStats.activitiesWithDetails.reduce((sum: number, a: any) => sum + (a.attendance?.checkedIn || 0), 0);
      const totalOnTime = reportStats.activitiesWithDetails.reduce((sum: number, a: any) => sum + (a.attendance?.onTime || 0), 0);
      const totalLate = reportStats.activitiesWithDetails.reduce((sum: number, a: any) => sum + (a.attendance?.late || 0), 0);
      const totalAbsent = reportStats.activitiesWithDetails.reduce((sum: number, a: any) => sum + (a.attendance?.absent || 0), 0);
      const avgAttendanceRate = reportStats.activitiesWithDetails.length > 0
        ? (reportStats.activitiesWithDetails.reduce((sum: number, a: any) => sum + (a.attendance?.attendanceRate || 0), 0) / reportStats.activitiesWithDetails.length).toFixed(1)
        : 0;
      
      rowNum++;
      summarySheet.getCell(`A${rowNum}`).value = 'Tổng số người đã điểm danh';
      summarySheet.getCell(`B${rowNum}`).value = totalCheckedIn;
      
      rowNum++;
      summarySheet.getCell(`A${rowNum}`).value = 'Đúng giờ';
      summarySheet.getCell(`B${rowNum}`).value = totalOnTime;
      
      rowNum++;
      summarySheet.getCell(`A${rowNum}`).value = 'Trễ';
      summarySheet.getCell(`B${rowNum}`).value = totalLate;
      
      rowNum++;
      summarySheet.getCell(`A${rowNum}`).value = 'Vắng';
      summarySheet.getCell(`B${rowNum}`).value = totalAbsent;
      
      rowNum++;
      summarySheet.getCell(`A${rowNum}`).value = 'Tỷ lệ điểm danh trung bình (%)';
      summarySheet.getCell(`B${rowNum}`).value = `${avgAttendanceRate}%`;
      
      // Style attendance rows
      const attendanceStartRow = rowNum - 4;
      for (let r = attendanceStartRow; r <= rowNum; r++) {
        const labelCell = summarySheet.getCell(`A${r}`);
        const valueCell = summarySheet.getCell(`B${r}`);
        labelCell.font = { size: 11 };
        valueCell.font = { size: 11 };
        labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
        valueCell.alignment = { horizontal: 'right', vertical: 'middle' };
        
        const labelText = String(labelCell.value || '').toUpperCase();
        if (labelText.includes('VẮNG')) {
          valueCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' }
          };
        }
        
        applyBorder(labelCell);
        applyBorder(valueCell);
        summarySheet.getRow(r).height = 26;
      }

      // Sheet 2: Danh Sách Hoạt Động - Chi tiết đầy đủ
      const activitiesListSheet = workbook.addWorksheet('Danh Sách Hoạt Động');
      const activitiesListData: any[] = [];
      
      // Header row
      activitiesListData.push({
        'STT': 'STT',
        'Tên hoạt động': 'Tên hoạt động',
        'Mô tả': 'Mô tả',
        'Loại': 'Loại',
        'Trạng thái': 'Trạng thái',
        'Ngày bắt đầu': 'Ngày bắt đầu',
        'Ngày kết thúc': 'Ngày kết thúc',
        'Địa điểm': 'Địa điểm',
        'Số người đăng ký': 'Số người đăng ký',
        'Số người đã duyệt': 'Số người đã duyệt',
        'Số người chờ duyệt': 'Số người chờ duyệt',
        'Số người từ chối': 'Số người từ chối',
        'Số người đã xóa': 'Số người đã xóa',
        'Tỷ lệ duyệt (%)': 'Tỷ lệ duyệt (%)',
        'Số người điểm danh': 'Số người điểm danh',
        'Tỷ lệ điểm danh (%)': 'Tỷ lệ điểm danh (%)',
        'Đúng giờ': 'Đúng giờ',
        'Trễ': 'Trễ',
        'Vắng': 'Vắng',
        'Tỷ lệ hoàn thành trung bình (%)': 'Tỷ lệ hoàn thành trung bình (%)'
      });

      reportStats.activitiesWithDetails.forEach((activity: any, index: number) => {
        // Calculate average completion rate for approved participants
        const avgCompletionRate = activity.participantDetails?.approved && activity.participantDetails.approved.length > 0
          ? (activity.participantDetails.approved.reduce((sum: number, p: any) => sum + (p.completionRate || 0), 0) / activity.participantDetails.approved.length).toFixed(1)
          : 0;

        activitiesListData.push({
          'STT': index + 1,
          'Tên hoạt động': activity.activityName,
          'Mô tả': activity.activityDescription || 'Không có mô tả',
          'Loại': activity.activityType === 'single_day' ? 'Một ngày' : 'Nhiều ngày',
          'Trạng thái': activity.activityStatus,
          'Ngày bắt đầu': activity.activityDate ? new Date(activity.activityDate).toLocaleDateString('vi-VN') : 'Chưa có',
          'Ngày kết thúc': activity.activityEndDate ? new Date(activity.activityEndDate).toLocaleDateString('vi-VN') : 'Chưa có',
          'Địa điểm': activity.activityLocation || 'Chưa có',
          'Số người đăng ký': activity.participantsCount,
          'Số người đã duyệt': activity.participantsByStatus.approved,
          'Số người chờ duyệt': activity.participantsByStatus.pending,
          'Số người từ chối': activity.participantsByStatus.rejected,
          'Số người đã xóa': activity.participantsByStatus.removed || 0,
          'Tỷ lệ duyệt (%)': `${activity.approval.approvalRate}%`,
          'Số người điểm danh': activity.attendance.checkedIn,
          'Tỷ lệ điểm danh (%)': `${activity.attendance.attendanceRate}%`,
          'Đúng giờ': activity.attendance.onTime,
          'Trễ': activity.attendance.late,
          'Vắng': activity.attendance.absent,
          'Tỷ lệ hoàn thành trung bình (%)': `${avgCompletionRate}%`
        });
      });

      // Add data to activities list sheet
      activitiesListSheet.addRows(activitiesListData);
      
      // Set column widths
      activitiesListSheet.getColumn(1).width = 5;
      activitiesListSheet.getColumn(2).width = 35;
      activitiesListSheet.getColumn(3).width = 50;
      activitiesListSheet.getColumn(4).width = 12;
      activitiesListSheet.getColumn(5).width = 12;
      activitiesListSheet.getColumn(6).width = 15;
      activitiesListSheet.getColumn(7).width = 15;
      activitiesListSheet.getColumn(8).width = 30;
      activitiesListSheet.getColumn(9).width = 15;
      activitiesListSheet.getColumn(10).width = 15;
      activitiesListSheet.getColumn(11).width = 15;
      activitiesListSheet.getColumn(12).width = 15;
      activitiesListSheet.getColumn(13).width = 15;
      activitiesListSheet.getColumn(14).width = 15;
      activitiesListSheet.getColumn(15).width = 18;
      activitiesListSheet.getColumn(16).width = 18;
      activitiesListSheet.getColumn(17).width = 10;
      activitiesListSheet.getColumn(18).width = 10;
      activitiesListSheet.getColumn(19).width = 10;
      activitiesListSheet.getColumn(20).width = 25;
      
      // Style header row
      const headerRow = activitiesListSheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' }
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.height = 26;

      // Sheet 3+: Chi tiết từng hoạt động với format đẹp và đầy đủ thông tin
      const usedSheetNames = new Set<string>();
      reportStats.activitiesWithDetails.forEach((activity: any, activityIndex: number) => {
        // Tạo tên sheet unique để tránh trùng lặp
        let baseName = activity.activityName.length > 28 
          ? activity.activityName.substring(0, 25) 
          : activity.activityName;
        
        // Loại bỏ ký tự đặc biệt không hợp lệ cho tên sheet Excel
        baseName = baseName.replace(/[\\\/\?\*\[\]:]/g, '_');
        
        // Kiểm tra và đảm bảo tên sheet là unique
        let sheetName = baseName;
        let counter = 1;
        
        // Đảm bảo tên sheet là unique (ExcelJS giới hạn 31 ký tự)
        // Chỉ kiểm tra trong Set vì workbook chưa có sheet nào được tạo ở đây
        while (usedSheetNames.has(sheetName)) {
          const suffix = counter > 1 ? ` (${counter})` : ' (1)';
          const maxLength = 31 - suffix.length;
          sheetName = baseName.substring(0, Math.max(1, maxLength)) + suffix;
          counter++;
          
          // Tránh vòng lặp vô hạn - sử dụng activityId hoặc index để đảm bảo unique
          if (counter > 100) {
            // Sử dụng activityId nếu có, nếu không thì dùng index
            const uniqueId = activity.activityId 
              ? activity.activityId.substring(0, 8) 
              : String(activityIndex + 1);
            sheetName = `${baseName.substring(0, Math.max(1, 20 - uniqueId.length))}_${uniqueId}`;
            // Đảm bảo không vượt quá 31 ký tự
            if (sheetName.length > 31) {
              sheetName = sheetName.substring(0, 31);
            }
            break;
          }
        }
        
        // Thêm vào Set TRƯỚC KHI tạo sheet để tránh trùng lặp
        usedSheetNames.add(sheetName);
        
        // ============================================
        // LAYOUT MỚI THEO FORMAT ĐỀ XUẤT
        // ============================================
        
        // Lưu các phần riêng biệt để xử lý
        const infoSection: any[] = []; // Khối 1: Thông tin hoạt động (key-value dọc)
        const scheduleTable: any[] = []; // Khối 2: Lịch trình (bảng ngang)
        const registrationStats: any[] = []; // Khối 3: Thống kê đăng ký & duyệt
        const attendanceStats: any[] = []; // Khối 4: Thống kê điểm danh
        const participantTable: any[] = []; // Khối 5: Danh sách người tham gia (bảng ngang đơn giản)
        
        // ============================================
        // KHỐI 1: THÔNG TIN HOẠT ĐỘNG (Key-Value dọc)
        // ============================================
        infoSection.push({ 'THÔNG TIN HOẠT ĐỘNG': '', '': '' });
        infoSection.push({ 'Tên hoạt động': activity.activityName, '': '' });
        infoSection.push({ 'Mô tả': activity.activityDescription || 'Không có mô tả', '': '' });
        infoSection.push({ 'Loại hoạt động': activity.activityType === 'single_day' ? 'Một ngày' : 'Nhiều ngày', '': '' });
        infoSection.push({ 'Trạng thái': activity.activityStatus, '': '' });
        infoSection.push({ 'Địa điểm': activity.activityLocation || 'Chưa có', '': '' });
        infoSection.push({ 'Ngày bắt đầu': activity.activityDate ? new Date(activity.activityDate).toLocaleDateString('vi-VN') : 'Chưa có', '': '' });
        infoSection.push({ 'Ngày kết thúc': activity.activityEndDate ? new Date(activity.activityEndDate).toLocaleDateString('vi-VN') : 'Chưa có', '': '' });
        infoSection.push({ 'Số người tối đa': activity.maxParticipants || 'Không giới hạn', '': '' });
        infoSection.push({ 'Ngưỡng đăng ký (%)': activity.registrationThreshold || 'Không có', '': '' });
        
        // ============================================
        // KHỐI 2: LỊCH TRÌNH HOẠT ĐỘNG (Bảng ngang)
        // ============================================
        scheduleTable.push({ 'LỊCH TRÌNH HOẠT ĐỘNG': '', '': '', '': '', '': '', '': '' }); // Header sẽ merge sau
        
        // Header row cho bảng lịch trình
        scheduleTable.push({
          'Ngày': 'Ngày',
          'Ca': 'Ca',
          'Giờ bắt đầu': 'Giờ bắt đầu',
          'Giờ kết thúc': 'Giờ kết thúc',
          'Nội dung / mô tả ca': 'Nội dung / mô tả ca',
          'Địa điểm / Bán kính': 'Địa điểm / Bán kính'
        });
        
        // Xử lý lịch trình
        if (activity.activityType === 'single_day' && activity.timeSlots && activity.timeSlots.length > 0) {
          // Hoạt động một ngày
          const activityDate = activity.activityDate ? new Date(activity.activityDate).toLocaleDateString('vi-VN') : '';
          activity.timeSlots.forEach((slot: any) => {
            if (slot.isActive !== false) {
              // Xác định tên ca từ slot.name
              let caName = '';
              if (slot.name === 'Buổi Sáng') caName = 'Sáng';
              else if (slot.name === 'Buổi Chiều') caName = 'Chiều';
              else if (slot.name === 'Buổi Tối') caName = 'Tối';
              else caName = slot.name.replace('Buổi ', '');
              
              // Lấy địa điểm
              let locationInfo = '';
              if (slot.detailedLocation) {
                locationInfo = slot.detailedLocation;
              } else if (activity.activityLocation) {
                locationInfo = activity.activityLocation;
              }
              // Thêm bán kính nếu có
              if (activity.locationData?.radius) {
                locationInfo += ` (${activity.locationData.radius}m)`;
              }
              
              scheduleTable.push({
                'Ngày': activityDate,
                'Ca': caName,
                'Giờ bắt đầu': slot.startTime || '',
                'Giờ kết thúc': slot.endTime || '',
                'Nội dung / mô tả ca': slot.activities || '',
                'Địa điểm / Bán kính': locationInfo || 'Chưa có'
              });
            }
          });
        } else if (activity.activityType === 'multiple_days' && activity.schedule && activity.schedule.length > 0) {
          // Hoạt động nhiều ngày - Parse từ schedule
          activity.schedule.forEach((scheduleDay: any) => {
            const dayDate = scheduleDay.date ? new Date(scheduleDay.date).toLocaleDateString('vi-VN') : '';
            const activitiesText = scheduleDay.activities || '';
            
            // Parse activities text để lấy các buổi
            // Format: "Buổi Sáng (07:00-11:30) - ..." hoặc tương tự
            const lines = activitiesText.split('\n').filter((line: string) => line.trim());
            
            if (lines.length > 0) {
              // Nếu có timeSlots, dùng chúng
              if (activity.timeSlots && activity.timeSlots.length > 0) {
                activity.timeSlots.forEach((slot: any) => {
                  if (slot.isActive !== false) {
                    let caName = '';
                    if (slot.name === 'Buổi Sáng') caName = 'Sáng';
                    else if (slot.name === 'Buổi Chiều') caName = 'Chiều';
                    else if (slot.name === 'Buổi Tối') caName = 'Tối';
                    else caName = slot.name.replace('Buổi ', '');
                    
                    // Tìm nội dung tương ứng từ activitiesText
                    let content = '';
                    const slotPattern = new RegExp(`Buổi ${caName}[^\\n]*`, 'i');
                    const match = activitiesText.match(slotPattern);
                    if (match) {
                      content = match[0].replace(/^Buổi \w+\s*\([^)]+\)\s*-?\s*/, '').trim();
                    } else {
                      content = slot.activities || '';
                    }
                    
                    // Lấy địa điểm
                    let locationInfo = '';
                    if (slot.detailedLocation) {
                      locationInfo = slot.detailedLocation;
                    } else if (activity.activityLocation) {
                      locationInfo = activity.activityLocation;
                    }
                    if (activity.locationData?.radius) {
                      locationInfo += ` (${activity.locationData.radius}m)`;
                    }
                    
                    scheduleTable.push({
                      'Ngày': dayDate,
                      'Ca': caName,
                      'Giờ bắt đầu': slot.startTime || '',
                      'Giờ kết thúc': slot.endTime || '',
                      'Nội dung / mô tả ca': content,
                      'Địa điểm / Bán kính': locationInfo || 'Chưa có'
                    });
                  }
                });
              } else {
                // Nếu không có timeSlots, parse từ activities text
                lines.forEach((line: string) => {
                  // Tìm pattern: "Buổi Sáng/Chiều/Tối (HH:MM-HH:MM)"
                  const slotMatch = line.match(/^Buổi (Sáng|Chiều|Tối)\s*\((\d{2}:\d{2})-(\d{2}:\d{2})\)\s*-?\s*(.*)/);
                  if (slotMatch) {
                    const caName = slotMatch[1];
                    const startTime = slotMatch[2];
                    const endTime = slotMatch[3];
                    const content = slotMatch[4] || '';
                    
                    // Lấy địa điểm
                    let locationInfo = activity.activityLocation || 'Chưa có';
                    if (activity.locationData?.radius) {
                      locationInfo += ` (${activity.locationData.radius}m)`;
                    }
                    
                    scheduleTable.push({
                      'Ngày': dayDate,
                      'Ca': caName,
                      'Giờ bắt đầu': startTime,
                      'Giờ kết thúc': endTime,
                      'Nội dung / mô tả ca': content.trim(),
                      'Địa điểm / Bán kính': locationInfo
                    });
                  }
                });
              }
            }
          });
        }
        
        // ============================================
        // KHỐI 3: THỐNG KÊ ĐĂNG KÝ & DUYỆT
        // ============================================
        registrationStats.push({ 'THỐNG KÊ ĐĂNG KÝ & DUYỆT': '', '': '' });
        registrationStats.push({ 'Tổng số người đăng ký': activity.participantsCount, '': '' });
        registrationStats.push({ 'Số người đã duyệt': activity.participantsByStatus.approved, '': '' });
        registrationStats.push({ 'Số người chờ duyệt': activity.participantsByStatus.pending, '': '' });
        registrationStats.push({ 'Số người từ chối': activity.participantsByStatus.rejected, '': '' });
        registrationStats.push({ 'Số người đã xóa': activity.participantsByStatus.removed || 0, '': '' });
        registrationStats.push({ 'Tỷ lệ duyệt (%)': `${activity.approval.approvalRate}%`, '': '' });
        
        // ============================================
        // KHỐI 4: THỐNG KÊ ĐIỂM DANH
        // ============================================
        attendanceStats.push({ 'THỐNG KÊ ĐIỂM DANH': '', '': '' });
        attendanceStats.push({ 'Số người điểm danh': activity.attendance.checkedIn, '': '' });
        attendanceStats.push({ 'Tỷ lệ điểm danh (%)': `${activity.attendance.attendanceRate}%`, '': '' });
        attendanceStats.push({ 'Đúng giờ': activity.attendance.onTime, '': '' });
        attendanceStats.push({ 'Trễ': activity.attendance.late, '': '' });
        attendanceStats.push({ 'Vắng': activity.attendance.absent, '': '' });

        // ============================================
        // KHỐI 5: DANH SÁCH NGƯỜI THAM GIA (Bảng ngang đơn giản)
        // ============================================
        participantTable.push({ 'DANH SÁCH NGƯỜI THAM GIA': '', '': '', '': '', '': '', '': '', '': '', '': '', '': '', '': '', '': '' }); // Header sẽ merge sau
        
        // Header row cho bảng người tham gia (đơn giản, không có chi tiết từng buổi)
        const participantHeaderRow: any = {
          'STT': 'STT',
          'Họ và tên': 'Họ và tên',
          'Email': 'Email',
          'MSSV': 'MSSV',
          'Tỷ lệ hoàn thành (%)': 'Tỷ lệ hoàn thành (%)',
          'Số buổi đã tham gia': 'Số buổi đã tham gia',
          'Tổng số buổi cần tham gia': 'Tổng số buổi cần tham gia',
          'Đã điểm danh': 'Đã điểm danh',
          'Thời gian điểm danh đầu tiên': 'Thời gian điểm danh đầu tiên',
          'Đã đăng ký các buổi': 'Đã đăng ký các buổi',
          'Ghi chú': 'Ghi chú'
        };
        
        participantTable.push(participantHeaderRow);

        // Thêm dữ liệu người tham gia vào bảng (đơn giản, không có chi tiết từng buổi)
        // Approved participants
        if (activity.participantDetails?.approved) {
          activity.participantDetails.approved.forEach((participant: any, pIndex: number) => {
            const row: any = {
              'STT': pIndex + 1,
              'Họ và tên': participant.name,
              'Email': participant.email,
              'MSSV': participant.studentId || '',
              'Tỷ lệ hoàn thành (%)': `${participant.completionRate || 0}%`,
              'Số buổi đã tham gia': participant.totalSessionsAttended || 0,
              'Tổng số buổi cần tham gia': participant.totalExpectedSessions || 0,
              'Đã điểm danh': participant.checkedIn ? 'Có' : 'Không',
              'Thời gian điểm danh đầu tiên': participant.checkedInAt 
                ? new Date(participant.checkedInAt).toLocaleString('vi-VN') 
                : 'Chưa điểm danh',
              'Đã đăng ký các buổi': '',
              'Ghi chú': ''
            };
            
            // Đã đăng ký các buổi (cho multiple_days)
            if (activity.activityType === 'multiple_days' && participant.registeredDaySlots && participant.registeredDaySlots.length > 0) {
              row['Đã đăng ký các buổi'] = participant.registeredDaySlots
                .map((ds: any) => `Ngày ${ds.day} - ${ds.slot === 'morning' ? 'Sáng' : ds.slot === 'afternoon' ? 'Chiều' : 'Tối'}`)
                .join('; ');
            }
            
            participantTable.push(row);
          });
        }

        // Pending participants
        if (activity.participantDetails?.pending && activity.participantDetails.pending.length > 0) {
          activity.participantDetails.pending.forEach((participant: any, pIndex: number) => {
            const row: any = {
              'STT': (activity.participantDetails.approved?.length || 0) + pIndex + 1,
              'Họ và tên': participant.name,
              'Email': participant.email,
              'MSSV': participant.studentId || '',
              'Tỷ lệ hoàn thành (%)': 'Chờ duyệt',
              'Số buổi đã tham gia': 0,
              'Tổng số buổi cần tham gia': 0,
              'Đã điểm danh': 'Chưa',
              'Thời gian điểm danh đầu tiên': 'Chưa điểm danh',
              'Đã đăng ký các buổi': '',
              'Ghi chú': ''
            };
            
            if (activity.activityType === 'multiple_days' && participant.registeredDaySlots && participant.registeredDaySlots.length > 0) {
              row['Đã đăng ký các buổi'] = participant.registeredDaySlots
                .map((ds: any) => `Ngày ${ds.day} - ${ds.slot === 'morning' ? 'Sáng' : ds.slot === 'afternoon' ? 'Chiều' : 'Tối'}`)
                .join('; ');
            }
            
            participantTable.push(row);
          });
        }

        // Rejected participants
        if (activity.participantDetails?.rejected && activity.participantDetails.rejected.length > 0) {
          activity.participantDetails.rejected.forEach((participant: any, pIndex: number) => {
            const row: any = {
              'STT': (activity.participantDetails.approved?.length || 0) + 
                     (activity.participantDetails.pending?.length || 0) + pIndex + 1,
              'Họ và tên': participant.name,
              'Email': participant.email,
              'MSSV': participant.studentId || '',
              'Tỷ lệ hoàn thành (%)': 'Từ chối',
              'Số buổi đã tham gia': 0,
              'Tổng số buổi cần tham gia': 0,
              'Đã điểm danh': 'Không',
              'Thời gian điểm danh đầu tiên': 'Không điểm danh',
              'Đã đăng ký các buổi': '',
              'Ghi chú': ''
            };
            
            participantTable.push(row);
          });
        }

        // Removed participants
        if (activity.participantDetails?.removed && activity.participantDetails.removed.length > 0) {
          activity.participantDetails.removed.forEach((participant: any, pIndex: number) => {
            const row: any = {
              'STT': (activity.participantDetails.approved?.length || 0) + 
                     (activity.participantDetails.pending?.length || 0) + 
                     (activity.participantDetails.rejected?.length || 0) + pIndex + 1,
              'Họ và tên': participant.name,
              'Email': participant.email,
              'MSSV': participant.studentId || '',
              'Tỷ lệ hoàn thành (%)': 'Đã xóa',
              'Số buổi đã tham gia': 0,
              'Tổng số buổi cần tham gia': 0,
              'Đã điểm danh': 'Không',
              'Thời gian điểm danh đầu tiên': 'Không điểm danh',
              'Đã đăng ký các buổi': '',
              'Ghi chú': ''
            };
            
            participantTable.push(row);
          });
        }

        // Kiểm tra xem có dữ liệu để tạo sheet không
        const hasData = infoSection.length > 0 || scheduleTable.length > 0 || 
                       registrationStats.length > 0 || attendanceStats.length > 0 || 
                       participantTable.length > 0;
        
        if (hasData) {
          // Tạo sheet với error handling để tránh trùng tên
          let activitySheet;
          let finalSheetName = sheetName;
          let retryCount = 0;
          const maxRetries = 10;
          
          while (retryCount < maxRetries) {
            try {
              activitySheet = workbook.addWorksheet(finalSheetName);
              break; // Thành công, thoát khỏi vòng lặp
            } catch (error: any) {
              // Nếu lỗi do trùng tên, tạo tên mới
              if (error.message && error.message.includes('already exists')) {
                retryCount++;
                
                // Tạo tên mới dựa trên retryCount
                if (retryCount < 5) {
                  // Thử với suffix số
                  const suffix = ` (${retryCount})`;
                  const maxLength = 31 - suffix.length;
                  finalSheetName = baseName.substring(0, Math.max(1, maxLength)) + suffix;
                } else {
                  // Dùng activityId hoặc index để đảm bảo unique
                  const uniqueId = activity.activityId 
                    ? activity.activityId.substring(0, 8) 
                    : String(activityIndex + 1);
                  finalSheetName = `${baseName.substring(0, Math.max(1, 20 - uniqueId.length))}_${uniqueId}`;
                  if (finalSheetName.length > 31) {
                    finalSheetName = finalSheetName.substring(0, 31);
                  }
                }
                
                // Đảm bảo tên mới không trùng với Set
                if (usedSheetNames.has(finalSheetName)) {
                  // Nếu vẫn trùng, dùng tên với index
                  finalSheetName = `A${activityIndex + 1}_${retryCount}`;
                  if (finalSheetName.length > 31) {
                    finalSheetName = finalSheetName.substring(0, 31);
                  }
                }
                
                // Thêm vào Set để tránh trùng lặp tiếp theo
                usedSheetNames.add(finalSheetName);
              } else {
                // Lỗi khác, throw lại
                throw error;
              }
            }
          }
          
          // Fallback nếu vẫn không tạo được
          if (!activitySheet) {
            finalSheetName = `A${activityIndex + 1}`;
            activitySheet = workbook.addWorksheet(finalSheetName);
          }
          
          // ============================================
          // THÊM DỮ LIỆU VÀO SHEET THEO LAYOUT MỚI
          // ============================================
          
          let currentRow = 1;
          
          // Helper function để apply border
          const applyBorder = (cell: ExcelJS.Cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
          };
          
          // 1️⃣ TIÊU ĐỀ CHUNG (A1:K1 - merge)
          activitySheet.mergeCells(1, 1, 1, 11); // A1:K1
          const titleCell = activitySheet.getCell(1, 1);
          titleCell.value = 'BÁO CÁO CHI TIẾT HOẠT ĐỘNG NGOẠI KHÓA';
          titleCell.font = { size: 16, bold: true };
          titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
          titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE8F4F8' }
          };
          applyBorder(titleCell);
          activitySheet.getRow(1).height = 28;
          currentRow = 2;
          
          // 2️⃣ KHỐI 1: THÔNG TIN HOẠT ĐỘNG (Key-Value dọc, bắt đầu từ row 3)
          currentRow = 3;
          infoSection.forEach((row: any) => {
            try {
              const keys = Object.keys(row);
              const firstKey = keys[0];
              const firstValue = row[firstKey];
              const secondKey = keys[1] || '';
              const secondValue = row[secondKey] || '';
              
              const rowValues = [firstValue || firstKey, secondValue];
              const excelRow = activitySheet.addRow(rowValues);
              
              const isSectionHeader = typeof firstValue === 'string' && firstValue.includes('THÔNG TIN');
              
              if (isSectionHeader) {
                excelRow.font = { bold: true, size: 12 };
                excelRow.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFF1F5F9' }
                };
                excelRow.alignment = { horizontal: 'left', vertical: 'middle' };
                excelRow.height = 26;
                activitySheet.mergeCells(excelRow.number, 1, excelRow.number, 2);
              } else {
                excelRow.font = { size: 11 };
                excelRow.height = 22;
                
                const labelCell = excelRow.getCell(1);
                labelCell.font = { size: 11, bold: true };
                labelCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                
                const valueCell = excelRow.getCell(2);
                valueCell.font = { size: 11 };
                valueCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
              }
              
              excelRow.eachCell((cell: ExcelJS.Cell) => {
                applyBorder(cell);
              });
            } catch (rowError: any) {
              console.error(`Error adding info row:`, rowError);
            }
          });
          
          // 3️⃣ KHỐI 2: LỊCH TRÌNH HOẠT ĐỘNG (Bảng ngang)
          if (scheduleTable.length > 0) {
            // Thêm header "LỊCH TRÌNH HOẠT ĐỘNG" và merge
            const scheduleHeaderRow = activitySheet.addRow(['LỊCH TRÌNH HOẠT ĐỘNG', '', '', '', '', '']);
            scheduleHeaderRow.font = { bold: true, size: 12 };
            scheduleHeaderRow.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF1F5F9' }
            };
            scheduleHeaderRow.alignment = { horizontal: 'left', vertical: 'middle' };
            scheduleHeaderRow.height = 26;
            activitySheet.mergeCells(scheduleHeaderRow.number, 1, scheduleHeaderRow.number, 6); // A:F
            scheduleHeaderRow.eachCell((cell: ExcelJS.Cell) => {
              applyBorder(cell);
            });
            
            // Thêm các rows của bảng lịch trình
            scheduleTable.forEach((row: any) => {
              try {
                const rowValues = [
                  row['Ngày'] || '',
                  row['Ca'] || '',
                  row['Giờ bắt đầu'] || '',
                  row['Giờ kết thúc'] || '',
                  row['Nội dung / mô tả ca'] || '',
                  row['Địa điểm / Bán kính'] || ''
                ];
                const excelRow = activitySheet.addRow(rowValues);
                excelRow.font = { size: 11 };
                excelRow.height = 22;
                excelRow.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                excelRow.eachCell((cell: ExcelJS.Cell) => {
                  applyBorder(cell);
                });
              } catch (rowError: any) {
                console.error(`Error adding schedule row:`, rowError);
              }
            });
          }
          
          // 4️⃣ KHỐI 3: THỐNG KÊ ĐĂNG KÝ & DUYỆT (Key-Value dọc)
          registrationStats.forEach((row: any) => {
            try {
              const keys = Object.keys(row);
              const firstKey = keys[0];
              const firstValue = row[firstKey];
              const secondKey = keys[1] || '';
              const secondValue = row[secondKey] || '';
              
              const rowValues = [firstValue || firstKey, secondValue];
              const excelRow = activitySheet.addRow(rowValues);
              
              const isSectionHeader = typeof firstValue === 'string' && firstValue.includes('THỐNG KÊ ĐĂNG KÝ');
              
              if (isSectionHeader) {
                excelRow.font = { bold: true, size: 12 };
                excelRow.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFF1F5F9' }
                };
                excelRow.alignment = { horizontal: 'left', vertical: 'middle' };
                excelRow.height = 26;
                activitySheet.mergeCells(excelRow.number, 1, excelRow.number, 2);
              } else {
                excelRow.font = { size: 11 };
                excelRow.height = 22;
                
                const labelCell = excelRow.getCell(1);
                labelCell.font = { size: 11, bold: true };
                labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
                
                const valueCell = excelRow.getCell(2);
                valueCell.font = { size: 11 };
                valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
              }
              
              excelRow.eachCell((cell: ExcelJS.Cell) => {
                applyBorder(cell);
              });
            } catch (rowError: any) {
              console.error(`Error adding registration stats row:`, rowError);
            }
          });
          
          // 5️⃣ KHỐI 4: THỐNG KÊ ĐIỂM DANH (Key-Value dọc)
          attendanceStats.forEach((row: any) => {
            try {
              const keys = Object.keys(row);
              const firstKey = keys[0];
              const firstValue = row[firstKey];
              const secondKey = keys[1] || '';
              const secondValue = row[secondKey] || '';
              
              const rowValues = [firstValue || firstKey, secondValue];
              const excelRow = activitySheet.addRow(rowValues);
              
              const isSectionHeader = typeof firstValue === 'string' && firstValue.includes('THỐNG KÊ ĐIỂM DANH');
              
              if (isSectionHeader) {
                excelRow.font = { bold: true, size: 12 };
                excelRow.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFF1F5F9' }
                };
                excelRow.alignment = { horizontal: 'left', vertical: 'middle' };
                excelRow.height = 26;
                activitySheet.mergeCells(excelRow.number, 1, excelRow.number, 2);
              } else {
                excelRow.font = { size: 11 };
                excelRow.height = 22;
                
                const labelCell = excelRow.getCell(1);
                labelCell.font = { size: 11, bold: true };
                labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
                
                const valueCell = excelRow.getCell(2);
                valueCell.font = { size: 11 };
                valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
              }
              
              excelRow.eachCell((cell: ExcelJS.Cell) => {
                applyBorder(cell);
              });
            } catch (rowError: any) {
              console.error(`Error adding attendance stats row:`, rowError);
            }
          });
          
          // 6️⃣ KHỐI 5: DANH SÁCH NGƯỜI THAM GIA (Bảng ngang đơn giản)
          if (participantTable.length > 0) {
            // Header "DANH SÁCH NGƯỜI THAM GIA" và merge
            const participantHeaderTitleRow = activitySheet.addRow(['DANH SÁCH NGƯỜI THAM GIA', '', '', '', '', '', '', '', '', '', '']);
            participantHeaderTitleRow.font = { bold: true, size: 12 };
            participantHeaderTitleRow.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF1F5F9' }
            };
            participantHeaderTitleRow.alignment = { horizontal: 'left', vertical: 'middle' };
            participantHeaderTitleRow.height = 26;
            activitySheet.mergeCells(participantHeaderTitleRow.number, 1, participantHeaderTitleRow.number, 11); // A:K
            participantHeaderTitleRow.eachCell((cell: ExcelJS.Cell) => {
              applyBorder(cell);
            });
            
            // Lấy header row (row thứ 2 trong participantTable)
            const headerRow = participantTable[1];
            const allColumnKeys = Object.keys(headerRow);
            
            // Thêm header row cho bảng
            const headerRowValues = allColumnKeys.map(key => headerRow[key] || key);
            const headerExcelRow = activitySheet.addRow(headerRowValues);
            
            // Style header row
            headerExcelRow.font = { bold: true, size: 11 };
            headerExcelRow.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE8F4F8' }
            };
            headerExcelRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            headerExcelRow.height = 30;
            headerExcelRow.eachCell((cell: ExcelJS.Cell) => {
              applyBorder(cell);
            });
            
            // Thêm data rows
            participantTable.slice(2).forEach((row: any, dataRowIndex: number) => {
              try {
                const rowValues = allColumnKeys.map(key => {
                  const value = row[key];
                  if (value === undefined || value === null) {
                    return '';
                  }
                  if (typeof value === 'object' && !(value instanceof Date)) {
                    return JSON.stringify(value);
                  }
                  return value;
                });
                
                const excelRow = activitySheet.addRow(rowValues);
                excelRow.font = { size: 10 };
                excelRow.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                excelRow.height = 20;
                
                // Style đặc biệt
                excelRow.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
                  const columnKey = allColumnKeys[colNumber - 1];
                  
                  if (columnKey === 'STT') {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.font = { size: 10, bold: true };
                  }
                  
                  applyBorder(cell);
                });
              } catch (rowError: any) {
                console.error(`Error adding participant row ${dataRowIndex}:`, rowError);
              }
            });
            
            // Set column widths cho bảng người tham gia
            allColumnKeys.forEach((key: string, colIndex: number) => {
              const colNumber = colIndex + 1;
              try {
                if (key === 'STT') {
                  activitySheet.getColumn(colNumber).width = 5;
                } else if (key === 'Họ và tên') {
                  activitySheet.getColumn(colNumber).width = 25;
                } else if (key === 'Email') {
                  activitySheet.getColumn(colNumber).width = 30;
                } else if (key === 'MSSV') {
                  activitySheet.getColumn(colNumber).width = 15;
                } else if (key === 'Đã đăng ký các buổi') {
                  activitySheet.getColumn(colNumber).width = 40;
                } else if (key === 'Thời gian điểm danh đầu tiên') {
                  activitySheet.getColumn(colNumber).width = 22;
                } else {
                  activitySheet.getColumn(colNumber).width = 18;
                }
              } catch (colError: any) {
                console.error(`Error setting width for column ${colNumber} (${key}):`, colError);
              }
            });
          }
          
          // Set column widths - ưu tiên theo phần cuối cùng (bảng người tham gia nếu có)
          // Nếu không có bảng người tham gia, dùng width cho phần thông tin
          if (participantTable.length === 0) {
            // Chỉ có phần thông tin (key-value dọc)
            activitySheet.getColumn(1).width = 35; // Cột Label
            activitySheet.getColumn(2).width = 50; // Cột Giá trị
          }
          // Nếu có bảng người tham gia, column widths đã được set ở trên
        }
      });

      // Generate Excel file
      const excelBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = `bao-cao-thong-ke-${user?.name || 'officer'}-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.download = fileName.replace(/[^a-z0-9.-]/gi, '_');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Có lỗi xảy ra khi xuất file Excel. Vui lòng thử lại.');
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(previewData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Không thể sao chép vào clipboard');
    }
  };

  // Download from preview (Excel)
  const handleDownloadFromPreview = () => {
    handleExportReport();
    setShowPreviewModal(false);
  };

  // Calculate percentage
  const calculatePercentage = (value: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  // Format date range label
  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'week': return 'Tuần này';
      case 'month': return 'Tháng này';
      case 'quarter': return 'Quý này';
      case 'year': return 'Năm này';
      case 'all': return 'Tất cả';
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate).toLocaleDateString('vi-VN');
          const end = new Date(customEndDate).toLocaleDateString('vi-VN');
          return `${start} - ${end}`;
        }
        return 'Tùy chọn thời gian';
      default: return 'Tháng này';
    }
  };

  // Get status display name and icon
  const getStatusInfo = (status: string) => {
    const statusConfig: { [key: string]: { name: string; icon: any; color: string; bgColor: string } } = {
      draft: { name: 'Nháp', icon: FileText, color: '#eab308', bgColor: 'rgba(234, 179, 8, 0.2)' },
      published: { name: 'Đã xuất bản', icon: CheckCircle2, color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.2)' },
      ongoing: { name: 'Đang diễn ra', icon: PlayCircle, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.2)' },
      completed: { name: 'Đã hoàn thành', icon: Award, color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.2)' },
      cancelled: { name: 'Đã hủy', icon: XCircle, color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.2)' },
      postponed: { name: 'Tạm hoãn', icon: Clock, color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.2)' }
    };
    return statusConfig[status] || { name: status, icon: AlertCircle, color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.2)' };
  };

  // Function để xác định trạng thái thời gian của hoạt động (dựa trên ngày, không phụ thuộc status)
  const getTemporalStatus = (activity: ActivityDetail): 'upcoming' | 'ongoing' | 'past' => {
    try {
      const now = new Date();
      
      // Xử lý hoạt động nhiều ngày
      if (activity.activityType === 'multiple_days' && activity.activityDate && activity.activityEndDate) {
        const startDate = new Date(activity.activityDate);
        const endDate = new Date(activity.activityEndDate);
        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999);
        
        if (now.getTime() < startDate.getTime()) {
          return 'upcoming'; // Chưa diễn ra
        }
        if (now.getTime() >= startDate.getTime() && now.getTime() <= endDate.getTime()) {
          return 'ongoing'; // Đang diễn ra
        }
        return 'past'; // Đã kết thúc
      }
      
      // Xử lý hoạt động 1 ngày
      if (activity.activityDate) {
        const activityDate = new Date(activity.activityDate);
        const activityDateOnly = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
        const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (activityDateOnly.getTime() < todayOnly.getTime()) {
          return 'past'; // Đã qua ngày
        }
        
        if (activityDateOnly.getTime() > todayOnly.getTime()) {
          return 'upcoming'; // Chưa đến ngày
        }
        
        // Cùng ngày - coi như đang diễn ra (hoặc có thể kiểm tra time slots nếu có)
        return 'ongoing';
      }
      
      // Nếu không có ngày, mặc định là upcoming
      return 'upcoming';
    } catch (e) {
      return 'upcoming';
    }
  };

  // Function để lấy thông tin trạng thái thời gian (visual)
  const getTemporalStatusInfo = (temporalStatus: 'upcoming' | 'ongoing' | 'past') => {
    const config = {
      upcoming: { 
        name: 'Sắp diễn ra', 
        icon: Clock, 
        color: '#f59e0b', 
        bgColor: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'rgba(245, 158, 11, 0.3)'
      },
      ongoing: { 
        name: 'Đang diễn ra', 
        icon: PlayCircle, 
        color: '#10b981', 
        bgColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'rgba(16, 185, 129, 0.3)'
      },
      past: { 
        name: 'Đã kết thúc', 
        icon: CheckCircle2, 
        color: '#6b7280', 
        bgColor: 'rgba(107, 114, 128, 0.1)',
        borderColor: 'rgba(107, 114, 128, 0.3)'
      }
    };
    return config[temporalStatus];
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="CLUB_MEMBER">
        <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <OfficerNav />
          <main className="flex-1 flex items-center justify-center px-4 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className={`mt-4 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Đang tải dữ liệu thống kê...
              </p>
          </div>
        </main>
        <Footer isDarkMode={isDarkMode} />

        {/* Preview Export Modal */}
        {showPreviewModal && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setShowPreviewModal(false)}
          >
            <div 
              className={`relative w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              } flex flex-col`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-4 sm:p-6 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                  }`}>
                    <Eye className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Xem Trước Dữ Liệu Xuất
                    </h2>
                    <p className={`text-xs sm:text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Dữ liệu sẽ được xuất dưới dạng Excel (.xlsx)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className={`p-2 rounded-lg transition-all ${
                    isDarkMode 
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Info Bar */}
                <div className={`px-4 sm:px-6 py-2 ${
                  isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                } border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                        {reportStats?.totalActivities || 0} hoạt động
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                        {reportStats?.totalParticipants || 0} người tham gia
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                        {getDateRangeLabel()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-auto p-4 sm:p-6">
                  <pre className={`text-xs sm:text-sm font-mono overflow-auto rounded-lg p-4 whitespace-pre-wrap ${
                    isDarkMode 
                      ? 'bg-gray-900 text-gray-300 border border-gray-700' 
                      : 'bg-gray-50 text-gray-800 border border-gray-200'
                  }`}>
                    {previewData}
                  </pre>
                </div>
              </div>

              {/* Footer Actions */}
              <div className={`flex items-center justify-between p-4 sm:p-6 border-t ${
                isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Info className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Bạn có thể tải xuống file Excel (.xlsx) chứa đầy đủ thông tin
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadFromPreview}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                      isDarkMode
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    } hover:scale-105 shadow-md hover:shadow-lg`}
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Tải xuống Excel</span>
                    <span className="sm:hidden">Tải Excel</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

  return (
    <ProtectedRoute requiredRole="CLUB_MEMBER">
      <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <OfficerNav />
        
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div 
                  className={`p-2 rounded-xl ${isDarkMode ? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20' : 'bg-gradient-to-br from-blue-100 to-indigo-100'}`}
                  title="Báo cáo thống kê hoạt động ngoại khóa"
                >
                  <BarChart3 className={`w-5 h-5 text-blue-600 dark:text-blue-400`} />
                </div>
                <div>
                  <h1 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Báo Cáo Cá Nhân
                  </h1>
                  <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Thống kê hoạt động ngoại khóa được phân công - {getDateRangeLabel()}
                  </p>
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={dateRange}
                  onChange={(e) => {
                    const newRange = e.target.value as typeof dateRange;
                    setDateRange(newRange);
                    // Reset custom dates khi chọn option khác
                    if (newRange !== 'custom') {
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }
                  }}
                  className={`px-3 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                >
                  <option value="week">Tuần này</option>
                  <option value="month">Tháng này</option>
                  <option value="quarter">Quý này</option>
                  <option value="year">Năm này</option>
                  <option value="all">Tất cả</option>
                  <option value="custom">Tùy chọn thời gian</option>
                </select>
                
                {/* Custom Date Range Picker */}
                {dateRange === 'custom' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex items-center gap-2">
                        <div title="Từ ngày">
                          <Calendar className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                        </div>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => {
                            const newStartDate = e.target.value;
                            setCustomStartDate(newStartDate);
                            // Nếu endDate nhỏ hơn startDate mới, reset endDate
                            if (customEndDate && newStartDate > customEndDate) {
                              setCustomEndDate('');
                              setDateError('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
                            } else {
                              setDateError('');
                            }
                          }}
                          max={customEndDate || maxActivityDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]}
                          className={`px-3 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all ${
                    isDarkMode
                              ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700' 
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          } ${
                            dateError && !customStartDate 
                              ? 'border-red-500 focus:ring-red-500' 
                              : 'focus:ring-emerald-500'
                          } focus:outline-none focus:ring-2`}
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div title="Đến ngày">
                          <CalendarDays className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                        </div>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => {
                            const newEndDate = e.target.value;
                            setCustomEndDate(newEndDate);
                            // Nếu startDate lớn hơn endDate mới, hiển thị lỗi
                            if (customStartDate && customStartDate > newEndDate) {
                              setDateError('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
                            } else {
                              setDateError('');
                            }
                          }}
                          min={customStartDate || undefined}
                          max={maxActivityDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]}
                          className={`px-3 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all ${
                            isDarkMode 
                              ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700' 
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          } ${
                            dateError && !customEndDate 
                              ? 'border-red-500 focus:ring-red-500' 
                              : 'focus:ring-emerald-500'
                          } focus:outline-none focus:ring-2`}
                          required
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (validateCustomDateRange()) {
                            fetchReportStats();
                          }
                        }}
                        disabled={!customStartDate || !customEndDate || !!dateError}
                        className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                          (!customStartDate || !customEndDate || !!dateError)
                            ? isDarkMode
                              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : isDarkMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                        } ${(!customStartDate || !customEndDate || !!dateError) ? '' : 'hover:scale-105 shadow-md hover:shadow-lg'}`}
                        title={dateError || (!customStartDate || !customEndDate ? 'Vui lòng chọn đầy đủ từ ngày và đến ngày' : 'Áp dụng bộ lọc')}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Áp dụng
                      </button>
                    </div>
                    {dateError && (
                      <div className={`text-xs px-2 py-1 rounded-md flex items-center gap-1.5 ${
                        isDarkMode 
                          ? 'bg-red-900/30 text-red-300 border border-red-500/30' 
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{dateError}</span>
                      </div>
                    )}
                  </div>
                )}
                
                <button
                  onClick={handlePreviewExport}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    isDarkMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  } hover:scale-105 shadow-md hover:shadow-lg`}
                >
                  <div title="Xem trước dữ liệu trước khi xuất">
                    <Eye className="w-4 h-4" />
                  </div>
                  <span className="hidden sm:inline">Xem trước</span>
                  <span className="sm:hidden">Xem</span>
                </button>
                
                <button
                  onClick={handleExportReport}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    isDarkMode
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  } hover:scale-105 shadow-md hover:shadow-lg`}
                >
                  <div title="Tải xuống báo cáo dưới dạng JSON">
                    <Download className="w-4 h-4" />
                  </div>
                  <span className="hidden sm:inline">Xuất báo cáo</span>
                  <span className="sm:hidden">Xuất</span>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Overview Stats - Compact Cards */}
          {reportStats && (
            <div className="mb-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                {/* Total Activities */}
                <div className={`p-3 rounded-xl shadow-md transition-all hover:shadow-lg ${
                  isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`} title="Tổng số hoạt động ngoại khóa">
                      <Activity className={`w-4 h-4 text-blue-600 dark:text-blue-400`} />
                  </div>
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Hoạt động</span>
                  </div>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {reportStats.totalActivities}
                  </p>
                </div>

                {/* Total Participants */}
                <div className={`p-3 rounded-xl shadow-md transition-all hover:shadow-lg ${
                  isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`} title="Tổng số người tham gia tất cả hoạt động">
                      <Users className={`w-4 h-4 text-emerald-600 dark:text-emerald-400`} />
                  </div>
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Người tham gia</span>
                  </div>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {reportStats.totalParticipants}
                  </p>
                </div>

                {/* Average Participants */}
                <div className={`p-3 rounded-xl shadow-md transition-all hover:shadow-lg ${
                  isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'}`} title="Số lượng người tham gia trung bình mỗi hoạt động">
                      <TrendingUp className={`w-4 h-4 text-purple-600 dark:text-purple-400`} />
                  </div>
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Trung bình</span>
                  </div>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {reportStats.averageParticipants}
                  </p>
                </div>

                {/* Approval Rate */}
                <div className={`p-3 rounded-xl shadow-md transition-all hover:shadow-lg ${
                  isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-amber-500/20' : 'bg-amber-100'}`} title="Tỷ lệ phần trăm đơn đăng ký được duyệt">
                      <CheckCircle2 className={`w-4 h-4 text-amber-600 dark:text-amber-400`} />
                  </div>
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tỷ lệ duyệt</span>
                  </div>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {reportStats.approvalRate}%
                  </p>
                </div>
              </div>

              {/* Participants Breakdown - Compact */}
              <div className={`p-3 rounded-xl shadow-md ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                    <Users className={`w-4 h-4 text-indigo-600 dark:text-indigo-400`} />
                  </div>
                  <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Phân Bố Người Tham Gia
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                    <div title={`Đã duyệt: ${reportStats.approvedParticipants} người (${calculatePercentage(reportStats.approvedParticipants, reportStats.totalParticipants)}%)`}>
                      <UserCheck className={`w-6 h-6 mx-auto mb-1.5 text-emerald-600 dark:text-emerald-400`} />
                    </div>
                    <p className={`text-lg font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {reportStats.approvedParticipants}
                    </p>
                    <p className={`text-[11px] font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                      Đã duyệt ({calculatePercentage(reportStats.approvedParticipants, reportStats.totalParticipants)}%)
                    </p>
                  </div>
                  <div className="text-center p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10">
                    <div className="relative inline-block mb-1.5" title={`Chờ duyệt: ${reportStats.pendingParticipants} người (${calculatePercentage(reportStats.pendingParticipants, reportStats.totalParticipants)}%)`}>
                      <Users className={`w-6 h-6 text-amber-600 dark:text-amber-400`} />
                      <Clock className={`w-3.5 h-3.5 absolute -bottom-0.5 -right-0.5 text-amber-700 dark:text-amber-500`} />
                    </div>
                    <p className={`text-lg font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {reportStats.pendingParticipants}
                    </p>
                    <p className={`text-[11px] font-medium ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                      Chờ duyệt ({calculatePercentage(reportStats.pendingParticipants, reportStats.totalParticipants)}%)
                    </p>
                  </div>
                  <div className="text-center p-2.5 rounded-lg bg-red-50 dark:bg-red-500/10">
                    <div title={`Từ chối: ${reportStats.rejectedParticipants} người (${calculatePercentage(reportStats.rejectedParticipants, reportStats.totalParticipants)}%)`}>
                      <UserX className={`w-6 h-6 mx-auto mb-1.5 text-red-600 dark:text-red-400`} />
                    </div>
                    <p className={`text-lg font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {reportStats.rejectedParticipants}
                    </p>
                    <p className={`text-[11px] font-medium ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                      Từ chối ({calculatePercentage(reportStats.rejectedParticipants, reportStats.totalParticipants)}%)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Charts Section */}
          {reportStats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
              {/* Activity Status Distribution - Recharts Pie Chart */}
              <div className={`p-3 rounded-xl shadow-md ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div 
                    className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-violet-500/20' : 'bg-violet-100'}`}
                    title="Biểu đồ phân bố hoạt động theo trạng thái"
                  >
                    <BarChart3 className={`w-4 h-4 text-violet-600 dark:text-violet-400`} />
                  </div>
                  <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Phân Bố Theo Trạng Thái
                  </h3>
                </div>
                {(() => {
                  const statusData = Object.entries(reportStats.byStatus)
                    .filter(([_, count]) => count > 0)
                    .map(([status, count]) => {
                      const statusInfo = getStatusInfo(status);
                      return { 
                        name: statusInfo.name, 
                        value: count, 
                        color: statusInfo.color,
                        percentage: calculatePercentage(count, reportStats.totalActivities),
                        icon: statusInfo.icon
                      };
                    });
                  
                  if (statusData.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Không có dữ liệu
                        </div>
                      </div>
                    );
                  }
                  
                  const COLORS = statusData.map(d => d.color);
                  
                  return (
                    <div>
                      <ResponsiveContainer width="100%" height={240}>
                        <RechartsPieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry: any) => `${entry.percentage}%`}
                            outerRadius={85}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                              border: `2px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`,
                              borderRadius: '8px',
                              color: isDarkMode ? '#f3f4f6' : '#111827',
                              fontSize: '12px',
                              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                            }}
                            formatter={(value: number, name: string, props: any) => [
                              `${value} (${props.payload.percentage}%)`,
                              name
                            ]}
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                            iconType="circle"
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </div>

              {/* Activity Type Distribution - Recharts Pie Chart */}
              <div className={`p-3 rounded-xl shadow-md ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div 
                    className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}
                    title="Biểu đồ phân bố hoạt động theo loại (1 ngày / nhiều ngày)"
                  >
                    <BarChart3 className={`w-4 h-4 text-indigo-600 dark:text-indigo-400`} />
                  </div>
                  <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Phân Bố Theo Loại
                  </h3>
                </div>
                {(() => {
                  const typeData = [
                    { 
                      name: 'Hoạt động 1 ngày',
                      value: reportStats.byType.single_day, 
                      color: '#3b82f6',
                      percentage: calculatePercentage(reportStats.byType.single_day, reportStats.totalActivities)
                    },
                    { 
                      name: 'Hoạt động nhiều ngày',
                      value: reportStats.byType.multiple_days, 
                      color: '#a855f7',
                      percentage: calculatePercentage(reportStats.byType.multiple_days, reportStats.totalActivities)
                    }
                  ].filter(d => d.value > 0);
                  
                  if (typeData.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Không có dữ liệu
                        </div>
                      </div>
                    );
                  }
                  
                  const COLORS = typeData.map(d => d.color);
                  
                  return (
                    <div>
                      <ResponsiveContainer width="100%" height={240}>
                        <RechartsPieChart>
                          <Pie
                            data={typeData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry: any) => `${entry.percentage}%`}
                            outerRadius={85}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {typeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                              border: `2px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`,
                              borderRadius: '8px',
                              color: isDarkMode ? '#f3f4f6' : '#111827',
                              fontSize: '12px',
                              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                            }}
                            formatter={(value: number, name: string, props: any) => [
                              `${value} (${props.payload.percentage}%)`,
                              name
                            ]}
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                            iconType="circle"
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Top Activities & Monthly Chart */}
          {reportStats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
              {/* Top Activities */}
              {reportStats.topActivitiesByParticipants.length > 0 && (
                <div className={`p-2.5 rounded-lg shadow-sm ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div title="Top 5 hoạt động có nhiều người tham gia nhất">
                      <Award className={`w-3.5 h-3.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                    </div>
                    <h3 className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Top Hoạt Động
                    </h3>
                  </div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {reportStats.topActivitiesByParticipants.slice(0, 5).map((activity, index) => {
                      const statusInfo = getStatusInfo(activity.activityStatus);
                      const StatusIcon = statusInfo.icon;
                      
                      return (
                        <div
                          key={activity.activityId}
                          className={`p-2.5 rounded-lg transition-all ${
                            isDarkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                index === 0 ? (isDarkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700') :
                                index === 1 ? (isDarkMode ? 'bg-gray-400/20 text-gray-300' : 'bg-gray-200 text-gray-600') :
                                index === 2 ? (isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700') :
                                (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700')
                              }`}>
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {activity.activityName}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <StatusIcon className="w-3 h-3" style={{ color: statusInfo.color }} />
                                  <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {statusInfo.name}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {activity.participantsCount}
                              </p>
                              <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                người
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Monthly Chart - Recharts Pie Chart */}
              {reportStats.byMonth.length > 0 && (() => {
                const chartData = reportStats.byMonth.slice(-6)
                  .filter(item => item.count > 0)
                  .map((item, index) => {
                    const [year, month] = item.month.split('-');
                    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('vi-VN', { month: 'short' });
                    const monthColors = [
                      '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'
                    ];
                    return { 
                      name: monthName,
                      value: item.count, 
                      color: monthColors[index % monthColors.length],
                      month: item.month
                    };
                  });
                
                if (chartData.length === 0) {
                  return (
                    <div className={`p-3 rounded-xl shadow-md ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-cyan-500/20' : 'bg-cyan-100'}`}>
                          <LineChart className={`w-4 h-4 text-cyan-600 dark:text-cyan-400`} />
                        </div>
                        <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Hoạt Động Theo Tháng
                        </h3>
                      </div>
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Không có dữ liệu
                        </div>
                      </div>
                    </div>
                  );
                }
                
                const total = chartData.reduce((sum, d) => sum + d.value, 0);
                const pieData = chartData.map(item => ({
                  ...item,
                  percentage: total > 0 ? (item.value / total) * 100 : 0
                }));
                
                const COLORS = pieData.map(d => d.color);
                
                return (
                  <div className={`p-3 rounded-xl shadow-md ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-cyan-500/20' : 'bg-cyan-100'}`}>
                        <LineChart className={`w-4 h-4 text-cyan-600 dark:text-cyan-400`} />
                      </div>
                      <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Hoạt Động Theo Tháng
                      </h3>
                    </div>
                    <div>
                      <ResponsiveContainer width="100%" height={240}>
                        <RechartsPieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry: any) => `${entry.percentage.toFixed(0)}%`}
                            outerRadius={85}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                              border: `2px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`,
                              borderRadius: '8px',
                              color: isDarkMode ? '#f3f4f6' : '#111827',
                              fontSize: '12px',
                              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                            }}
                            formatter={(value: number, name: string, props: any) => [
                              `${value} hoạt động (${props.payload.percentage.toFixed(1)}%)`,
                              props.payload.name
                            ]}
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                            iconType="circle"
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Activities Overview Chart - Recharts ComposedChart */}
          {reportStats && reportStats.activitiesWithDetails && reportStats.activitiesWithDetails.length > 0 && (
            <div className="mb-5">
              <div className={`p-4 rounded-2xl shadow-lg mb-3 border-2 ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' 
                  : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className={`p-2.5 rounded-xl shadow-md ${
                      isDarkMode 
                        ? 'bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border border-emerald-500/30' 
                        : 'bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-200'
                    }`}
                    title="Biểu đồ tổng quan các hoạt động với số lượng tham gia và tỷ lệ"
                  >
                    <BarChart3 className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <div>
                    <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Tổng Quan Các Hoạt Động Được Phân Công
                  </h2>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {reportStats.activitiesWithDetails.length} hoạt động
                    </p>
                  </div>
                </div>
                
                {(() => {
                  // Sử dụng helper function để đảm bảo sắp xếp nhất quán
                  const activities = sortActivitiesByDate(reportStats.activitiesWithDetails!);
                  
                  // Chuẩn bị dữ liệu cho Recharts - đảm bảo dữ liệu khớp với Chi Tiết
                  const chartData = activities.map((activity) => {
                    const temporalStatus = getTemporalStatus(activity);
                    const temporalInfo = getTemporalStatusInfo(temporalStatus);
                    return {
                      name: activity.activityName.length > 15 
                      ? activity.activityName.substring(0, 15) + '...' 
                      : activity.activityName,
                      fullName: activity.activityName, // Tên đầy đủ để hiển thị trong tooltip
                      activityId: activity.activityId, // Đảm bảo activityId khớp
                      totalParticipants: activity.participantsCount, // Khớp với Chi Tiết
                      approvalRate: activity.approval.approvalRate, // Khớp với Chi Tiết
                      attendanceRate: activity.attendance.attendanceRate, // Khớp với Chi Tiết
                      temporalStatus: temporalStatus, // Trạng thái thời gian
                      temporalInfo: temporalInfo // Thông tin visual cho trạng thái
                    };
                  });
                  
                  // Tính max cho Y-axis
                  const maxParticipants = Math.max(...chartData.map(d => d.totalParticipants), 1);
                  const roundedMaxParticipants = Math.ceil(maxParticipants / 10) * 10 || 10;
                  
                  return (
                    <div className="w-full" style={{ position: 'relative', zIndex: 1 }}>
                      <ResponsiveContainer width="100%" height={380}>
                        <ComposedChart
                          data={chartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                          style={{ position: 'relative', zIndex: 1 }}
                              >
                          <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke={isDarkMode ? '#374151' : '#e5e7eb'} 
                            opacity={0.5}
                          />
                          <XAxis 
                            dataKey="name" 
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            tick={{ 
                              fill: isDarkMode ? '#9ca3af' : '#6b7280', 
                              fontSize: 10,
                              fontWeight: 500
                            }}
                            tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                            axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db', strokeWidth: 1.5 }}
                          />
                          <YAxis 
                            yAxisId="left"
                            label={{ 
                              value: 'Số lượng', 
                              angle: -90, 
                              position: 'insideLeft', 
                              style: { 
                                textAnchor: 'middle', 
                                fontSize: '13px', 
                                fill: isDarkMode ? '#9ca3af' : '#6b7280', 
                                fontWeight: '700',
                                letterSpacing: '0.5px'
                              } 
                            }}
                            tick={{ 
                              fill: isDarkMode ? '#9ca3af' : '#6b7280', 
                              fontSize: 11,
                              fontWeight: 500
                            }}
                            tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                            axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db', strokeWidth: 1.5 }}
                            domain={[0, roundedMaxParticipants]}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            label={{ 
                              value: 'Phần trăm (%)', 
                              angle: 90, 
                              position: 'insideRight', 
                              style: { 
                                textAnchor: 'middle', 
                                fontSize: '13px', 
                                fill: isDarkMode ? '#9ca3af' : '#6b7280', 
                                fontWeight: '700',
                                letterSpacing: '0.5px'
                              } 
                            }}
                            tick={{ 
                              fill: isDarkMode ? '#9ca3af' : '#6b7280', 
                              fontSize: 11,
                              fontWeight: 500
                            }}
                            tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                            axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db', strokeWidth: 1.5 }}
                            domain={[0, 100]}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                              border: `2px solid ${isDarkMode ? '#10b981' : '#10b981'}`,
                              borderRadius: '12px',
                              color: isDarkMode ? '#f3f4f6' : '#111827',
                              fontSize: '12px',
                              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                              padding: '0',
                              pointerEvents: 'auto', // Cho phép tương tác với tooltip
                              zIndex: 9999, // Đảm bảo tooltip ở trên cùng
                              position: 'relative'
                            }}
                            wrapperStyle={{
                              pointerEvents: 'auto',
                              zIndex: 9999
                            }}
                            allowEscapeViewBox={{ x: false, y: false }}
                            cursor={{ stroke: isDarkMode ? '#10b981' : '#10b981', strokeWidth: 1 }}
                            content={({ active, payload, label, coordinate }: any) => {
                              if (active && payload && payload.length) {
                                // Tìm dữ liệu gốc từ chartData để đảm bảo giá trị chính xác
                                const data = chartData.find(d => d.name === label || d.fullName === label);
                                
                                // Sử dụng dữ liệu gốc từ chartData thay vì từ payload để đảm bảo chính xác
                                const tooltipDataItems = [
                                  {
                                    label: 'Tổng tham gia',
                                    value: data ? `${data.totalParticipants} người` : 'N/A',
                                    color: '#10b981'
                                  },
                                  {
                                    label: 'Tỷ lệ duyệt',
                                    value: data ? `${data.approvalRate.toFixed(1)}%` : 'N/A',
                                    color: '#f59e0b'
                                  },
                                  {
                                    label: 'Tỷ lệ điểm danh',
                                    value: data ? `${data.attendanceRate.toFixed(1)}%` : 'N/A',
                                    color: '#3b82f6'
                                  }
                                ];
                                
                                const TemporalStatusIcon = data?.temporalInfo?.icon || Clock;
                                  
                                  return (
                                    <div 
                                    className={`p-3 rounded-xl border-2 shadow-xl ${
                                      isDarkMode 
                                        ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-emerald-500/50' 
                                        : 'bg-gradient-to-br from-white to-gray-50 border-emerald-200'
                                    }`}
                                    onMouseEnter={(e) => {
                                      e.stopPropagation();
                                      // Ngăn tooltip đóng khi hover vào
                                    }}
                                    onMouseLeave={(e) => {
                                      e.stopPropagation();
                                    }}
                                    onMouseMove={(e) => {
                                      e.stopPropagation();
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                      style={{ 
                                      pointerEvents: 'auto',
                                      position: 'relative',
                                      zIndex: 10000,
                                      isolation: 'isolate' // Tạo stacking context mới
                                    }}
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <p className={`font-bold text-sm flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {data?.fullName || label}
                                      </p>
                                      {data?.temporalStatus && (
                                        <div 
                                          className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                            isDarkMode 
                                              ? data.temporalInfo.bgColor.replace('0.1', '0.2')
                                              : data.temporalInfo.bgColor
                                          }`}
                                          style={{ 
                                            border: `1px solid ${data.temporalInfo.borderColor}`,
                                            backgroundColor: isDarkMode 
                                              ? data.temporalInfo.bgColor.replace('0.1', '0.2')
                                              : data.temporalInfo.bgColor
                                          }}
                                        >
                                          <TemporalStatusIcon className="w-3 h-3" style={{ color: data.temporalInfo.color }} />
                                          <span 
                                            className="text-[10px] font-semibold"
                                            style={{ color: data.temporalInfo.color }}
                                          >
                                            {data.temporalInfo.name}
                                          </span>
                                            </div>
                                          )}
                                    </div>
                                    <div className="space-y-1.5">
                                      {tooltipDataItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                          <div 
                                            className="w-3 h-3 rounded-full flex-shrink-0" 
                                            style={{ backgroundColor: item.color }}
                                          />
                                          <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {item.label}:
                                          </span>
                                          <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                            {item.value}
                                          </span>
                                        </div>
                                      ))}
                                              </div>
                                    {data && data.activityId && (
                                      <>
                                        <button
                                          type="button"
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            // Giữ tooltip mở
                                            if (data && data.activityId) {
                                              setSelectedActivityId(data.activityId);
                                              setExpandedActivities(prev => new Set([...prev, data.activityId]));
                                              setTimeout(() => {
                                                const element = document.getElementById(`activity-${data.activityId}`);
                                                if (element) {
                                                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                  element.classList.add('ring-2', 'ring-emerald-500', 'ring-offset-2');
                                                  setTimeout(() => {
                                                    element.classList.remove('ring-2', 'ring-emerald-500', 'ring-offset-2');
                                                  }, 2000);
                                                }
                                              }, 100);
                                            }
                                          }}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (data && data.activityId) {
                                              setSelectedActivityId(data.activityId);
                                              setExpandedActivities(prev => new Set([...prev, data.activityId]));
                                              setTimeout(() => {
                                                const element = document.getElementById(`activity-${data.activityId}`);
                                                if (element) {
                                                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                  element.classList.add('ring-2', 'ring-emerald-500', 'ring-offset-2');
                                                  setTimeout(() => {
                                                    element.classList.remove('ring-2', 'ring-emerald-500', 'ring-offset-2');
                                                  }, 2000);
                                                }
                                              }, 100);
                                            }
                                          }}
                                          className={`mt-3 w-full px-3 py-1.5 text-xs font-bold rounded-lg transition-all transform hover:scale-105 cursor-pointer select-none ${
                                            isDarkMode 
                                              ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg' 
                                              : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg'
                                          }`}
                                            style={{ 
                                            pointerEvents: 'auto', 
                                            zIndex: 1001,
                                            position: 'relative',
                                            WebkitUserSelect: 'none',
                                            userSelect: 'none'
                                          }}
                                        >
                                          Xem chi tiết →
                                        </button>
                                        <p className={`mt-1.5 text-[9px] text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                          Hoặc double-click vào cột để xem chi tiết
                                        </p>
                                      </>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ 
                              fontSize: '12px', 
                              paddingTop: '15px',
                              fontWeight: '600'
                            }}
                            iconType="circle"
                            iconSize={10}
                            formatter={(value) => <span style={{ fontWeight: 500 }}>{value}</span>}
                                          />
                          <Bar 
                            yAxisId="left"
                            dataKey="totalParticipants" 
                            name="Tổng tham gia"
                            radius={[8, 8, 0, 0]}
                          >
                            {chartData.map((entry, index) => {
                              // Calculate intensity for visual variation
                              const maxValue = Math.max(...chartData.map(d => d.totalParticipants), 1);
                              const intensity = entry.totalParticipants / maxValue;
                              
                              // Màu sắc dựa trên trạng thái thời gian
                              let barColor = '#10b981'; // Mặc định xanh lá
                              if (entry.temporalStatus === 'upcoming') {
                                barColor = '#f59e0b'; // Cam cho sắp diễn ra
                              } else if (entry.temporalStatus === 'ongoing') {
                                barColor = '#10b981'; // Xanh lá cho đang diễn ra
                              } else if (entry.temporalStatus === 'past') {
                                barColor = '#6b7280'; // Xám cho đã kết thúc
                              }
                              
                              return (
                                <Cell 
                                  key={`cell-${index}`}
                                  fill={barColor}
                                            style={{ 
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    opacity: 0.85 + intensity * 0.15
                                  }}
                                  onMouseEnter={(e: any) => {
                                    if (e.target) {
                                      e.target.style.opacity = '1';
                                      e.target.style.filter = 'brightness(1.1)';
                                    }
                                  }}
                                  onMouseLeave={(e: any) => {
                                    if (e.target) {
                                      e.target.style.opacity = '';
                                      e.target.style.filter = '';
                                    }
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (entry.activityId) {
                                      setSelectedActivityId(entry.activityId);
                                      // Expand activity và scroll đến nó
                                      setExpandedActivities(prev => new Set([...prev, entry.activityId]));
                                      setTimeout(() => {
                                        const element = document.getElementById(`activity-${entry.activityId}`);
                                        if (element) {
                                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          // Highlight effect
                                          element.classList.add('ring-2', 'ring-emerald-500', 'ring-offset-2');
                                          setTimeout(() => {
                                            element.classList.remove('ring-2', 'ring-emerald-500', 'ring-offset-2');
                                          }, 2000);
                                        }
                                      }, 100);
                                    }
                                  }}
                                  onDoubleClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (entry.activityId) {
                                      setSelectedActivityId(entry.activityId);
                                      setExpandedActivities(prev => new Set([...prev, entry.activityId]));
                                      setTimeout(() => {
                                        const element = document.getElementById(`activity-${entry.activityId}`);
                                        if (element) {
                                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          element.classList.add('ring-2', 'ring-emerald-500', 'ring-offset-2');
                                          setTimeout(() => {
                                            element.classList.remove('ring-2', 'ring-emerald-500', 'ring-offset-2');
                                          }, 2000);
                                        }
                                      }, 100);
                                    }
                                  }}
                                />
                                  );
                                })}
                          </Bar>
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="approvalRate" 
                            name="Tỷ lệ duyệt (%)"
                            stroke="#f59e0b"
                            strokeWidth={3.5}
                            dot={{ 
                              fill: '#f59e0b', 
                              r: 6, 
                              strokeWidth: 2.5, 
                              stroke: '#ffffff',
                              cursor: 'pointer',
                              filter: 'drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3))'
                            }}
                            activeDot={{ 
                              r: 9, 
                              strokeWidth: 3, 
                              stroke: '#ffffff',
                              fill: '#f59e0b',
                              cursor: 'pointer',
                              filter: 'drop-shadow(0 4px 8px rgba(245, 158, 11, 0.5))'
                            }}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="attendanceRate" 
                            name="Tỷ lệ điểm danh (%)"
                            stroke="#3b82f6"
                            strokeWidth={3.5}
                            dot={{ 
                              fill: '#3b82f6', 
                              r: 6, 
                              strokeWidth: 2.5, 
                              stroke: '#ffffff',
                              cursor: 'pointer',
                              filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))'
                            }}
                            activeDot={{ 
                              r: 9, 
                              strokeWidth: 3, 
                              stroke: '#ffffff',
                              fill: '#3b82f6',
                              cursor: 'pointer',
                              filter: 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.5))'
                            }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Activities List - Compact Smart Layout */}
          {reportStats && reportStats.activitiesWithDetails && reportStats.activitiesWithDetails.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-4">
                <div 
                  className={`p-2 rounded-lg ${isDarkMode ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20' : 'bg-gradient-to-br from-purple-100 to-blue-100'}`}
                  title="Danh sách chi tiết các hoạt động ngoại khóa được phân công"
                >
                  <Target className={`w-5 h-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Chi Tiết Các Hoạt Động
                </h2>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {reportStats.activitiesWithDetails.length} hoạt động được phân công
                  </p>
              </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Sử dụng cùng helper function để đảm bảo sắp xếp nhất quán với biểu đồ */}
                {sortActivitiesByDate(reportStats.activitiesWithDetails).map((activity) => {
                  const statusInfo = getStatusInfo(activity.activityStatus);
                  const StatusIcon = statusInfo.icon;
                  const isExpanded = expandedActivities.has(activity.activityId);
                  const formatDate = (dateStr?: string) => {
                    if (!dateStr) return 'Chưa có';
                    return new Date(dateStr).toLocaleDateString('vi-VN');
                  };
                  
                  // Xác định trạng thái thời gian
                  const temporalStatus = getTemporalStatus(activity);
                  const temporalInfo = getTemporalStatusInfo(temporalStatus);
                  const TemporalIcon = temporalInfo.icon;
                  
                  const isMultipleDays = activity.activityType === 'multiple_days';
                  const daysCount = isMultipleDays && activity.activityDate && activity.activityEndDate ? (() => {
                    try {
                      const startDate = new Date(activity.activityDate);
                      const endDate = new Date(activity.activityEndDate);
                      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
                      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    } catch {
                      return null;
                    }
                  })() : null;
                  
                  return (
                    <div
                      id={`activity-${activity.activityId}`}
                      key={activity.activityId}
                      className={`rounded-xl border-2 transition-all duration-300 overflow-hidden ${
                        isDarkMode 
                          ? 'bg-gray-800/80' 
                          : 'bg-white'
                      } ${
                        temporalStatus === 'upcoming'
                          ? isDarkMode 
                            ? 'border-amber-500/50 bg-amber-900/10' 
                            : 'border-amber-300 bg-amber-50/30'
                          : temporalStatus === 'ongoing'
                            ? isDarkMode 
                              ? 'border-emerald-500/50 bg-emerald-900/10' 
                              : 'border-emerald-300 bg-emerald-50/30'
                            : isDarkMode 
                              ? 'border-gray-600' 
                              : 'border-gray-300'
                      } ${isExpanded ? 'shadow-xl' : 'shadow-md hover:shadow-lg'} ${
                        selectedActivityId === activity.activityId 
                          ? 'ring-2 ring-emerald-500 ring-offset-2' 
                          : ''
                      }`}
                    >
                      {/* Compact Header */}
                      <div 
                        className={`p-2.5 cursor-pointer transition-all ${
                          isExpanded 
                            ? isDarkMode ? 'bg-gray-750' : 'bg-gray-50'
                            : isDarkMode ? 'hover:bg-gray-750/50' : 'hover:bg-gray-50/50'
                        }`}
                        onClick={() => toggleActivity(activity.activityId)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          {/* Left: Main Info */}
                          <div className="flex-1 min-w-0">
                            {/* Title with badges inline */}
                            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                              <h3 className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {activity.activityName}
                              </h3>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {/* Badge trạng thái thời gian */}
                                <div 
                                  className={`px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                                    isDarkMode 
                                      ? temporalInfo.bgColor 
                                      : temporalInfo.bgColor
                                }`}
                                  style={{ 
                                    border: `1px solid ${temporalInfo.borderColor}`,
                                    backgroundColor: isDarkMode 
                                      ? temporalInfo.bgColor.replace('0.1', '0.2')
                                      : temporalInfo.bgColor
                                  }}
                                  title={temporalInfo.name}
                              >
                                  <TemporalIcon className="w-2.5 h-2.5" style={{ color: temporalInfo.color }} />
                                  <span 
                                    className="text-[9px] font-semibold"
                                    style={{ color: temporalInfo.color }}
                                  >
                                    {temporalInfo.name}
                                  </span>
                                </div>
                                {isMultipleDays ? (
                                  <div title={`Hoạt động nhiều ngày${daysCount ? ` (${daysCount} ngày)` : ''}`}>
                                    <CalendarDays className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                                  </div>
                                ) : (
                                  <div title="Hoạt động 1 ngày">
                                    <Calendar className="w-3 h-3 text-purple-500 dark:text-purple-400" />
                                  </div>
                                )}
                                <div title={`Trạng thái: ${statusInfo.name}`}>
                                  <StatusIcon 
                                    className="w-3 h-3" 
                                    style={{ color: statusInfo.color }}
                                  />
                                </div>
                              </div>
                            </div>
                            
                            {/* Compact Stats - Single Row */}
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              <div className="flex items-center gap-1" title={`Tổng số người tham gia: ${activity.participantsCount}${activity.maxParticipants ? ` / ${activity.maxParticipants} tối đa` : ''}`}>
                                <Users className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                                <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {activity.participantsCount}
                                  {activity.maxParticipants && `/${activity.maxParticipants}`}
                                </span>
                              </div>
                              <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>•</span>
                              {activity.participantsByStatus.pending > 0 && (
                                <>
                                  <div className="flex items-center gap-1" title={`Chờ duyệt: ${activity.participantsByStatus.pending} người`}>
                                    <Clock className="w-3 h-3 text-yellow-500 dark:text-yellow-400" />
                                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                                      {activity.participantsByStatus.pending}
                                    </span>
                                  </div>
                                  <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>•</span>
                                </>
                              )}
                              <div className="flex items-center gap-1" title={`Đã duyệt: ${activity.participantsByStatus.approved} người`}>
                                <UserCheck className="w-3 h-3 text-green-500 dark:text-green-400" />
                                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                                  {activity.participantsByStatus.approved}
                                </span>
                              </div>
                              {activity.participantsByStatus.rejected > 0 && (
                                <>
                                  <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>•</span>
                                  <div className="flex items-center gap-1" title={`Từ chối: ${activity.participantsByStatus.rejected} người`}>
                                    <UserX className="w-3 h-3 text-red-500 dark:text-red-400" />
                                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                                      {activity.participantsByStatus.rejected}
                                    </span>
                              </div>
                                </>
                              )}
                              {activity.participantsByStatus.removed > 0 && (
                                <>
                                  <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>•</span>
                                  <div className="flex items-center gap-1" title={`Đã xóa: ${activity.participantsByStatus.removed} người`}>
                                    <XCircle className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                                      {activity.participantsByStatus.removed}
                                    </span>
                            </div>
                                </>
                              )}
                              <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>•</span>
                              <div className="flex items-center gap-1" title={`Đã điểm danh: ${activity.attendance.checkedIn} người`}>
                                <ClipboardCheck className="w-3 h-3 text-purple-500 dark:text-purple-400" />
                                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                                  {activity.attendance.checkedIn}
                                </span>
                              </div>
                              <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>•</span>
                              <div className="flex items-center gap-1" title={`Tỷ lệ điểm danh: ${activity.attendance.attendanceRate}%`}>
                                <TrendingUp className={`w-3 h-3 ${
                                  activity.attendance.attendanceRate >= 80
                                    ? 'text-green-500 dark:text-green-400'
                                    : activity.attendance.attendanceRate >= 50
                                      ? 'text-yellow-500 dark:text-yellow-400'
                                      : 'text-red-500 dark:text-red-400'
                                }`} />
                                <span className={`font-semibold ${
                                  activity.attendance.attendanceRate >= 80
                                    ? isDarkMode ? 'text-green-400' : 'text-green-600'
                                    : activity.attendance.attendanceRate >= 50
                                      ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                                      : isDarkMode ? 'text-red-400' : 'text-red-600'
                                }`}>
                                  {activity.attendance.attendanceRate}%
                                </span>
                              </div>
                              <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>•</span>
                              <span 
                                className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                                title={`Thời gian: ${isMultipleDays 
                                  ? `${formatDate(activity.activityDate)} - ${formatDate(activity.activityEndDate)}`
                                  : formatDate(activity.activityDate)}`}
                              >
                                {isMultipleDays 
                                    ? `${formatDate(activity.activityDate)} - ${formatDate(activity.activityEndDate)}`
                                    : formatDate(activity.activityDate)}
                                </span>
                            </div>
                          </div>
                          
                          {/* Expand/Collapse Button */}
                          <button className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
                            isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                          }`}>
                            {isExpanded ? (
                              <ChevronUp className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                            ) : (
                              <ChevronDown className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details - Compact Combined Layout */}
                      {isExpanded && (
                        <div className={`border-t ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="p-2.5 space-y-2.5">
                            {/* Combined Charts Section - Side by Side */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {/* Attendance Breakdown - Recharts PieChart */}
                            {activity.participantsByStatus.approved > 0 && (() => {
                              const total = activity.attendance.onTime + activity.attendance.late + activity.attendance.absent;
                              if (total === 0) return null;
                              
                              const pieData = [
                                { 
                                  name: 'Đúng giờ', 
                                  value: activity.attendance.onTime, 
                                  color: '#22c55e',
                                  percentage: activity.attendance.onTimeRate
                                },
                                { 
                                  name: 'Đến trễ', 
                                  value: activity.attendance.late, 
                                  color: '#f59e0b',
                                  percentage: activity.attendance.lateRate
                                },
                                { 
                                  name: isMultipleDays ? 'Vắng mặt (tổng)' : 'Vắng mặt', 
                                  value: activity.attendance.absent, 
                                  color: '#ef4444',
                                  percentage: activity.attendance.absentRate
                                }
                              ].filter(item => item.value > 0);
                              
                              const COLORS = pieData.map(item => item.color);
                              
                              return (
                                <div className={`p-2 rounded-lg ${
                                  isDarkMode ? 'bg-gray-700/30 border border-gray-600' : 'bg-white border border-gray-200'
                                }`}>
                                  <h4 className={`text-[10px] font-semibold mb-2 text-center ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                    {isMultipleDays ? 'Điểm danh (Tổng hợp)' : 'Điểm danh'}
                                  </h4>
                                  <ResponsiveContainer width="100%" height={180}>
                                    <RechartsPieChart>
                                      <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry: any) => `${entry.value}`}
                                        outerRadius={65}
                                        fill="#8884d8"
                                        dataKey="value"
                                      >
                                        {pieData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index]} />
                                        ))}
                                      </Pie>
                                      <Tooltip 
                                        contentStyle={{
                                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                          border: `2px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`,
                                          borderRadius: '6px',
                                          color: isDarkMode ? '#f3f4f6' : '#111827',
                                          fontSize: '11px'
                                        }}
                                        formatter={(value: number, name: string, props: any) => [
                                          `${value} (${props.payload.percentage}%)`,
                                          name
                                        ]}
                                      />
                                      <Legend 
                                        wrapperStyle={{ fontSize: '9px', paddingTop: '5px' }}
                                        iconType="circle"
                                      />
                                    </RechartsPieChart>
                                  </ResponsiveContainer>
                                </div>
                              );
                            })()}
                            
                            {/* Process Flow - Bar Chart */}
                          {(() => {
                              interface ProcessStep {
                                label: string;
                                value: number;
                                max: number;
                                percentage: number;
                                color: string;
                                icon: any;
                              }
                              
                              const processSteps: ProcessStep[] = [];
                            
                            if (activity.registration.maxParticipants) {
                                processSteps.push({
                                  label: 'Đăng ký',
                                  value: activity.registration.totalRegistered,
                                max: activity.registration.maxParticipants,
                                percentage: activity.registration.registrationRate || 0,
                                color: '#3b82f6',
                                icon: Users
                              });
                            }
                            
                            if (activity.registration.totalRegistered > 0) {
                                processSteps.push({
                                label: 'Duyệt',
                                  value: activity.approval.approved,
                                max: activity.registration.totalRegistered,
                                percentage: activity.approval.approvalRate,
                                color: '#22c55e',
                                icon: UserCheck
                              });
                            }
                            
                            if (activity.participantsByStatus.approved > 0) {
                                processSteps.push({
                                  label: isMultipleDays ? 'Điểm danh (tổng)' : 'Điểm danh',
                                  value: activity.attendance.checkedIn,
                                max: activity.participantsByStatus.approved,
                                percentage: activity.attendance.attendanceRate,
                                color: '#a855f7',
                                icon: ClipboardCheck
                              });
                            }
                            
                              if (processSteps.length === 0) return null;
                            
                            return (
                                <div className={`p-2 rounded-lg ${
                                  isDarkMode ? 'bg-gray-700/30 border border-gray-600' : 'bg-white border border-gray-200'
                                }`}>
                                  <h4 className={`text-[10px] font-semibold mb-2 text-center ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                    {isMultipleDays ? 'Quy trình (Tổng hợp)' : 'Quy trình'}
                                  </h4>
                                  <ResponsiveContainer width="100%" height={180}>
                                    <BarChart
                                      data={processSteps.map(step => ({
                                        name: step.label,
                                        'Đã đạt': step.value,
                                        'Tối đa': step.max,
                                        percentage: step.percentage
                                      }))}
                                      margin={{ top: 5, right: 15, left: 5, bottom: 5 }}
                                    >
                                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#4b5563' : '#e5e7eb'} />
                                      <XAxis 
                                        dataKey="name" 
                                        tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                                      />
                                      <YAxis 
                                        tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                                      />
                                      <Tooltip 
                                        contentStyle={{
                                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                          border: `2px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`,
                                          borderRadius: '6px',
                                          color: isDarkMode ? '#f3f4f6' : '#111827',
                                          fontSize: '11px'
                                        }}
                                        formatter={(value: number, name: string, props: any) => {
                                          if (name === 'Đã đạt') {
                                            return [`${value} (${props.payload.percentage}%)`, name];
                                          }
                                          return [value, name];
                                        }}
                                      />
                                      <Legend 
                                        wrapperStyle={{ fontSize: '9px', paddingTop: '5px' }}
                                      />
                                      <Bar 
                                        dataKey="Đã đạt" 
                                        fill={processSteps[0]?.color || '#3b82f6'}
                                        radius={[4, 4, 0, 0]}
                                      >
                                        {processSteps.map((step, index) => (
                                          <Cell key={`cell-${index}`} fill={step.color} />
                                        ))}
                                      </Bar>
                                      <Bar 
                                        dataKey="Tối đa" 
                                        fill={isDarkMode ? '#4b5563' : '#d1d5db'}
                                        radius={[4, 4, 0, 0]}
                                        opacity={0.3}
                                      />
                                    </BarChart>
                                  </ResponsiveContainer>
                              </div>
                            );
                          })()}
                              </div>

                            {/* Participant List - Compact */}
                          {activity.participantsCount > 0 && (
                              <div className={`pt-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const detailsId = `details-${activity.activityId}`;
                                    const chevronId = `chevron-${activity.activityId}`;
                                  const details = document.getElementById(detailsId);
                                    const chevron = document.getElementById(chevronId);
                                  if (details) {
                                      const isHidden = details.classList.contains('hidden');
                                    details.classList.toggle('hidden');
                                      if (chevron) {
                                        if (isHidden) {
                                          chevron.classList.remove('rotate-0');
                                          chevron.classList.add('rotate-180');
                                        } else {
                                          chevron.classList.remove('rotate-180');
                                          chevron.classList.add('rotate-0');
                                        }
                                      }
                                    }
                                }}
                                  className={`w-full flex items-center justify-between px-2 py-1 rounded-lg transition-all text-[10px] ${
                                    isDarkMode 
                                      ? 'bg-gray-700/30 hover:bg-gray-700/50 text-gray-300' 
                                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                  }`}
                              >
                                  <div className="flex items-center gap-1.5">
                                    <div title="Danh sách người tham gia hoạt động">
                                      <Users className="w-3 h-3" />
                                    </div>
                                    <span className="font-semibold">
                                      Danh sách ({activity.participantsCount})
                                    </span>
                                  </div>
                                  <ChevronDown className={`w-3 h-3 transition-transform rotate-0`} id={`chevron-${activity.activityId}`} />
                              </button>
                                <div id={`details-${activity.activityId}`} className="hidden mt-2 space-y-2">
                                  {/* Combined Participant List - Compact */}
                                  <div className="space-y-1.5">
                                    {/* Approved */}
                                {activity.participantDetails.approved.length > 0 && (
                                  <div>
                                        <div className={`flex items-center gap-1 mb-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                                          isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'
                                        }`}>
                                          <div title={`Đã duyệt: ${activity.participantDetails.approved.length} người`}>
                                            <UserCheck className={`w-3 h-3 text-green-500 dark:text-green-400`} />
                                          </div>
                                          <span className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Đã Duyệt ({activity.participantDetails.approved.length})
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {activity.participantDetails.approved.map((participant) => (
                                        <div
                                          key={participant.userId}
                                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                                                isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'
                                          }`}
                                        >
                                          {participant.avatarUrl ? (
                                            <img
                                              src={participant.avatarUrl}
                                              alt={participant.name}
                                              className="w-4 h-4 rounded-full object-cover"
                                            />
                                          ) : (
                                                <Users className={`w-3 h-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                                          )}
                                              <span className={`truncate max-w-[80px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {participant.name}
                                          </span>
                                          {participant.checkedIn && (
                                              <div title="Đã điểm danh">
                                                <CheckSquare className={`w-2.5 h-2.5 flex-shrink-0 text-green-500 dark:text-green-400`} />
                                              </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Pending */}
                                {activity.participantDetails.pending.length > 0 && (
                                  <div>
                                        <div className={`flex items-center gap-1 mb-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                                          isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'
                                        }`}>
                                          <div title={`Chờ duyệt: ${activity.participantDetails.pending.length} người`}>
                                            <Clock className={`w-3 h-3 text-yellow-500 dark:text-yellow-400`} />
                                      </div>
                                          <span className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Chờ Duyệt ({activity.participantDetails.pending.length})
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {activity.participantDetails.pending.map((participant) => (
                                        <div
                                          key={participant.userId}
                                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                                                isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'
                                          }`}
                                        >
                                          {participant.avatarUrl ? (
                                            <img
                                              src={participant.avatarUrl}
                                              alt={participant.name}
                                              className="w-4 h-4 rounded-full object-cover"
                                            />
                                          ) : (
                                                <Users className={`w-3 h-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                                          )}
                                              <span className={`truncate max-w-[80px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {participant.name}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Rejected */}
                                {activity.participantDetails.rejected.length > 0 && (
                                  <div>
                                        <div className={`flex items-center gap-1 mb-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                                          isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'
                                        }`}>
                                          <div title={`Từ chối: ${activity.participantDetails.rejected.length} người`}>
                                            <UserX className={`w-3 h-3 text-red-500 dark:text-red-400`} />
                                          </div>
                                          <span className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Từ Chối ({activity.participantDetails.rejected.length})
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {activity.participantDetails.rejected.map((participant) => (
                                        <div
                                          key={participant.userId}
                                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                                                isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'
                                          }`}
                                        >
                                          {participant.avatarUrl ? (
                                            <img
                                              src={participant.avatarUrl}
                                              alt={participant.name}
                                              className="w-4 h-4 rounded-full object-cover"
                                            />
                                          ) : (
                                                <Users className={`w-3 h-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                                              )}
                                              <span className={`truncate max-w-[80px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                {participant.name}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Removed */}
                                    {activity.participantsByStatus.removed > 0 && (
                                      <div>
                                        <div className={`flex items-center gap-1 mb-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                                          isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'
                                            }`}>
                                          <div title={`Đã xóa: ${activity.participantsByStatus.removed} người`}>
                                            <Trash2 className={`w-3 h-3 text-gray-500 dark:text-gray-400`} />
                                            </div>
                                          <span className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Đã Xóa ({activity.participantsByStatus.removed})
                                          </span>
                                        </div>
                                        {activity.participantDetails.removed && activity.participantDetails.removed.length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                            {activity.participantDetails.removed.map((participant) => (
                                              <div
                                                key={participant.userId}
                                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] opacity-60 ${
                                                  isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'
                                                }`}
                                              >
                                                {participant.avatarUrl ? (
                                                  <img
                                                    src={participant.avatarUrl}
                                                    alt={participant.name}
                                                    className="w-4 h-4 rounded-full object-cover"
                                                  />
                                                ) : (
                                                  <Users className={`w-3 h-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                                                )}
                                                <span className={`truncate max-w-[80px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {participant.name}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                        ) : (
                                          <p className={`text-[9px] ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                            {activity.participantsByStatus.removed} người đã bị xóa khỏi hoạt động
                                          </p>
                                        )}
                                  </div>
                                )}
                                  </div>
                              </div>
                            </div>
                          )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary */}
          {reportStats && (
            <div className={`p-2.5 rounded-lg shadow-sm ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              <div className="flex items-center gap-1.5 mb-2">
                <FileText className={`w-3.5 h-3.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                <h3 className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Tóm Tắt Báo Cáo
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2.5 text-[10px]">
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Thời gian báo cáo</p>
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {getDateRangeLabel()}
                  </p>
                </div>
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Ngày tạo</p>
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {new Date().toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Tổng hoạt động</p>
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {reportStats.totalActivities}
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer isDarkMode={isDarkMode} />

        {/* Preview Export Modal */}
        {showPreviewModal && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setShowPreviewModal(false)}
          >
            <div 
              className={`relative w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              } flex flex-col`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-4 sm:p-6 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                  }`}>
                    <Eye className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Xem Trước Dữ Liệu Xuất
                    </h2>
                    <p className={`text-xs sm:text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Dữ liệu sẽ được xuất dưới dạng Excel (.xlsx)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className={`p-2 rounded-lg transition-all ${
                    isDarkMode 
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Info Bar */}
                <div className={`px-4 sm:px-6 py-2 ${
                  isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                } border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                        {reportStats?.totalActivities || 0} hoạt động
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                        {reportStats?.totalParticipants || 0} người tham gia
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                        {getDateRangeLabel()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-auto p-4 sm:p-6">
                  <pre className={`text-xs sm:text-sm font-mono overflow-auto rounded-lg p-4 whitespace-pre-wrap ${
                    isDarkMode 
                      ? 'bg-gray-900 text-gray-300 border border-gray-700' 
                      : 'bg-gray-50 text-gray-800 border border-gray-200'
                  }`}>
                    {previewData}
                  </pre>
                </div>
              </div>

              {/* Footer Actions */}
              <div className={`flex items-center justify-between p-4 sm:p-6 border-t ${
                isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Info className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Bạn có thể tải xuống file Excel (.xlsx) chứa đầy đủ thông tin
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadFromPreview}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                      isDarkMode
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    } hover:scale-105 shadow-md hover:shadow-lg`}
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Tải xuống Excel</span>
                    <span className="sm:hidden">Tải Excel</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
