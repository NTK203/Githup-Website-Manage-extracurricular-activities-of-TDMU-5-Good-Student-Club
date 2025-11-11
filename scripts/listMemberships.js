const mongoose = require('mongoose');
require('dotenv').config();

// Kết nối database
async function connectDB() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/db-sv5tot-tdmu';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Đã kết nối database thành công');
  } catch (error) {
    console.error('❌ Lỗi kết nối database:', error);
    process.exit(1);
  }
}

// Schema cho Membership
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
  removalReasonTrue: {
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

const Membership = mongoose.model('Membership', membershipSchema);

// Hàm liệt kê tất cả memberships
async function listMemberships() {
  try {
    console.log('📋 LIỆT KÊ TẤT CẢ MEMBERSHIPS:');
    
    const memberships = await Membership.find({});
    
    if (memberships.length === 0) {
      console.log('❌ Không có membership nào');
      return;
    }
    
    console.log(`\nTổng số: ${memberships.length} memberships\n`);
    
    memberships.forEach((membership, index) => {
      console.log(`${index + 1}. ID: ${membership._id}`);
      console.log(`   - User ID: ${membership.userId}`);
      console.log(`   - Status: ${membership.status}`);
      console.log(`   - Joined At: ${membership.joinedAt.toLocaleString('vi-VN')}`);
      
      if (membership.removedAt) {
        console.log(`   - Removed At: ${membership.removedAt.toLocaleString('vi-VN')}`);
        console.log(`   - Removal Reason: ${membership.removalReason || 'N/A'}`);
      }
      
      if (membership.restoredAt) {
        console.log(`   - Restored At: ${membership.restoredAt.toLocaleString('vi-VN')}`);
        console.log(`   - Restoration Reason: ${membership.restorationReason || 'N/A'}`);
      }
      
      if (membership.removalHistory && membership.removalHistory.length > 0) {
        console.log(`   - History entries: ${membership.removalHistory.length}`);
      }
      
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Lỗi liệt kê memberships:', error);
  }
}

// Main execution
async function main() {
  await connectDB();
  await listMemberships();
  await mongoose.disconnect();
  console.log('👋 Đã ngắt kết nối database');
}

// Chạy script
main().catch(console.error);
