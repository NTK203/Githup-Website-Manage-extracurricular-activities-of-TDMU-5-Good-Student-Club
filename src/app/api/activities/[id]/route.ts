import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Activity from '@/models/Activity';
import { getUserFromRequest } from '@/lib/auth';
import mongoose from 'mongoose';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id } = await params;
    
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    // Get user from token
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Unauthorized',
          details: ['Token không hợp lệ hoặc đã hết hạn']
        },
        { status: 401 }
      );
    }
    const body = await request.json();
    
    // Validate required fields based on activity type
    // Ensure type is provided and valid
    if (!body.type || (body.type !== 'single_day' && body.type !== 'multiple_days')) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing or invalid activity type',
          details: ['type must be either "single_day" or "multiple_days"']
        },
        { status: 400 }
      );
    }
    
    const isMultipleDays = body.type === 'multiple_days';
    const missingFields: string[] = [];
    
    if (!body.name) missingFields.push('name');
    if (!body.description) missingFields.push('description');
    // Validate responsiblePerson - can be string (single) or array (multiple)
    if (!body.responsiblePerson || 
        (Array.isArray(body.responsiblePerson) && body.responsiblePerson.length === 0) ||
        (typeof body.responsiblePerson === 'string' && body.responsiblePerson.trim() === '')) {
      missingFields.push('responsiblePerson');
    }
    
    // For single_day, require date; for multiple_days, require startDate and endDate
    if (isMultipleDays) {
      if (!body.startDate) missingFields.push('startDate');
      if (!body.endDate) missingFields.push('endDate');
    } else {
      if (!body.date) missingFields.push('date');
    }
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required fields',
          details: missingFields
        },
        { status: 400 }
      );
    }
    
    // Find the activity by ID
    const existingActivity = await Activity.findById(id);
    if (!existingActivity) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy hoạt động' },
        { status: 404 }
      );
    }
    
    // Remove participants from body to preserve existing approval status
    // Participants are managed separately via /api/activities/[id]/participants
    const { participants, ...updateData } = body;
    
    // Convert date strings to Date objects
    if (updateData.date && typeof updateData.date === 'string') {
      updateData.date = new Date(updateData.date);
    }
    if (updateData.startDate && typeof updateData.startDate === 'string') {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate && typeof updateData.endDate === 'string') {
      updateData.endDate = new Date(updateData.endDate);
    }
    if (updateData.schedule !== undefined && updateData.schedule !== null) {
      if (!Array.isArray(updateData.schedule)) {
        delete updateData.schedule;
      } else {
        try {
          const processedSchedule = updateData.schedule.map((item: any) => {
            if (!item || typeof item !== 'object') {
              return null;
            }
            const scheduleItem: any = { ...item };
            if (item.date) {
              try {
                scheduleItem.date = item.date instanceof Date ? item.date : new Date(item.date);
              } catch (dateError) {
                // Keep original date if conversion fails
              }
            }
            return scheduleItem;
          }).filter((item: any) => item !== null); // Remove null items
          
          // Only update schedule if it has at least one valid item
          if (Array.isArray(processedSchedule) && processedSchedule.length > 0) {
            updateData.schedule = processedSchedule;
          } else {
            delete updateData.schedule;
          }
        } catch (scheduleError: any) {
          // If schedule processing fails, remove it from updateData to avoid validation errors
          delete updateData.schedule;
        }
      }
    }
    
    // For multiple_days, don't set date field (it's optional and may cause validation issues)
    if (updateData.type === 'multiple_days') {
      // Only keep date if it was explicitly provided, otherwise remove it
      if (!body.date) {
        delete updateData.date;
      }
    }
    
    // Parse and validate registrationThreshold
    let registrationThreshold: number | undefined = undefined;
    if (updateData.registrationThreshold !== undefined && updateData.registrationThreshold !== null) {
      const parsed = Number(updateData.registrationThreshold);
      if (!isNaN(parsed)) {
        registrationThreshold = Math.max(0, Math.min(100, parsed));
      }
    }
    
    // Build update payload - explicitly set registrationThreshold if provided
    // Wrap in try-catch to catch any errors during payload construction
    let updatePayload: any;
    try {
      updatePayload = {
        ...updateData,
        updatedBy: new mongoose.Types.ObjectId(user.userId),
        updatedAt: new Date()
      };
      
      // Ensure type is set (required for validation)
      if (!updatePayload.type) {
        // If type is not provided, try to infer from existing activity
        if (existingActivity.type) {
          updatePayload.type = existingActivity.type;
        } else {
          throw new Error('Activity type is required');
        }
      }
      
      // Explicitly preserve description to ensure it's not overwritten
      if (updateData.description !== undefined && updateData.description !== null) {
        updatePayload.description = typeof updateData.description === 'string' 
          ? updateData.description.trim() 
          : updateData.description;
      }
      
      // Explicitly set registrationThreshold if it was provided
      // This ensures the field is updated even if it's 0 or falsy
      if (registrationThreshold !== undefined) {
        updatePayload.registrationThreshold = registrationThreshold;
      }
    } catch (payloadError: any) {
      throw new Error(`Error building update payload: ${payloadError.message}`);
    }
    
    // Build update query using $set operator to ensure proper update
    const $setQuery: any = {};
    
    // Fields that should NOT be updated directly (computed or system fields)
    const excludedFields = ['_id', '__v', '$set', 'id', 'currentParticipantsCount', 'isFull', 'createdAt', 'createdBy', 'participants'];
    
    // Ensure type is defined before processing
    const activityType = updatePayload.type || existingActivity.type;
    if (!activityType || (activityType !== 'single_day' && activityType !== 'multiple_days')) {
      throw new Error('Invalid or missing activity type');
    }
    
    // Ensure participants is never set to undefined or null in update
    // Participants are managed separately, so we exclude them from update
    if ('participants' in updatePayload) {
      delete updatePayload.participants;
    }
    
    // Copy all fields from updatePayload to $set, excluding system fields
    // Also ensure arrays are properly formatted
    // Wrap in try-catch to catch any errors during $setQuery construction
    try {
      Object.keys(updatePayload).forEach(key => {
        try {
          if (!excludedFields.includes(key)) {
            const value = updatePayload[key];
            
            // Ensure arrays are arrays (not undefined or null)
            // For single_day activities, ensure timeSlots is an array (not undefined)
            // For multiple_days activities, ensure schedule is an array (not undefined)
            if (key === 'timeSlots') {
              if (value === null || value === undefined) {
                // For single_day, don't set timeSlots if it's undefined/null
                // This allows Mongoose to keep the existing timeSlots value
                // Setting empty array would fail validation (requires at least 1 item)
                if (activityType === 'single_day') {
                  // Skip - don't update timeSlots if it's undefined/null
                  return;
                } else {
                  // Skip for multiple_days
                  return;
                }
              } else if (!Array.isArray(value)) {
                return;
              } else {
                // Only set timeSlots if it's a valid non-empty array
                if (value.length === 0 && activityType === 'single_day') {
                  return;
                }
                $setQuery[key] = value;
              }
            } else if (key === 'schedule') {
              if (value === null || value === undefined) {
                // For multiple_days, don't set schedule if it's undefined/null
                // This allows Mongoose to keep the existing schedule value
                // Setting empty array would fail validation (requires at least 1 item)
                if (activityType === 'multiple_days') {
                  // Skip - don't update schedule if it's undefined/null
                  return;
                } else {
                  // Skip for single_day
                  return;
                }
              } else if (!Array.isArray(value)) {
                return;
              } else {
                // Only set schedule if it's a valid non-empty array
                if (value.length === 0 && activityType === 'multiple_days') {
                  return;
                }
                $setQuery[key] = value;
              }
            } else if (key === 'multiTimeLocations') {
              if (value === null || value === undefined) {
                // Skip null/undefined arrays - let Mongoose handle defaults
                return;
              }
              if (!Array.isArray(value)) {
                return;
              }
              $setQuery[key] = value;
            } else if (key === 'responsiblePerson') {
              // Handle responsiblePerson - can be string (single) or array (multiple)
              if (value === null || value === undefined) {
                // Skip null/undefined - keep existing value
                return;
              }
              if (Array.isArray(value)) {
                // Filter out invalid values
                const filtered = value.filter((item: any) => 
                  item !== null && 
                  item !== undefined && 
                  (typeof item === 'string' ? item.trim() !== '' : true)
                );
                if (filtered.length === 0) {
                  return;
                }
                $setQuery[key] = filtered;
              } else if (typeof value === 'string' && value.trim() !== '') {
                $setQuery[key] = value.trim();
              } else {
                return;
              }
        } else if (key === 'description') {
          // Explicitly handle description to ensure it's preserved correctly
          if (value === undefined || value === null) {
            return;
          }
          // Ensure description is a string and trim it
          const descriptionValue = typeof value === 'string' ? value.trim() : String(value);
          if (descriptionValue === '') {
            return;
          }
          $setQuery[key] = descriptionValue;
        } else {
          // For other fields, check if value is undefined before setting
          if (value === undefined) {
            return;
          }
          $setQuery[key] = value;
        }
          }
        } catch (fieldError: any) {
          // Skip this field if there's an error
          return;
        }
      });
    } catch (setQueryError: any) {
      throw new Error(`Error building $set query: ${setQueryError.message}`);
    }
    
    // Explicitly set registrationThreshold if provided - this ensures it's updated even if it's 0 or falsy
    if (registrationThreshold !== undefined) {
      $setQuery.registrationThreshold = registrationThreshold;
    }
    
    // Ensure timeSlots and schedule are properly set before validation
    // This prevents validator from accessing .length on undefined
    // Use activityType which is guaranteed to be defined
    if (activityType === 'single_day') {
      // For single_day, ensure timeSlots exists and is an array
      if (!$setQuery.timeSlots || !Array.isArray($setQuery.timeSlots)) {
        // If timeSlots is missing or invalid, don't update it (keep existing value)
        delete $setQuery.timeSlots;
      }
    } else if (activityType === 'multiple_days') {
      // For multiple_days, ensure schedule exists and is an array
      if (!$setQuery.schedule || !Array.isArray($setQuery.schedule)) {
        // If schedule is missing or invalid, don't update it (keep existing value)
        delete $setQuery.schedule;
      }
    }
    
    // Update using findByIdAndUpdate with $set operator
    let updatedActivity;
    try {
      // Remove any undefined values from $setQuery to avoid issues
      Object.keys($setQuery).forEach(key => {
        if ($setQuery[key] === undefined) {
          delete $setQuery[key];
        }
      });
      
      updatedActivity = await Activity.findByIdAndUpdate(
        id,
        { $set: $setQuery },
        { new: true, runValidators: true, setDefaultsOnInsert: false }
      );
    } catch (validationError: any) {
      throw validationError; // Re-throw to be caught by outer catch
    }
    
    if (!updatedActivity) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy hoạt động' },
        { status: 404 }
      );
    }
    
    // Convert to plain object and ensure registrationThreshold is included
    const activityData = updatedActivity.toObject();
    
    // Ensure registrationThreshold is in response (use updated value or existing value)
    if (registrationThreshold !== undefined) {
      activityData.registrationThreshold = registrationThreshold;
    } else if (updatedActivity.registrationThreshold !== undefined) {
      activityData.registrationThreshold = updatedActivity.registrationThreshold;
    } else {
      activityData.registrationThreshold = 80;
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cập nhật hoạt động thành công',
      data: activityData
    });
    
  } catch (error: any) {
    // Check if it's a validation error
    if (error.name === 'ValidationError' && error.errors && typeof error.errors === 'object') {
      try {
        const validationErrors = Object.values(error.errors).map((err: any) => {
          if (err && typeof err === 'object' && 'message' in err) {
            return err.message;
          }
          return String(err);
        });
        return NextResponse.json(
          { 
            success: false, 
            message: 'Validation error',
            details: validationErrors 
          },
          { status: 400 }
        );
      } catch (validationError: any) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Validation error (processing failed)',
            details: [error.message || 'Unknown validation error']
          },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        details: error.message || 'Unknown error',
        error: error.name || 'Error'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'ID không hợp lệ' },
        { status: 400 }
      );
    }
    
    // Find the activity by ID - use findById to get full document with defaults
    const activityDoc = await Activity.findById(id);
    if (!activityDoc) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy hoạt động' },
        { status: 404 }
      );
    }
    
    // Convert to plain object to ensure all fields including defaults are included
    const activity = activityDoc.toObject();
    
    // Try to populate if activity exists
    let populatedActivity: any = activity;
    try {
      const populated = await Activity.findById(id)
        .select('+registrationThreshold') // Explicitly include registrationThreshold
        .populate('responsiblePerson', 'name email avatarUrl')
        .populate('participants.userId', 'name email avatarUrl')
        .populate('participants.rejectedBy', 'name email avatarUrl')
        .populate('participants.removedBy', 'name email avatarUrl')
        .lean();
      if (populated) {
        populatedActivity = populated;
        // Ensure registrationThreshold is included (lean() might not include defaults)
        if (populatedActivity.registrationThreshold === undefined || populatedActivity.registrationThreshold === null) {
          populatedActivity.registrationThreshold = activity.registrationThreshold ?? 80;
        }
      }
    } catch (populateError) {
      // Manual populate if automatic populate fails
      try {
        const User = (await import('@/models/User')).default;
        if (activity.responsiblePerson) {
          const responsiblePerson = await User.findById(activity.responsiblePerson).select('name email avatarUrl').lean();
          populatedActivity.responsiblePerson = responsiblePerson;
        }
        if (activity.participants && Array.isArray(activity.participants)) {
          populatedActivity.participants = await Promise.all(activity.participants.map(async (p: any) => {
            const populatedParticipant: any = { ...p };
            
            // Ensure registeredDaySlots is preserved
            if (p.registeredDaySlots) {
              populatedParticipant.registeredDaySlots = p.registeredDaySlots;
            }
            
            // Populate userId
            if (p.userId) {
              const userId = typeof p.userId === 'object' ? p.userId._id : p.userId;
              const user = await User.findById(userId).select('name email avatarUrl').lean();
              populatedParticipant.userId = user;
            }
            
            // Populate rejectedBy
            if (p.rejectedBy) {
              const rejectedById = typeof p.rejectedBy === 'object' ? p.rejectedBy._id : p.rejectedBy;
              const rejectedByUser = await User.findById(rejectedById).select('name email avatarUrl').lean();
              populatedParticipant.rejectedBy = rejectedByUser;
            }
            
            // Populate removedBy
            if (p.removedBy) {
              const removedById = typeof p.removedBy === 'object' ? p.removedBy._id : p.removedBy;
              const removedByUser = await User.findById(removedById).select('name email avatarUrl').lean();
              populatedParticipant.removedBy = removedByUser;
            }
            
            return populatedParticipant;
          }));
        }
      } catch (manualPopulateError) {
        // Use raw activity if manual populate fails
      }
    }
    
    // Ensure registrationThreshold is always in response
    if (populatedActivity.registrationThreshold === undefined || populatedActivity.registrationThreshold === null) {
      populatedActivity.registrationThreshold = activity.registrationThreshold ?? 80;
    }
    
    // Debug: Log registeredDaySlots in response
    if (populatedActivity.participants && Array.isArray(populatedActivity.participants)) {
      const participantsWithSlots = populatedActivity.participants.filter((p: any) => 
        p.registeredDaySlots && Array.isArray(p.registeredDaySlots) && p.registeredDaySlots.length > 0
      );
      if (participantsWithSlots.length > 0) {
        console.log('🔵 GET Activity - Participants with registeredDaySlots:', {
          activityId: id,
          count: participantsWithSlots.length,
          participants: participantsWithSlots.map((p: any) => ({
            name: p.name,
            userId: p.userId?._id || p.userId,
            registeredDaySlots: p.registeredDaySlots,
            registeredDaySlotsLength: p.registeredDaySlots?.length || 0
          }))
        });
      }
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
