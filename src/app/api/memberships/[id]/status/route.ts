import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Membership from '@/models/Membership';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    await dbConnect();

    const { status, rejectionReason } = await request.json();

    if (!status || !['PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Validate rejection reason when status is REJECTED
    if (status === 'REJECTED') {
      if (!rejectionReason || rejectionReason.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Rejection reason is required when status is REJECTED',
          details: 'Vui lòng nhập lý do từ chối'
        }, { status: 400 });
      }
      
      if (rejectionReason.trim().length > 500) {
        return NextResponse.json({ 
          error: 'Rejection reason is too long',
          details: 'Lý do từ chối không được quá 500 ký tự'
        }, { status: 400 });
      }
    }

    const membership = await Membership.findById(params.id);
    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    console.log('Current membership status:', membership.status);
    console.log('New status:', status);
    console.log('User ID:', user.userId);
    console.log('Rejection reason:', rejectionReason);
    console.log('Request body:', { status, rejectionReason });

    // Update status and related fields
    membership.status = status;
    
    if (status === 'ACTIVE') {
      membership.approvedAt = new Date();
      membership.approvedBy = user.userId;
      // Clear rejection data
      membership.rejectedAt = null;
      membership.rejectedBy = null;
      membership.rejectionReason = null;
    } else if (status === 'REJECTED') {
      membership.rejectedAt = new Date();
      membership.rejectedBy = user.userId;
      membership.rejectionReason = rejectionReason;
      // Clear approval data
      membership.approvedAt = null;
      membership.approvedBy = null;
    } else if (status === 'INACTIVE') {
      // Clear all data
      membership.approvedAt = null;
      membership.approvedBy = null;
      membership.rejectedAt = null;
      membership.rejectedBy = null;
      membership.rejectionReason = null;
    } else if (status === 'PENDING') {
      // Clear all approval/rejection data when going back to pending
      membership.approvedAt = null;
      membership.approvedBy = null;
      membership.rejectedAt = null;
      membership.rejectedBy = null;
      membership.rejectionReason = null;
    }

    console.log('About to save membership with status:', membership.status);
    await membership.save();
    console.log('Membership saved successfully');

    return NextResponse.json({
      success: true,
      data: {
        membership: {
          _id: membership._id,
          status: membership.status,
          approvedAt: membership.approvedAt,
          approvedBy: membership.approvedBy,
          rejectedAt: membership.rejectedAt,
          rejectedBy: membership.rejectedBy,
          rejectionReason: membership.rejectionReason,
          updatedAt: membership.updatedAt
        }
      }
    });

  } catch (error: unknown) {
    console.error('Error updating membership status:', error);
    
    // Handle validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      const validationErrors = Object.values((error as any).errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      );
    }

    // Handle duplicate key error
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        { error: 'Duplicate membership found' },
        { status: 409 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update membership status', details: errorMessage }, { status: 500 });
  }
}
