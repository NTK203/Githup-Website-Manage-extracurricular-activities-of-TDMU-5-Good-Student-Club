import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Getting responsible persons...');
    console.log('🔍 API: Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Verify authentication
    const user = getUserFromRequest(request);
    if (!user) {
      console.log('❌ API: Unauthorized - no user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ API: User authenticated:', user.role);

    // Connect to database
    await dbConnect();
    console.log('✅ API: Database connected');

    // Get users with roles that can be responsible persons
    const allowedRoles = ['SUPER_ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'];
    console.log('🔍 API: Looking for users with roles:', allowedRoles);
    
    const responsiblePersons = await User.find({
      role: { $in: allowedRoles }
    })
    .select('_id name email role studentId')
    .sort({ name: 1 });

    console.log('✅ API: Found responsible persons:', responsiblePersons.length);
    console.log('📋 API: Responsible persons:', responsiblePersons);

    const response = {
      success: true,
      responsiblePersons
    };

    console.log('✅ API: Sending response:', response);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ API: Get responsible persons error:', error);
    
    return NextResponse.json(
      { error: 'Có lỗi xảy ra khi lấy danh sách người phụ trách' },
      { status: 500 }
    );
  }
}
