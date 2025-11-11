import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Activity from '@/models/Activity';
import { getUserFromRequest } from '@/lib/auth';
import mongoose from 'mongoose';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    // Find and delete the activity
    const deletedActivity = await Activity.findByIdAndDelete(id);
    
    if (!deletedActivity) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy hoạt động' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Đã xóa hoạt động thành công',
      data: { deletedActivity }
    });
    
  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('PUT request started for activity ID:', params.id);
    await dbConnect();
    console.log('Database connected successfully');
    
    // Get user from token
    console.log('Getting user from request...');
    const user = await getUserFromRequest(request);
    console.log('User from request:', user ? 'Found' : 'Not found');
    if (!user) {
      console.log('User not found, returning 401');
      return NextResponse.json(
        { 
          success: false, 
          message: 'Unauthorized',
          details: ['Token không hợp lệ hoặc đã hết hạn']
        },
        { status: 401 }
      );
    }
    
    const { id } = params;
    const body = await request.json();
    
    console.log('PUT request body:', JSON.stringify(body, null, 2));
    console.log('Activity ID:', id);
    
    // Validate required fields
    if (!body.name || !body.description || !body.date || !body.responsiblePerson) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required fields',
          details: ['name', 'description', 'date', 'responsiblePerson'].filter(field => !body[field])
        },
        { status: 400 }
      );
    }
    
    // Find the activity by ID
    console.log('Looking for activity with ID:', id);
    const existingActivity = await Activity.findById(id);
    console.log('Existing activity found:', existingActivity ? 'Yes' : 'No');
    if (!existingActivity) {
      console.log('Activity not found, returning 404');
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy hoạt động' },
        { status: 404 }
      );
    }
    
    // Remove participants from body to preserve existing approval status
    // Participants are managed separately via /api/activities/[id]/participants
    const { participants, ...updateData } = body;
    console.log('Removed participants from update data to preserve approval status');
    
    // Update the activity
    console.log('Updating activity with data:', JSON.stringify(updateData, null, 2));
    const updatedActivity = await Activity.findByIdAndUpdate(
      id,
      {
        ...updateData,
        updatedBy: new mongoose.Types.ObjectId(user.userId),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    console.log('Activity updated successfully:', updatedActivity ? 'Yes' : 'No');
    
    return NextResponse.json({
      success: true,
      message: 'Cập nhật hoạt động thành công',
      data: updatedActivity
    });
    
  } catch (error: any) {
    console.error('Error updating activity:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation error',
          details: validationErrors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        details: error.message,
        error: error.name
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('API: Starting GET request for activity ID:', params.id);
    
    await dbConnect();
    console.log('API: Database connected successfully');
    
    const { id } = params;
    console.log('API: Looking for activity with ID:', id);
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('API: Invalid ObjectId format:', id);
      return NextResponse.json(
        { success: false, message: 'ID không hợp lệ' },
        { status: 400 }
      );
    }
    
    // Find the activity by ID - simplified query first
    const activity = await Activity.findById(id).lean();
    console.log('API: Raw activity found:', activity);
    
    if (!activity) {
      console.log('API: No activity found with ID:', id);
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy hoạt động' },
        { status: 404 }
      );
    }
    
    // Try to populate if activity exists
    let populatedActivity: any = activity;
    try {
      const populated = await Activity.findById(id)
        .populate('responsiblePerson', 'name email')
        .populate('club', 'name')
        .populate('participants.userId', 'name email')
        .lean();
      if (populated) {
        populatedActivity = populated;
      }
      console.log('API: Populated activity:', populatedActivity);
    } catch (populateError) {
      console.log('API: Populate failed, using raw activity:', populateError);
      // Use raw activity if populate fails
    }
    
    return NextResponse.json({
      success: true,
      data: { activity: populatedActivity }
    });
    
  } catch (error: any) {
    console.error('API: Error fetching activity:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
