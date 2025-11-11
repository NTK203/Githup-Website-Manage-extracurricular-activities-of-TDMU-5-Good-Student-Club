import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import ContactRequest from '@/models/ContactRequest';
import { verifyToken } from '@/lib/auth';

// Debug imports
console.log('🔍 ContactRequest model imported:', !!ContactRequest);
console.log('🔍 dbConnect function imported:', !!dbConnect);
console.log('🔍 verifyToken function imported:', !!verifyToken);

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Starting POST /api/contact');
    
    // Test database connection first
    try {
      await dbConnect();
      console.log('✅ Database connected');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection failed' 
      }, { status: 500 });
    }

    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      console.log('❌ No token provided');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      console.log('❌ Invalid token');
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    console.log('✅ Token verified for user:', decoded.email);

    const { subject, message } = await request.json();
    console.log('📝 Received data:', { subject, message });

    // Validate input
    if (!subject || !message) {
      console.log('❌ Missing required fields');
      return NextResponse.json({ 
        success: false, 
        error: 'Subject and message are required' 
      }, { status: 400 });
    }

    if (subject.length > 200) {
      console.log('❌ Subject too long');
      return NextResponse.json({ 
        success: false, 
        error: 'Subject must be less than 200 characters' 
      }, { status: 400 });
    }

    if (message.length > 2000) {
      console.log('❌ Message too long');
      return NextResponse.json({ 
        success: false, 
        error: 'Message must be less than 2000 characters' 
      }, { status: 400 });
    }

    console.log('✅ Validation passed, creating contact request');

    // Test if ContactRequest model is available
    if (!ContactRequest) {
      console.error('❌ ContactRequest model is not available');
      return NextResponse.json({ 
        success: false, 
        error: 'ContactRequest model not found' 
      }, { status: 500 });
    }

    // Create contact request
    const contactRequest = new ContactRequest({
      userId: decoded.userId,
      userName: decoded.name,
      userEmail: decoded.email,
      subject: subject.trim(),
      message: message.trim(),
      priority: 'MEDIUM' // Default priority
    });

    console.log('💾 Saving contact request...');
    await contactRequest.save();
    console.log('✅ Contact request saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Contact request submitted successfully',
      data: {
        id: contactRequest._id,
        subject: contactRequest.subject,
        status: contactRequest.status,
        createdAt: contactRequest.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error in POST /api/contact:', error);
    console.error('❌ Error details:', {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Verify authentication and admin role
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    if (!['SUPER_ADMIN', 'CLUB_LEADER'].includes(decoded.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;

    // Get contact requests with pagination
    const [contactRequests, total] = await Promise.all([
      ContactRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('resolvedBy', 'name email')
        .lean(),
      ContactRequest.countDocuments(query)
    ]);

    // Get statistics
    const stats = await ContactRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusStats = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: {
        contactRequests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats: {
          total,
          ...statusStats
        }
      }
    });

  } catch (error) {
    console.error('Error fetching contact requests:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
