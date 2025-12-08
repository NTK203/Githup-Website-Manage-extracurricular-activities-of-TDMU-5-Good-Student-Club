import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import Membership from '@/models/Membership';
import { getUserFromRequest } from '@/lib/auth';
import bcrypt from 'bcrypt';

// Batch create users endpoint for admin
export async function POST(request: NextRequest) {
  try {
    // Verify authentication - only SUPER_ADMIN or CLUB_LEADER can use this
    const user = getUserFromRequest(request);
    if (!user || (user.role !== 'CLUB_LEADER' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Hardcoded data for 20 users
    const usersData = [
      // 1️⃣ CLUB_DEPUTY (5 người)
      {
        studentId: '2124802010111',
        name: 'Trần Minh Khôi',
        email: '2124802010111@student.tdmu.edu.vn',
        class: 'D2XCNTT01',
        faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
        role: 'CLUB_DEPUTY',
        isClubMember: true
      },
      {
        studentId: '2124802010222',
        name: 'Nguyễn Thị Lan Anh',
        email: '2124802010222@student.tdmu.edu.vn',
        class: 'D2XCNTT01',
        faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
        role: 'CLUB_DEPUTY',
        isClubMember: true
      },
      {
        studentId: '2124802010333',
        name: 'Lê Hoàng Nam',
        email: '2124802010333@student.tdmu.edu.vn',
        class: 'D2XCNTT02',
        faculty: 'Viện Kỹ Thuật Công Nghệ',
        role: 'CLUB_DEPUTY',
        isClubMember: true
      },
      {
        studentId: '2124802010444',
        name: 'Phạm Gia Huy',
        email: '2124802010444@student.tdmu.edu.vn',
        class: 'D2XCNTT02',
        faculty: 'Viện Kỹ Thuật Công Nghệ',
        role: 'CLUB_DEPUTY',
        isClubMember: true
      },
      {
        studentId: '2124802010555',
        name: 'Võ Ngọc Bích',
        email: '2124802010555@student.tdmu.edu.vn',
        class: 'D2XCNTT03',
        faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
        role: 'CLUB_DEPUTY',
        isClubMember: true
      },
      // 2️⃣ CLUB_MEMBER (5 người)
      {
        studentId: '2124802010666',
        name: 'Nguyễn Đức Thịnh',
        email: '2124802010666@student.tdmu.edu.vn',
        class: 'D2XCNTT03',
        faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
        role: 'CLUB_MEMBER',
        isClubMember: true
      },
      {
        studentId: '2124802010777',
        name: 'Đặng Thu Uyên',
        email: '2124802010777@student.tdmu.edu.vn',
        class: 'D2XCNTT03',
        faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
        role: 'CLUB_MEMBER',
        isClubMember: true
      },
      {
        studentId: '2124802010888',
        name: 'Bùi Anh Tuấn',
        email: '2124802010888@student.tdmu.edu.vn',
        class: 'D2XCNTT04',
        faculty: 'Viện Kỹ Thuật Công Nghệ',
        role: 'CLUB_MEMBER',
        isClubMember: true
      },
      {
        studentId: '2124802010999',
        name: 'Lý Phương Nhi',
        email: '2124802010999@student.tdmu.edu.vn',
        class: 'D2XCNTT04',
        faculty: 'Viện Kỹ Thuật Công Nghệ',
        role: 'CLUB_MEMBER',
        isClubMember: true
      },
      {
        studentId: '2124802010100',
        name: 'Hồ Quang Hậu',
        email: '2124802010100@student.tdmu.edu.vn',
        class: 'D2XCNTT05',
        faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
        role: 'CLUB_MEMBER',
        isClubMember: true
      },
      // 3️⃣ CLUB_STUDENT (5 người)
      {
        studentId: '2124802010112',
        name: 'Trương Thế Bảo',
        email: '2124802010112@student.tdmu.edu.vn',
        class: 'D2XKTPM01',
        faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
        role: 'CLUB_STUDENT',
        isClubMember: true
      },
      {
        studentId: '2124802010113',
        name: 'Nguyễn Khánh Linh',
        email: '2124802010113@student.tdmu.edu.vn',
        class: 'D2XKTPM01',
        faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
        role: 'CLUB_STUDENT',
        isClubMember: true
      },
      {
        studentId: '2124802010114',
        name: 'Phạm Minh Tài',
        email: '2124802010114@student.tdmu.edu.vn',
        class: 'D2XKTPM02',
        faculty: 'Viện Kỹ Thuật Công Nghệ',
        role: 'CLUB_STUDENT',
        isClubMember: true
      },
      {
        studentId: '2124802010115',
        name: 'Lâm Thúy Vy',
        email: '2124802010115@student.tdmu.edu.vn',
        class: 'D2XKTPM02',
        faculty: 'Viện Kỹ Thuật Công Nghệ',
        role: 'CLUB_STUDENT',
        isClubMember: true
      },
      {
        studentId: '2124802010116',
        name: 'Võ Nhật Hào',
        email: '2124802010116@student.tdmu.edu.vn',
        class: 'D2XKTPM03',
        faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
        role: 'CLUB_STUDENT',
        isClubMember: true
      },
      // 4️⃣ STUDENT (không thuộc CLB - 5 người)
      {
        studentId: '2124802010117',
        name: 'Nguyễn Quốc Bảo',
        email: '2124802010117@student.tdmu.edu.vn',
        class: 'D2XQTKD01',
        faculty: 'Trường Kinh Tế Tài Chính',
        role: 'STUDENT',
        isClubMember: false
      },
      {
        studentId: '2124802010118',
        name: 'Lê Thị Mỹ Duyên',
        email: '2124802010118@student.tdmu.edu.vn',
        class: 'D2XQTKD01',
        faculty: 'Trường Kinh Tế Tài Chính',
        role: 'STUDENT',
        isClubMember: false
      },
      {
        studentId: '2124802010119',
        name: 'Phan Hữu Phúc',
        email: '2124802010119@student.tdmu.edu.vn',
        class: 'D2XLUAT01',
        faculty: 'Trường Luật Và Quản Lí Phát Triển',
        role: 'STUDENT',
        isClubMember: false
      },
      {
        studentId: '2124802010120',
        name: 'Trịnh Ngọc Yến',
        email: '2124802010120@student.tdmu.edu.vn',
        class: 'D2XNNANH01',
        faculty: 'Viện Đào Tạo Ngoại Ngữ',
        role: 'STUDENT',
        isClubMember: false
      },
      {
        studentId: '2124802010121',
        name: 'Đoàn Minh Tường',
        email: '2124802010121@student.tdmu.edu.vn',
        class: 'D2XSP01',
        faculty: 'Khoa Sư Phạm',
        role: 'STUDENT',
        isClubMember: false
      }
    ];

    const password = 'Abc@123';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const results = {
      success: [] as any[],
      failed: [] as any[],
      skipped: [] as any[]
    };

    // Process each user
    for (const userData of usersData) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({
          $or: [{ studentId: userData.studentId }, { email: userData.email }]
        });

        if (existingUser) {
          results.skipped.push({
            studentId: userData.studentId,
            name: userData.name,
            reason: 'User already exists'
          });
          continue;
        }

        // Create new user
        const newUser = new User({
          studentId: userData.studentId,
          name: userData.name,
          email: userData.email.toLowerCase(),
          passwordHash: hashedPassword,
          role: userData.role,
          class: userData.class,
          faculty: userData.faculty,
          isClubMember: userData.isClubMember
        });

        await newUser.save();

        // Create membership record for club members
        if (userData.isClubMember) {
          const newMembership = new Membership({
            userId: newUser._id,
            status: 'ACTIVE',
            approvedBy: user.userId
          });
          await newMembership.save();
        }

        results.success.push({
          studentId: userData.studentId,
          name: userData.name,
          email: userData.email,
          role: userData.role
        });

      } catch (error: any) {
        console.error(`Error creating user ${userData.studentId}:`, error);
        results.failed.push({
          studentId: userData.studentId,
          name: userData.name,
          error: error.message || 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã xử lý ${usersData.length} tài khoản`,
      summary: {
        total: usersData.length,
        created: results.success.length,
        skipped: results.skipped.length,
        failed: results.failed.length
      },
      details: results
    });

  } catch (error: any) {
    console.error('Error in batch create users:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to batch create users', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
