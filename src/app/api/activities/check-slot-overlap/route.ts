import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Activity from '@/models/Activity';
import { getUserFromRequest } from '@/lib/auth';
import mongoose from 'mongoose';

// POST - Check if a daySlot overlaps with other registered activities
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { activityId, day, slot, schedule, userId } = body;

    if (!activityId || day === undefined || !slot) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(activityId)) {
      return NextResponse.json(
        { success: false, message: 'ID hoạt động không hợp lệ' },
        { status: 400 }
      );
    }

    // Use provided userId (for officer updating participant) or current user's userId
    const userObjectId = userId 
      ? new mongoose.Types.ObjectId(userId)
      : new mongoose.Types.ObjectId(user.userId);

    // Find the current activity to get schedule info
    const currentActivity = await Activity.findById(activityId).select('type schedule timeSlots date');
    if (!currentActivity) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy hoạt động' },
        { status: 404 }
      );
    }

    // Find all activities where the user (or specified userId) is registered (approved or pending status)
    const userActivities = await Activity.find({
      'participants.userId': userObjectId,
      _id: { $ne: activityId }, // Exclude current activity
      status: { $in: ['published', 'ongoing'] } // Only check active activities
    }).select('_id name type schedule participants date timeSlots');

    console.log('🔍 CHECK OVERLAP - Current activity:', {
      activityId: activityId,
      type: currentActivity.type,
      day: day,
      slot: slot,
      hasSchedule: !!currentActivity.schedule,
      hasDate: !!currentActivity.date,
      hasTimeSlots: !!currentActivity.timeSlots
    });

    console.log('🔍 CHECK OVERLAP - Found user activities:', userActivities.length);

    // Check for overlapping slots
    const overlappingActivities: Array<{ 
      activityName: string; 
      day: number; 
      slot: string; 
      date?: string;
      startTime?: string;
      endTime?: string;
    }> = [];
    
    // Get current activity's slot time for comparison
    let currentSlotStartTime: string | undefined;
    let currentSlotEndTime: string | undefined;
    if (currentActivity.timeSlots) {
      const slotName = slot === 'morning' ? 'Buổi Sáng' : 
                      slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
      const currentSlot = currentActivity.timeSlots.find((ts: any) => ts.name === slotName && ts.isActive);
      if (currentSlot) {
        currentSlotStartTime = currentSlot.startTime;
        currentSlotEndTime = currentSlot.endTime;
      }
    }
    
    // Get the actual date for the selected day in current activity (calculate once outside the loop)
    let currentDayDate: Date | null = null;
    if (currentActivity.type === 'multiple_days' && currentActivity.schedule) {
      const currentScheduleDay = currentActivity.schedule.find((s: any) => {
        const scheduleDayNum = s.day || (currentActivity.schedule.indexOf(s) + 1);
        return scheduleDayNum === day;
      });
      if (currentScheduleDay && currentScheduleDay.date) {
        currentDayDate = new Date(currentScheduleDay.date);
        currentDayDate.setHours(0, 0, 0, 0);
      }
    } else if (currentActivity.type === 'single_day' && currentActivity.date) {
      currentDayDate = new Date(currentActivity.date);
      currentDayDate.setHours(0, 0, 0, 0);
    }

    console.log('🔍 CHECK OVERLAP - Current day date:', currentDayDate ? currentDayDate.toISOString() : 'null');

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
        // Check if the daySlot overlaps by comparing actual dates, not day numbers
        for (const otherDaySlot of otherParticipant.registeredDaySlots) {
          // Check if same slot (morning/afternoon/evening)
          if (otherDaySlot.slot !== slot) continue;
          
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
            // Get the date for this day from schedule
            let dayDate: string | undefined;
            let otherSlotStartTime: string | undefined;
            let otherSlotEndTime: string | undefined;
            
            if (otherActivity.schedule) {
              const scheduleDay = otherActivity.schedule.find((s: any) => {
                const scheduleDayNum = s.day || (otherActivity.schedule.indexOf(s) + 1);
                return scheduleDayNum === otherDaySlot.day;
              });
              if (scheduleDay) {
                dayDate = scheduleDay.date;
              }
            }
            
            // Get time slot info from other activity
            if (otherActivity.timeSlots) {
              const slotName = slot === 'morning' ? 'Buổi Sáng' : 
                              slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
              const otherSlot = otherActivity.timeSlots.find((ts: any) => ts.name === slotName && ts.isActive);
              if (otherSlot) {
                otherSlotStartTime = otherSlot.startTime;
                otherSlotEndTime = otherSlot.endTime;
              }
            }
            
            overlappingActivities.push({
              activityName: otherActivity.name,
              day: otherDaySlot.day, // Use the actual day number from other activity
              slot: slot,
              date: dayDate,
              startTime: otherSlotStartTime || currentSlotStartTime,
              endTime: otherSlotEndTime || currentSlotEndTime
            });
            break; // Found overlap, no need to check other slots
          }
        }
      } else if (otherActivity.type === 'single_day') {
        // For single_day activities, check if date overlaps
        const otherActivityDate = new Date(otherActivity.date);
        otherActivityDate.setHours(0, 0, 0, 0);

        // currentDayDate is already calculated above
        // If dates match, check if time slots overlap
        if (currentDayDate && currentDayDate.getTime() === otherActivityDate.getTime()) {
          // For single_day, check which slots the user has registered
          const otherRegisteredSlots = otherParticipant.registeredDaySlots && Array.isArray(otherParticipant.registeredDaySlots) && otherParticipant.registeredDaySlots.length > 0
            ? otherParticipant.registeredDaySlots.map((ds: any) => ds.slot)
            : [];
          
          // If user has registered this slot in the single_day activity, OR if no registeredDaySlots (backward compatibility), check time overlap
          if (otherRegisteredSlots.length === 0 || otherRegisteredSlots.includes(slot)) {
            // Check the actual time slots to be more precise
            if (currentActivity.timeSlots && otherActivity.timeSlots) {
              const slotName = slot === 'morning' ? 'Buổi Sáng' : 
                              slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
              const currentSlot = currentActivity.timeSlots.find((ts: any) => {
                return ts.name === slotName && ts.isActive;
              });
              const otherSlot = otherActivity.timeSlots.find((ts: any) => {
                return ts.name === slotName && ts.isActive;
              });

              if (currentSlot && otherSlot) {
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
                const hasTimeOverlap = !(currentEndMinutes <= otherStartMinutes || currentStartMinutes >= otherEndMinutes);

                if (hasTimeOverlap) {
                  overlappingActivities.push({
                    activityName: otherActivity.name,
                    day: currentActivity.type === 'single_day' ? 1 : day,
                    slot: slot,
                    date: otherActivity.date,
                    startTime: otherSlot.startTime,
                    endTime: otherSlot.endTime
                  });
                }
              } else {
                // If we can't find specific slots, consider it overlapping if date and slot match
                overlappingActivities.push({
                  activityName: otherActivity.name,
                  day: currentActivity.type === 'single_day' ? 1 : day,
                  slot: slot,
                  date: otherActivity.date,
                  startTime: currentSlotStartTime,
                  endTime: currentSlotEndTime
                });
              }
            } else {
              // If we can't check time slots, consider it overlapping if date and slot match
              overlappingActivities.push({
                activityName: otherActivity.name,
                day: currentActivity.type === 'single_day' ? 1 : day,
                slot: slot,
                date: otherActivity.date,
                startTime: currentSlotStartTime,
                endTime: currentSlotEndTime
              });
            }
          }
        }
      }
      
      // Also check if current activity is single_day and other is multiple_days
      // Note: currentDayDate is already calculated above, so we can use it here
      if (currentActivity.type === 'single_day' && otherActivity.type === 'multiple_days' && otherParticipant.registeredDaySlots && Array.isArray(otherParticipant.registeredDaySlots) && otherParticipant.registeredDaySlots.length > 0) {
        // Check if any registered day slot in other activity matches current activity's date
        for (const otherDaySlot of otherParticipant.registeredDaySlots) {
          if (otherDaySlot.slot !== slot) continue;
          
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
          
          // If dates match (using currentDayDate which is already calculated), check time overlap
          if (otherDayDate && currentDayDate && currentDayDate.getTime() === otherDayDate.getTime()) {
            if (currentActivity.timeSlots && otherActivity.timeSlots) {
              const slotName = slot === 'morning' ? 'Buổi Sáng' : 
                              slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
              const currentSlot = currentActivity.timeSlots.find((ts: any) => {
                return ts.name === slotName && ts.isActive;
              });
              
              if (currentSlot) {
                const otherSlot = otherActivity.timeSlots.find((ts: any) => {
                  return ts.name === slotName && ts.isActive;
                });
                
                if (otherSlot) {
                  // Check time overlap
                  const currentStart = currentSlot.startTime.split(':').map(Number);
                  const currentEnd = currentSlot.endTime.split(':').map(Number);
                  const otherStart = otherSlot.startTime.split(':').map(Number);
                  const otherEnd = otherSlot.endTime.split(':').map(Number);
                  
                  const currentStartMinutes = currentStart[0] * 60 + currentStart[1];
                  const currentEndMinutes = currentEnd[0] * 60 + currentEnd[1];
                  const otherStartMinutes = otherStart[0] * 60 + otherStart[1];
                  const otherEndMinutes = otherEnd[0] * 60 + otherEnd[1];
                  
                  const hasTimeOverlap = !(currentEndMinutes <= otherStartMinutes || currentStartMinutes >= otherEndMinutes);
                  
                  if (hasTimeOverlap) {
                    let dayDate: string | undefined = otherDayDate.toISOString().split('T')[0];
                    
                    overlappingActivities.push({
                      activityName: otherActivity.name,
                      day: otherDaySlot.day,
                      slot: slot,
                      date: dayDate,
                      startTime: otherSlot.startTime,
                      endTime: otherSlot.endTime
                    });
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }

    console.log('🔍 CHECK OVERLAP - Result:', {
      hasOverlap: overlappingActivities.length > 0,
      overlappingActivitiesCount: overlappingActivities.length,
      overlappingActivities: overlappingActivities
    });

    return NextResponse.json({
      success: true,
      hasOverlap: overlappingActivities.length > 0,
      overlappingActivities: overlappingActivities
    });

  } catch (error: any) {
    console.error('Error checking slot overlap:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Lỗi khi kiểm tra trùng lặp buổi',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

