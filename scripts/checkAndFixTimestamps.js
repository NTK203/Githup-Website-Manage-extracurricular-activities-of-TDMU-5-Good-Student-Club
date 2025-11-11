const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define the schema directly in the script
const membershipSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE', 'REMOVED'],
    required: true,
    default: 'PENDING',
    index: true
  },
  joinedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: 500,
    default: null
  },
  removedBy: {
    type: {
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
      studentId: String
    },
    default: null
  },
  removedAt: {
    type: Date,
    default: null
  },
  removalReason: {
    type: String,
    trim: true,
    maxlength: 500,
    default: null
  },
  motivation: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  experience: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  expectations: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  commitment: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  previousStatus: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE', 'REMOVED']
  },
  reapplicationAt: {
    type: Date,
    default: null
  },
  reapplicationReason: {
    type: String,
    trim: true,
    maxlength: 500,
    default: null
  },
  isReapplication: {
    type: Boolean,
    default: false
  },
  restoredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  restoredAt: {
    type: Date,
    default: null
  },
  restorationReason: {
    type: String,
    trim: true,
    maxlength: 500,
    default: null
  }
}, {
  timestamps: true,
  collection: 'memberships'
});

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "db-sv5tot-tdmu"
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function checkAndFixTimestamps() {
  try {
    console.log('🔍 Checking memberships timestamps...');
    
    const Membership = mongoose.models.Membership || mongoose.model('Membership', membershipSchema);
    
    // Get all memberships
    const memberships = await Membership.find({}).lean();
    console.log(`📊 Found ${memberships.length} memberships`);
    
    let fixedCount = 0;
    let issuesFound = 0;
    
    for (const membership of memberships) {
      console.log(`\n🔍 Checking membership ${membership._id}:`);
      console.log(`   Status: ${membership.status}`);
      console.log(`   Created: ${membership.createdAt}`);
      console.log(`   Joined: ${membership.joinedAt}`);
      console.log(`   Approved: ${membership.approvedAt}`);
      console.log(`   Rejected: ${membership.rejectedAt}`);
      console.log(`   Removed: ${membership.removedAt}`);
      console.log(`   Restored: ${membership.restoredAt}`);
      
      let needsUpdate = false;
      const updateData = {};
      
      // Check for invalid dates (epoch 0 or invalid)
      const checkDate = (date, fieldName) => {
        if (date) {
          const dateObj = new Date(date);
          if (isNaN(dateObj.getTime()) || dateObj.getTime() === 0) {
            console.log(`   ❌ Invalid ${fieldName}: ${date}`);
            issuesFound++;
            needsUpdate = true;
            updateData[fieldName] = null;
            return false;
          }
        }
        return true;
      };
      
      checkDate(membership.approvedAt, 'approvedAt');
      checkDate(membership.rejectedAt, 'rejectedAt');
      checkDate(membership.removedAt, 'removedAt');
      checkDate(membership.restoredAt, 'restoredAt');
      
      // Check logical consistency
      if (membership.status === 'ACTIVE' && !membership.approvedAt) {
        console.log(`   ⚠️ ACTIVE membership without approvedAt`);
        issuesFound++;
        needsUpdate = true;
        updateData.approvedAt = membership.updatedAt || new Date();
      }
      
      if (membership.status === 'REJECTED' && !membership.rejectedAt) {
        console.log(`   ⚠️ REJECTED membership without rejectedAt`);
        issuesFound++;
        needsUpdate = true;
        updateData.rejectedAt = membership.updatedAt || new Date();
      }
      
      if (membership.status === 'REMOVED' && !membership.removedAt) {
        console.log(`   ⚠️ REMOVED membership without removedAt`);
        issuesFound++;
        needsUpdate = true;
        updateData.removedAt = membership.updatedAt || new Date();
      }
      
      // Fix if needed
      if (needsUpdate) {
        console.log(`   🔧 Fixing membership ${membership._id}...`);
        try {
          await Membership.findByIdAndUpdate(membership._id, updateData);
          fixedCount++;
          console.log(`   ✅ Fixed membership ${membership._id}`);
        } catch (error) {
          console.log(`   ❌ Failed to fix membership ${membership._id}:`, error.message);
        }
      } else {
        console.log(`   ✅ Membership ${membership._id} is valid`);
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total memberships: ${memberships.length}`);
    console.log(`   Issues found: ${issuesFound}`);
    console.log(`   Fixed: ${fixedCount}`);
    
  } catch (error) {
    console.error('❌ Error checking timestamps:', error);
  }
}

async function main() {
  await connectDB();
  await checkAndFixTimestamps();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
}

main().catch(console.error);
