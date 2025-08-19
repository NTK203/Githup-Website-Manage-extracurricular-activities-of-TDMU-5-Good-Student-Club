const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// User Schema (simplified for this script)
const userSchema = new mongoose.Schema({
  studentId: String,
  name: String,
  email: String,
  passwordHash: String,
  role: String,
  phone: String,
  class: String,
  faculty: String,
  isClubMember: Boolean,
  avatarUrl: String,
  isDeleted: Boolean,
  deletedAt: Date,
  deletedBy: mongoose.Schema.Types.ObjectId,
  createdAt: Date,
  updatedAt: Date
});

const User = mongoose.model('User', userSchema);

// Function to check if a string looks like a bcrypt hash
const isBcryptHash = (str) => {
  return str && str.startsWith('$2b$') && str.length === 60;
};

// Function to fix passwords
const fixPasswords = async () => {
  try {
    console.log('Starting password fix process...');
    
    // Find all users
    const users = await User.find({ isDeleted: { $ne: true } });
    console.log(`Found ${users.length} users to check`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const user of users) {
      console.log(`Checking user: ${user.email}`);
      
      // Check if password is already hashed
      if (isBcryptHash(user.passwordHash)) {
        console.log(`  ✓ Password already hashed for ${user.email}`);
        skippedCount++;
        continue;
      }
      
      // Password is not hashed, hash it now
      console.log(`  ⚠ Password not hashed for ${user.email}, hashing now...`);
      
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(user.passwordHash, saltRounds);
      
      // Update user with hashed password
      await User.findByIdAndUpdate(user._id, {
        passwordHash: hashedPassword,
        updatedAt: new Date()
      });
      
      console.log(`  ✓ Password hashed successfully for ${user.email}`);
      fixedCount++;
    }
    
    console.log('\n=== Password Fix Summary ===');
    console.log(`Total users checked: ${users.length}`);
    console.log(`Passwords already hashed: ${skippedCount}`);
    console.log(`Passwords fixed: ${fixedCount}`);
    console.log('============================\n');
    
  } catch (error) {
    console.error('Error fixing passwords:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await fixPasswords();
  await mongoose.disconnect();
  console.log('Script completed');
  process.exit(0);
};

main().catch(console.error);
