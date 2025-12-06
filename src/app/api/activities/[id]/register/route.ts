import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Activity from '@/models/Activity';
import Notification from '@/models/Notification';
import { getUserFromRequest } from '@/lib/auth';
import mongoose from 'mongoose';

// POST - Register for activity
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: activityId } = params;
    const body = await request.json();
    const { userId, name, email, role = 'Người Tham Gia', daySlots = [] } = body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(activityId)) {
      return NextResponse.json(
        { success: false, message: 'ID hoạt động không hợp lệ' },
        { status: 400 }
      );
    }

    if (!userId || !name || !email) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // Find the activity
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy hoạt động' },
        { status: 404 }
      );
    }

    // Check if activity is open for registration
    // Allow registration for 'published' and 'ongoing' activities
    // Block registration for 'completed', 'cancelled', 'postponed', and 'draft'
    if (activity.status === 'completed' || activity.status === 'cancelled' || 
        activity.status === 'postponed' || activity.status === 'draft') {
      return NextResponse.json(
        { success: false, message: 'Hoạt động này không còn mở đăng ký' },
        { status: 400 }
      );
    }

    // Check if activity date has passed (only for published activities)
    if (activity.status === 'published') {
      const activityDate = new Date(activity.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // If activity date is in the past, don't allow registration
      if (activityDate < today) {
        return NextResponse.json(
          { success: false, message: 'Hoạt động này đã kết thúc' },
          { status: 400 }
        );
      }
    }

    // Convert userId to ObjectId for comparison
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Check if user is already registered or was removed (to prevent spam)
    const existingParticipant = activity.participants.find((p: any) => {
      const participantUserId = p.userId instanceof mongoose.Types.ObjectId
        ? p.userId.toString()
        : String(p.userId);
      return participantUserId === userObjectId.toString();
    });

    if (existingParticipant) {
      const approvalStatus = existingParticipant.approvalStatus || 'pending';
      
      // If user was removed (not permanently deleted), prevent re-registration to avoid spam
      if (approvalStatus === 'removed') {
        return NextResponse.json(
          { success: false, message: 'Bạn đã bị xóa khỏi hoạt động này. Vui lòng liên hệ ban tổ chức nếu muốn tham gia lại.' },
          { status: 400 }
        );
      }
      
      // If user is already registered with other status (pending, approved, rejected), prevent duplicate registration
      return NextResponse.json(
        { success: false, message: 'Bạn đã đăng ký tham gia hoạt động này rồi' },
        { status: 400 }
      );
    }

    // Check for overlapping time slots with other activities
    // Only check if this is a multiple_days activity with daySlots
    if (activity.type === 'multiple_days' && daySlots && Array.isArray(daySlots) && daySlots.length > 0) {
      // Find all activities where user is registered (approved or pending status)
      const userActivities = await Activity.find({
        'participants.userId': userObjectId,
        _id: { $ne: activityId }, // Exclude current activity
        status: { $in: ['published', 'ongoing'] } // Only check active activities
      }).select('_id name type schedule participants');

      // Check for overlapping slots
      const overlappingActivities: Array<{ activityName: string; day: number; slot: string }> = [];
      
      for (const otherActivity of userActivities) {
        // Find user's participant record in this activity
        const otherParticipant = otherActivity.participants.find((p: any) => {
          const participantUserId = p.userId instanceof mongoose.Types.ObjectId
            ? p.userId.toString()
            : String(p.userId);
          return participantUserId === userObjectId.toString();
        });

        if (!otherParticipant) continue;

        const otherApprovalStatus = otherParticipant.approvalStatus || 'pending';
        // Only check approved or pending registrations (not rejected or removed)
        if (otherApprovalStatus === 'rejected' || otherApprovalStatus === 'removed') {
          continue;
        }

        // Check if other activity is multiple_days
        if (otherActivity.type === 'multiple_days' && otherParticipant.registeredDaySlots && Array.isArray(otherParticipant.registeredDaySlots)) {
          // Check each daySlot in current registration against other activity's registeredDaySlots
          for (const currentDaySlot of daySlots) {
            // Get the actual date for the current daySlot in current activity
            let currentDayDate: Date | null = null;
            if (activity.schedule) {
              const currentScheduleDay = activity.schedule.find((s: any) => {
                const scheduleDayNum = s.day || (activity.schedule.indexOf(s) + 1);
                return scheduleDayNum === currentDaySlot.day;
              });
              if (currentScheduleDay && currentScheduleDay.date) {
                currentDayDate = new Date(currentScheduleDay.date);
                currentDayDate.setHours(0, 0, 0, 0);
              }
            }
            
            // Check if the daySlot overlaps by comparing actual dates, not day numbers
            for (const otherDaySlot of otherParticipant.registeredDaySlots) {
              // Check if same slot (morning/afternoon/evening)
              if (otherDaySlot.slot !== currentDaySlot.slot) continue;
              
              // Get the actual date for this daySlot in other activity
              let otherDayDate: Date | null = null;
              if (otherActivity.schedule) {
                const otherScheduleDay = otherActivity.schedule.find((s: any) => {
                  const scheduleDayNum = s.day || (otherActivity.schedule.indexOf(s) + 1);
                  return scheduleDayNum === otherDaySlot.day;
                });
                if (otherScheduleDay && otherScheduleDay.date) {
                  otherDayDate = new Date(otherScheduleDay.date);
                  otherDayDate.setHours(0, 0, 0, 0);
                }
              }
              
              // Only consider it overlapping if the actual dates match
              if (currentDayDate && otherDayDate && currentDayDate.getTime() === otherDayDate.getTime()) {
                overlappingActivities.push({
                  activityName: otherActivity.name,
                  day: otherDaySlot.day, // Use the actual day number from other activity
                  slot: currentDaySlot.slot
                });
                break; // Found overlap, no need to check other slots
              }
            }
          }
        } else if (otherActivity.type === 'single_day') {
          // For single_day activities, we need to check if the date overlaps with any of the days in current activity
          // Get the date of the single_day activity
          const otherActivityDate = new Date(otherActivity.date);
          otherActivityDate.setHours(0, 0, 0, 0);

          // Check each daySlot in current registration
          for (const currentDaySlot of daySlots) {
            // Find the corresponding day in current activity's schedule
            if (activity.schedule) {
              const scheduleDay = activity.schedule.find((s: any) => {
                const scheduleDayNum = s.day || (activity.schedule.indexOf(s) + 1);
                return scheduleDayNum === currentDaySlot.day;
              });

              if (scheduleDay) {
                const scheduleDate = new Date(scheduleDay.date);
                scheduleDate.setHours(0, 0, 0, 0);

                // If dates match, check if time slots overlap
                if (scheduleDate.getTime() === otherActivityDate.getTime()) {
                  // For single_day activity, we need to check if the slot time overlaps
                  // Since single_day activities don't have registeredDaySlots, we consider it as overlapping if date matches
                  // But we should check the actual time slots to be more precise
                  if (activity.timeSlots && otherActivity.timeSlots) {
                    const currentSlot = activity.timeSlots.find((ts: any) => {
                      const slotName = currentDaySlot.slot === 'morning' ? 'Buổi Sáng' : 
                                      currentDaySlot.slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
                      return ts.name === slotName && ts.isActive;
                    });

                    if (currentSlot) {
                      // Check if any time slot in other activity overlaps with current slot
                      const hasTimeOverlap = otherActivity.timeSlots.some((otherSlot: any) => {
                        if (!otherSlot.isActive) return false;
                        
                        // Parse times
                        const currentStart = currentSlot.startTime.split(':').map(Number);
                        const currentEnd = currentSlot.endTime.split(':').map(Number);
                        const otherStart = otherSlot.startTime.split(':').map(Number);
                        const otherEnd = otherSlot.endTime.split(':').map(Number);

                        const currentStartMinutes = currentStart[0] * 60 + currentStart[1];
                        const currentEndMinutes = currentEnd[0] * 60 + currentEnd[1];
                        const otherStartMinutes = otherStart[0] * 60 + otherStart[1];
                        const otherEndMinutes = otherEnd[0] * 60 + otherEnd[1];

                        // Check if time ranges overlap
                        return !(currentEndMinutes <= otherStartMinutes || currentStartMinutes >= otherEndMinutes);
                      });

                      if (hasTimeOverlap) {
                        overlappingActivities.push({
                          activityName: otherActivity.name,
                          day: currentDaySlot.day,
                          slot: currentDaySlot.slot
                        });
                      }
                    }
                  } else {
                    // If we can't check time slots, consider it overlapping if date matches
                    overlappingActivities.push({
                      activityName: otherActivity.name,
                      day: currentDaySlot.day,
                      slot: currentDaySlot.slot
                    });
                  }
                }
              }
            }
          }
        }
      }

      // If there are overlapping activities, return error
      if (overlappingActivities.length > 0) {
        const uniqueOverlaps = Array.from(
          new Map(overlappingActivities.map(item => [`${item.activityName}-${item.day}-${item.slot}`, item])).values()
        );
        
        const slotNames: { [key: string]: string } = {
          'morning': 'Sáng',
          'afternoon': 'Chiều',
          'evening': 'Tối'
        };

        const overlapMessages = uniqueOverlaps.map(overlap => {
          const slotName = slotNames[overlap.slot] || overlap.slot;
          return `"${overlap.activityName}" (Ngày ${overlap.day}, Buổi ${slotName})`;
        });

        return NextResponse.json(
          { 
            success: false, 
            message: `Bạn đã đăng ký các buổi trùng lặp với hoạt động khác: ${overlapMessages.join(', ')}. Vui lòng chọn các buổi khác hoặc hủy đăng ký hoạt động trùng lặp.` 
          },
          { status: 400 }
        );
      }
    }

    // Check max participants limit - Only count approved participants
    if (activity.maxParticipants && activity.maxParticipants !== Infinity) {
      const approvedCount = activity.participants.filter((p: any) => {
        const approvalStatus = p.approvalStatus || 'pending';
        return approvalStatus === 'approved';
      }).length;
      
      if (approvedCount >= activity.maxParticipants) {
        return NextResponse.json(
          { success: false, message: 'Hoạt động đã đầy người tham gia' },
          { status: 400 }
        );
      }
      
      // Calculate registration rate based on approved participants
      const registrationRate = (approvedCount / activity.maxParticipants) * 100;
      const threshold = activity.registrationThreshold !== undefined && activity.registrationThreshold !== null ? activity.registrationThreshold : 80;
      if (registrationRate >= threshold) {
        return NextResponse.json(
          { success: false, message: `Tỷ lệ đăng ký đã đạt ${Math.round(registrationRate)}%. Chỉ có thể đăng ký khi tỷ lệ dưới ${threshold}%.` },
          { status: 400 }
        );
      }
    }

    // For multiple_days activities, validate daySlots
    if (activity.type === 'multiple_days' && daySlots && Array.isArray(daySlots) && daySlots.length > 0) {
      // Validate each daySlot
      for (const daySlot of daySlots) {
        if (!daySlot.day || !daySlot.slot) {
          return NextResponse.json(
            { success: false, message: 'Thông tin ngày và buổi không hợp lệ' },
            { status: 400 }
          );
        }
        
        // Check if day exists in schedule
        if (activity.schedule) {
          const dayExists = activity.schedule.some((s: any) => {
            const scheduleDay = s.day || (activity.schedule.indexOf(s) + 1);
            return scheduleDay === daySlot.day;
          });
          
          if (!dayExists) {
            return NextResponse.json(
              { success: false, message: `Ngày ${daySlot.day} không tồn tại trong lịch trình hoạt động` },
              { status: 400 }
            );
          }
        }
      }
    }

    // Log incoming data
    console.log('🔵 REGISTER - Incoming request:', {
      activityId: activity._id,
      activityType: activity.type,
      userId: userId,
      userName: name,
      daySlots: daySlots,
      daySlotsType: typeof daySlots,
      daySlotsIsArray: Array.isArray(daySlots),
      daySlotsLength: daySlots?.length || 0
    });

    // Add participant with pending approval status
    const newParticipant: any = {
      userId: userObjectId,
      name: name,
      email: email,
      role: role,
      joinedAt: new Date(),
      approvalStatus: 'pending'
    };

    // Store daySlots for multiple_days activities
    if (activity.type === 'multiple_days' && daySlots && Array.isArray(daySlots) && daySlots.length > 0) {
      // Validate daySlots structure
      const validDaySlots = daySlots.filter((ds: any) => 
        ds && typeof ds.day === 'number' && ds.slot && ['morning', 'afternoon', 'evening'].includes(ds.slot)
      );
      
      if (validDaySlots.length > 0) {
        newParticipant.registeredDaySlots = validDaySlots;
        console.log('✅ REGISTER - Valid daySlots found, assigning to newParticipant:', {
          activityId: activity._id,
          activityType: activity.type,
          userId: userId,
          userName: name,
          validDaySlots: validDaySlots,
          validDaySlotsLength: validDaySlots.length,
          newParticipantBeforePush: { ...newParticipant }
        });
      } else {
        console.log('⚠️ REGISTER - Invalid daySlots format:', {
          activityId: activity._id,
          daySlots: daySlots,
          daySlotsType: typeof daySlots,
          daySlotsIsArray: Array.isArray(daySlots)
        });
      }
    } else {
      console.log('🔵 REGISTER - No daySlots to store:', {
        activityId: activity._id,
        activityType: activity.type,
        userId: userId,
        userName: name,
        daySlotsProvided: !!daySlots,
        daySlotsIsArray: Array.isArray(daySlots),
        daySlotsLength: daySlots?.length || 0
      });
    }

    console.log('🔵 REGISTER - newParticipant before push:', {
      ...newParticipant,
      registeredDaySlots: newParticipant.registeredDaySlots,
      hasRegisteredDaySlots: !!newParticipant.registeredDaySlots
    });

    // Push new participant to array
    activity.participants.push(newParticipant);
    
    // Get the index of the newly added participant
    const participantIndex = activity.participants.length - 1;
    const addedParticipant = activity.participants[participantIndex];
    
    // Mark participants array as modified to ensure Mongoose saves the new participant with registeredDaySlots
    activity.markModified('participants');
    
    // Also explicitly mark registeredDaySlots as modified if it exists
    if (addedParticipant && addedParticipant.registeredDaySlots) {
      // Mark the entire participants array
      activity.markModified('participants');
      // Also mark the specific subdocument field
      activity.markModified(`participants.${participantIndex}.registeredDaySlots`);
      console.log('✅ REGISTER - Marked registeredDaySlots as modified:', {
        participantIndex,
        registeredDaySlots: addedParticipant.registeredDaySlots,
        registeredDaySlotsLength: addedParticipant.registeredDaySlots.length
      });
    }

    console.log('🔵 REGISTER - About to save activity:', {
      participantsCount: activity.participants.length,
      lastParticipantHasRegisteredDaySlots: addedParticipant?.registeredDaySlots ? true : false,
      lastParticipantRegisteredDaySlots: addedParticipant?.registeredDaySlots,
      lastParticipantRegisteredDaySlotsLength: addedParticipant?.registeredDaySlots?.length || 0
    });

    // Save with validation
    try {
      await activity.save({ validateBeforeSave: true });
      console.log('✅ REGISTER - Activity saved successfully');
    } catch (saveError: any) {
      console.error('❌ REGISTER - Error saving activity:', {
        error: saveError.message,
        errors: saveError.errors,
        stack: saveError.stack
      });
      throw saveError;
    }
    
    // Verify saved data - Use lean() to get plain object
    const savedActivityRaw = await Activity.findById(activityId).lean();
    const savedActivity = savedActivityRaw as any;
    if (savedActivity && Array.isArray(savedActivity.participants)) {
      const savedParticipant = savedActivity.participants.find((p: any) => {
        const pUserId = p.userId instanceof mongoose.Types.ObjectId
          ? p.userId.toString()
          : (typeof p.userId === 'object' && p.userId !== null ? String(p.userId) : String(p.userId));
        return pUserId === userObjectId.toString();
      });
      
      if (savedParticipant) {
        console.log('✅ REGISTER - Verification after save:', {
          activityId: activity._id,
          userId: userId,
          userName: name,
          hasRegisteredDaySlots: !!savedParticipant.registeredDaySlots,
          registeredDaySlots: savedParticipant.registeredDaySlots,
          registeredDaySlotsLength: savedParticipant.registeredDaySlots?.length || 0,
          savedParticipantKeys: Object.keys(savedParticipant)
        });
      } else {
        console.log('⚠️ REGISTER - Saved participant not found after save');
      }
    } else {
      console.log('⚠️ REGISTER - Saved activity not found after save or participants is not an array');
    }

    // Send notification to responsible officer
    try {
      if (activity.responsiblePerson) {
        const officerId = activity.responsiblePerson instanceof mongoose.Types.ObjectId
          ? activity.responsiblePerson
          : new mongoose.Types.ObjectId(activity.responsiblePerson);

        // Only send notification if officer is different from the registering user
        if (!officerId.equals(userObjectId)) {
          await Notification.createForUsers(
            [officerId],
            {
              title: 'Có thành viên mới đăng ký tham gia',
              message: `${name} đã đăng ký tham gia hoạt động "${activity.name}". Vui lòng xem xét và duyệt đăng ký.`,
              type: 'info',
              relatedType: 'activity',
              relatedId: activity._id,
              createdBy: userObjectId
            }
          );
        }
      }
    } catch (notificationError) {
      // Log error but don't fail the registration
      console.error('Error sending notification to officer:', notificationError);
    }

    return NextResponse.json({
      success: true,
      message: 'Đăng ký tham gia hoạt động thành công',
      data: {
        activityId: activity._id,
        participantCount: activity.participants.length
      }
    });

  } catch (error: any) {
    console.error('Error registering for activity:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Lỗi khi đăng ký tham gia hoạt động',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// DELETE - Unregister from activity
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: activityId } = params;
    const body = await request.json();
    const { userId } = body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(activityId)) {
      return NextResponse.json(
        { success: false, message: 'ID hoạt động không hợp lệ' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu userId' },
        { status: 400 }
      );
    }

    // Find the activity
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy hoạt động' },
        { status: 404 }
      );
    }

    // Convert userId to ObjectId for comparison
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find and remove participant
    const participantIndex = activity.participants.findIndex((p: any) => {
      const participantUserId = p.userId instanceof mongoose.Types.ObjectId
        ? p.userId.toString()
        : String(p.userId);
      return participantUserId === userObjectId.toString();
    });

    if (participantIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Bạn chưa đăng ký tham gia hoạt động này' },
        { status: 400 }
      );
    }

    // Remove participant
    activity.participants.splice(participantIndex, 1);
    await activity.save();

    return NextResponse.json({
      success: true,
      message: 'Đã hủy đăng ký tham gia hoạt động thành công',
      data: {
        activityId: activity._id,
        participantCount: activity.participants.length
      }
    });

  } catch (error: any) {
    console.error('Error unregistering from activity:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Lỗi khi hủy đăng ký tham gia hoạt động',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// PATCH - Update registeredDaySlots for a participant
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: activityId } = params;
    const body = await request.json();
    const { userId, daySlots = [] } = body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(activityId)) {
      return NextResponse.json(
        { success: false, message: 'ID hoạt động không hợp lệ' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu userId' },
        { status: 400 }
      );
    }

    // Find the activity
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy hoạt động' },
        { status: 404 }
      );
    }

    // Only allow for multiple_days activities
    if (activity.type !== 'multiple_days') {
      return NextResponse.json(
        { success: false, message: 'Chỉ có thể cập nhật buổi đăng ký cho hoạt động nhiều ngày' },
        { status: 400 }
      );
    }

    // Convert userId to ObjectId for comparison
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find participant
    const participantIndex = activity.participants.findIndex((p: any) => {
      const participantUserId = p.userId instanceof mongoose.Types.ObjectId
        ? p.userId.toString()
        : String(p.userId);
      return participantUserId === userObjectId.toString();
    });

    if (participantIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Bạn chưa đăng ký tham gia hoạt động này' },
        { status: 400 }
      );
    }

    // Validate daySlots structure
    if (daySlots && Array.isArray(daySlots) && daySlots.length > 0) {
      const validDaySlots = daySlots.filter((ds: any) => 
        ds && typeof ds.day === 'number' && ds.slot && ['morning', 'afternoon', 'evening'].includes(ds.slot)
      );
      
      // Check for overlapping time slots with other activities (same logic as POST)
      const userActivities = await Activity.find({
        'participants.userId': userObjectId,
        _id: { $ne: activityId }, // Exclude current activity
        status: { $in: ['published', 'ongoing'] } // Only check active activities
      }).select('_id name type schedule participants');

      // Check for overlapping slots
      const overlappingActivities: Array<{ activityName: string; day: number; slot: string }> = [];
      
      for (const otherActivity of userActivities) {
        // Find user's participant record in this activity
        const otherParticipant = otherActivity.participants.find((p: any) => {
          const participantUserId = p.userId instanceof mongoose.Types.ObjectId
            ? p.userId.toString()
            : String(p.userId);
          return participantUserId === userObjectId.toString();
        });

        if (!otherParticipant) continue;

        const otherApprovalStatus = otherParticipant.approvalStatus || 'pending';
        // Only check approved or pending registrations (not rejected or removed)
        if (otherApprovalStatus === 'rejected' || otherApprovalStatus === 'removed') {
          continue;
        }

        // Check if other activity is multiple_days
        if (otherActivity.type === 'multiple_days' && otherParticipant.registeredDaySlots && Array.isArray(otherParticipant.registeredDaySlots)) {
          // Check each daySlot in current registration against other activity's registeredDaySlots
          for (const currentDaySlot of validDaySlots) {
            // Get the actual date for the current daySlot in current activity
            let currentDayDate: Date | null = null;
            if (activity.schedule) {
              const currentScheduleDay = activity.schedule.find((s: any) => {
                const scheduleDayNum = s.day || (activity.schedule.indexOf(s) + 1);
                return scheduleDayNum === currentDaySlot.day;
              });
              if (currentScheduleDay && currentScheduleDay.date) {
                currentDayDate = new Date(currentScheduleDay.date);
                currentDayDate.setHours(0, 0, 0, 0);
              }
            }
            
            // Check if the daySlot overlaps by comparing actual dates, not day numbers
            for (const otherDaySlot of otherParticipant.registeredDaySlots) {
              // Check if same slot (morning/afternoon/evening)
              if (otherDaySlot.slot !== currentDaySlot.slot) continue;
              
              // Get the actual date for this daySlot in other activity
              let otherDayDate: Date | null = null;
              if (otherActivity.schedule) {
                const otherScheduleDay = otherActivity.schedule.find((s: any) => {
                  const scheduleDayNum = s.day || (otherActivity.schedule.indexOf(s) + 1);
                  return scheduleDayNum === otherDaySlot.day;
                });
                if (otherScheduleDay && otherScheduleDay.date) {
                  otherDayDate = new Date(otherScheduleDay.date);
                  otherDayDate.setHours(0, 0, 0, 0);
                }
              }
              
              // Only consider it overlapping if the actual dates match
              if (currentDayDate && otherDayDate && currentDayDate.getTime() === otherDayDate.getTime()) {
                overlappingActivities.push({
                  activityName: otherActivity.name,
                  day: otherDaySlot.day, // Use the actual day number from other activity
                  slot: currentDaySlot.slot
                });
                break; // Found overlap, no need to check other slots
              }
            }
          }
        } else if (otherActivity.type === 'single_day') {
          // For single_day activities, check if date overlaps with any of the days in current activity
          const otherActivityDate = new Date(otherActivity.date);
          otherActivityDate.setHours(0, 0, 0, 0);

          // Check each daySlot in current registration
          for (const currentDaySlot of validDaySlots) {
            // Find the corresponding day in current activity's schedule
            if (activity.schedule) {
              const scheduleDay = activity.schedule.find((s: any) => {
                const scheduleDayNum = s.day || (activity.schedule.indexOf(s) + 1);
                return scheduleDayNum === currentDaySlot.day;
              });

              if (scheduleDay) {
                const scheduleDate = new Date(scheduleDay.date);
                scheduleDate.setHours(0, 0, 0, 0);

                // If dates match, check if time slots overlap
                if (scheduleDate.getTime() === otherActivityDate.getTime()) {
                  // Check the actual time slots to be more precise
                  if (activity.timeSlots && otherActivity.timeSlots) {
                    const currentSlot = activity.timeSlots.find((ts: any) => {
                      const slotName = currentDaySlot.slot === 'morning' ? 'Buổi Sáng' : 
                                      currentDaySlot.slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
                      return ts.name === slotName && ts.isActive;
                    });

                    if (currentSlot) {
                      // Check if any time slot in other activity overlaps with current slot
                      const hasTimeOverlap = otherActivity.timeSlots.some((otherSlot: any) => {
                        if (!otherSlot.isActive) return false;
                        
                        // Parse times
                        const currentStart = currentSlot.startTime.split(':').map(Number);
                        const currentEnd = currentSlot.endTime.split(':').map(Number);
                        const otherStart = otherSlot.startTime.split(':').map(Number);
                        const otherEnd = otherSlot.endTime.split(':').map(Number);

                        const currentStartMinutes = currentStart[0] * 60 + currentStart[1];
                        const currentEndMinutes = currentEnd[0] * 60 + currentEnd[1];
                        const otherStartMinutes = otherStart[0] * 60 + otherStart[1];
                        const otherEndMinutes = otherEnd[0] * 60 + otherEnd[1];

                        // Check if time ranges overlap
                        return !(currentEndMinutes <= otherStartMinutes || currentStartMinutes >= otherEndMinutes);
                      });

                      if (hasTimeOverlap) {
                        overlappingActivities.push({
                          activityName: otherActivity.name,
                          day: currentDaySlot.day,
                          slot: currentDaySlot.slot
                        });
                      }
                    }
                  } else {
                    // If we can't check time slots, consider it overlapping if date matches
                    overlappingActivities.push({
                      activityName: otherActivity.name,
                      day: currentDaySlot.day,
                      slot: currentDaySlot.slot
                    });
                  }
                }
              }
            }
          }
        }
      }

      // If there are overlapping activities, return error
      if (overlappingActivities.length > 0) {
        const uniqueOverlaps = Array.from(
          new Map(overlappingActivities.map(item => [`${item.activityName}-${item.day}-${item.slot}`, item])).values()
        );
        
        const slotNames: { [key: string]: string } = {
          'morning': 'Sáng',
          'afternoon': 'Chiều',
          'evening': 'Tối'
        };

        const overlapMessages = uniqueOverlaps.map(overlap => {
          const slotName = slotNames[overlap.slot] || overlap.slot;
          return `"${overlap.activityName}" (Ngày ${overlap.day}, Buổi ${slotName})`;
        });

        return NextResponse.json(
          { 
            success: false, 
            message: `Bạn đã đăng ký các buổi trùng lặp với hoạt động khác: ${overlapMessages.join(', ')}. Vui lòng chọn các buổi khác hoặc hủy đăng ký hoạt động trùng lặp.` 
          },
          { status: 400 }
        );
      }
      
      // Update registeredDaySlots
      activity.participants[participantIndex].registeredDaySlots = validDaySlots;
    } else {
      // Clear registeredDaySlots if empty array
      activity.participants[participantIndex].registeredDaySlots = [];
    }

    // Mark as modified
    activity.markModified('participants');
    activity.markModified(`participants.${participantIndex}.registeredDaySlots`);

    await activity.save();

    return NextResponse.json({
      success: true,
      message: 'Cập nhật buổi đăng ký thành công',
      data: {
        activityId: activity._id,
        registeredDaySlots: activity.participants[participantIndex].registeredDaySlots
      }
    });

  } catch (error: any) {
    console.error('Error updating registeredDaySlots:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Lỗi khi cập nhật buổi đăng ký',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

