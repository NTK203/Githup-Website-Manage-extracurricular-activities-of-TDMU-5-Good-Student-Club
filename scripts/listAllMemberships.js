const mongoose = require('mongoose');

// Connect to MongoDB - replace with your actual connection string
const MONGODB_URI = 'mongodb://localhost:27017/db-sv5tot-tdmu'; // Update this with your actual MongoDB URI

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Membership schema for the script
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
  },
  removalHistory: [{
    removedAt: {
      type: Date,
      required: true
    },
    removedBy: {
      type: {
        _id: mongoose.Schema.Types.ObjectId,
        name: String,
        studentId: String
      },
      required: true
    },
    removalReason: {
      type: String,
      trim: true,
      maxlength: 500,
      required: true
    },
    restoredAt: {
      type: Date,
      default: null
    },
    restoredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    restorationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null
    }
  }]
}, {
  timestamps: true,
  collection: 'memberships'
});

// Create model
const Membership = mongoose.models.Membership || mongoose.model('Membership', membershipSchema);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Tìm tất cả memberships có thông tin xóa
    const memberships = await Membership.find({
      $or: [
        { removedAt: { $exists: true, $ne: null } },
        { removalReason: { $exists: true, $ne: null } },
        { restoredAt: { $exists: true, $ne: null } },
        { restorationReason: { $exists: true, $ne: null } }
      ]
    }).sort({ updatedAt: -1 });
    
    console.log(`\n=== TÌM THẤY ${memberships.length} MEMBERSHIPS CÓ THÔNG TIN XÓA/DUYỆT ===\n`);
    
    memberships.forEach((membership, index) => {
      console.log(`\n--- Membership ${index + 1} ---`);
      console.log('ID:', membership._id.toString());
      console.log('User ID:', membership.userId.toString());
      console.log('Status:', membership.status);
      console.log('Approved At:', membership.approvedAt);
      console.log('Removed At:', membership.removedAt);
      console.log('Removal Reason:', membership.removalReason);
      console.log('Restored At:', membership.restoredAt);
      console.log('Restoration Reason:', membership.restorationReason);
      console.log('RemovalHistory Length:', membership.removalHistory?.length || 0);
      console.log('Updated At:', membership.updatedAt);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
});
