const mongoose = require('mongoose');
require('dotenv').config();

async function assignActivitiesToUser() {
  try {
    // Connect to database
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/db-sv5tot-tdmu';
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      dbName: "db-sv5tot-tdmu"
    });
    console.log('✅ Connected to database');

    // Define schemas directly
    const userSchema = new mongoose.Schema({
      studentId: String,
      name: String,
      email: String,
      role: String,
      phone: String,
      class: String,
      faculty: String,
      avatarUrl: String,
      isClubMember: Boolean,
      createdAt: Date,
      updatedAt: Date
    });

    const activitySchema = new mongoose.Schema({
      name: String,
      description: String,
      date: Date,
      location: String,
      detailedLocation: String,
      maxParticipants: Number,
      visibility: String,
      responsiblePerson: mongoose.Schema.Types.ObjectId,
      status: String,
      type: String,
      imageUrl: String,
      overview: String,
      timeSlots: [{
        id: String,
        name: String,
        startTime: String,
        endTime: String,
        isActive: Boolean,
        activities: String,
        detailedLocation: String
      }],
      participants: [{
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        email: String,
        role: String,
        joinedAt: Date
      }],
      createdBy: mongoose.Schema.Types.ObjectId,
      updatedBy: mongoose.Schema.Types.ObjectId,
      createdAt: Date,
      updatedAt: Date
    });

    const User = mongoose.model('User', userSchema);
    const Activity = mongoose.model('Activity', activitySchema);

    // Get current user (SUPER_ADMIN)
    const currentUser = await User.findOne({ role: 'SUPER_ADMIN' });
    if (!currentUser) {
      console.log('❌ No SUPER_ADMIN user found');
      return;
    }

    console.log('👤 Current user:', currentUser.name, currentUser.role);

    // Get all activities
    const activities = await Activity.find({});
    console.log(`📋 Found ${activities.length} activities`);

    if (activities.length === 0) {
      console.log('❌ No activities found');
      return;
    }

    // Update activities to assign current user as responsible person
    const updatePromises = activities.map(async (activity) => {
      const updated = await Activity.findByIdAndUpdate(
        activity._id,
        { 
          responsiblePerson: currentUser._id,
          updatedBy: currentUser._id,
          updatedAt: new Date()
        },
        { new: true }
      );
      console.log(`✅ Updated activity: ${activity.name} -> Responsible: ${currentUser.name}`);
      return updated;
    });

    await Promise.all(updatePromises);

    console.log('🎉 Successfully assigned all activities to current user!');

    // Verify the assignment
    const assignedActivities = await Activity.find({ responsiblePerson: currentUser._id });
    console.log(`📊 Total activities assigned to ${currentUser.name}: ${assignedActivities.length}`);

    // Show some examples
    assignedActivities.slice(0, 3).forEach(activity => {
      console.log(`  - ${activity.name} (${activity.status})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run the script
assignActivitiesToUser();