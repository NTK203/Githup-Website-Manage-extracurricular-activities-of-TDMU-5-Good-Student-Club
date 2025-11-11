const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sv5tot-tdmu');
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// User Schema (simplified for checking)
const userSchema = new mongoose.Schema({
  studentId: String,
  name: String,
  email: String,
  role: String,
  // ... other fields
});

const User = mongoose.model('User', userSchema);

const checkUsers = async () => {
  try {
    console.log('🔍 Checking users in database...');
    
    // Get all users
    const allUsers = await User.find({}).select('studentId name email role');
    console.log(`📊 Total users found: ${allUsers.length}`);
    
    if (allUsers.length === 0) {
      console.log('❌ No users found in database!');
      return;
    }
    
    // Group by role
    const usersByRole = {};
    allUsers.forEach(user => {
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = [];
      }
      usersByRole[user.role].push(user);
    });
    
    console.log('\n📋 Users by role:');
    Object.keys(usersByRole).forEach(role => {
      console.log(`\n${role} (${usersByRole[role].length} users):`);
      usersByRole[role].forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - ${user.studentId}`);
      });
    });
    
    // Check for responsible person roles
    const responsibleRoles = ['SUPER_ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'];
    const responsiblePersons = allUsers.filter(user => responsibleRoles.includes(user.role));
    
    console.log(`\n🎯 Responsible persons (${responsiblePersons.length}):`);
    responsiblePersons.forEach(user => {
      console.log(`  - ${user.name} (${user.role}) - ${user.email}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
};

// Run the check
connectDB().then(checkUsers);
