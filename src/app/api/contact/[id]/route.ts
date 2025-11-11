import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ContactRequest from '@/models/ContactRequest';
import { verifyToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const contactRequest = await ContactRequest.findById(params.id)
      .populate('resolvedBy', 'name email')
      .lean();

    if (!contactRequest) {
      return NextResponse.json({ success: false, error: 'Contact request not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: contactRequest
    });

  } catch (error) {
    console.error('Error fetching contact request:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { status, priority, adminNotes } = await request.json();

    const updateData: any = {};
    
    if (status) {
      updateData.status = status;
      if (status === 'RESOLVED' || status === 'CLOSED') {
        updateData.resolvedBy = decoded.userId;
        updateData.resolvedAt = new Date();
      }
    }
    
    if (priority) updateData.priority = priority;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const contactRequest = await ContactRequest.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).populate('resolvedBy', 'name email');

    if (!contactRequest) {
      return NextResponse.json({ success: false, error: 'Contact request not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Contact request updated successfully',
      data: contactRequest
    });

  } catch (error) {
    console.error('Error updating contact request:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
