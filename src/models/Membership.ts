import mongoose, { Document, Schema } from 'mongoose';

// Define the Membership status type
export type MembershipStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE' | 'REMOVED';

// Define the Membership interface
export interface IMembership extends Document {
  userId: mongoose.Types.ObjectId;
  status: MembershipStatus;
  joinedAt: Date;
  approvedBy?: mongoose.Types.ObjectId | null;
  approvedAt?: Date | null;
  rejectedBy?: mongoose.Types.ObjectId | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  removedBy?: {
    _id: mongoose.Types.ObjectId;
    name: string;
    studentId: string;
  } | null;
  removedAt?: Date | null;
  removalReason?: string | null;
  // Thêm trường mới để lưu lý do xóa hiện tại
  removalReasonTrue?: string | null;
  // Registration form fields
  motivation?: string;
  experience?: string;
  expectations?: string;
  commitment?: string;
  // Reapplication fields
  previousStatus?: MembershipStatus;
  reapplicationAt?: Date;
  reapplicationReason?: string;
  isReapplication?: boolean;
  // Restoration fields
  restoredBy?: mongoose.Types.ObjectId | null;
  restoredAt?: Date | null;
  restorationReason?: string | null;
  // History fields for multiple removals and restorations
  removalHistory?: Array<{
    removedAt: Date;
    removedBy: {
      _id: mongoose.Types.ObjectId;
      name: string;
      studentId: string;
    };
    removalReason: string;
    restoredAt?: Date;
    restoredBy?: mongoose.Types.ObjectId;
    restorationReason?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Define the Membership schema
const membershipSchema = new Schema<IMembership>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID là bắt buộc'],
    index: true
  },
  status: {
    type: String,
    enum: {
      values: ['PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE', 'REMOVED'],
      message: 'Trạng thái phải là PENDING, ACTIVE, REJECTED, INACTIVE hoặc REMOVED'
    },
    required: [true, 'Trạng thái là bắt buộc'],
    default: 'PENDING',
    index: true
  },
  joinedAt: {
    type: Date,
    required: [true, 'Ngày đăng ký là bắt buộc'],
    default: Date.now
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: Schema.Types.ObjectId,
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
    maxlength: [500, 'Lý do từ chối không được quá 500 ký tự'],
    default: null
  },
  removedBy: {
    type: {
      _id: Schema.Types.ObjectId,
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
    maxlength: [500, 'Lý do xóa không được quá 500 ký tự'],
    default: null
  },
  // Thêm trường mới để lưu lý do xóa hiện tại
  removalReasonTrue: {
    type: String,
    trim: true,
    maxlength: [500, 'Lý do xóa hiện tại không được quá 500 ký tự'],
    default: null
  },
  // Registration form fields
  motivation: {
    type: String,
    trim: true,
    maxlength: [1000, 'Động lực không được quá 1000 ký tự']
  },
  experience: {
    type: String,
    trim: true,
    maxlength: [1000, 'Kinh nghiệm không được quá 1000 ký tự']
  },
  expectations: {
    type: String,
    trim: true,
    maxlength: [1000, 'Mong muốn không được quá 1000 ký tự']
  },
  commitment: {
    type: String,
    trim: true,
    maxlength: [1000, 'Cam kết không được quá 1000 ký tự']
  },
  // Reapplication fields
  previousStatus: {
    type: String,
    enum: {
      values: ['PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE', 'REMOVED'],
      message: 'Trạng thái trước đó phải là PENDING, ACTIVE, REJECTED, INACTIVE hoặc REMOVED'
    }
  },
  reapplicationAt: {
    type: Date,
    default: null
  },
  reapplicationReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Lý do đăng ký lại không được quá 500 ký tự'],
    default: null
  },
  isReapplication: {
    type: Boolean,
    default: false
  },
  // Restoration fields
  restoredBy: {
    type: Schema.Types.ObjectId,
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
    maxlength: [500, 'Lý do duyệt lại không được quá 500 ký tự'],
    default: null
  },
  // History fields for multiple removals and restorations
  removalHistory: [{
    removedAt: {
      type: Date,
      required: true
    },
    removedBy: {
      type: {
        _id: Schema.Types.ObjectId,
        name: String,
        studentId: String
      },
      required: true
    },
    removalReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Lý do xóa không được quá 500 ký tự'],
      required: true
    },
    restoredAt: {
      type: Date,
      default: null
    },
    restoredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    restorationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Lý do duyệt lại không được quá 500 ký tự'],
      default: null
    }
  }]
}, {
  timestamps: true, // Automatically add createdAt and updatedAt
  collection: 'memberships'
});

// Indexes for better query performance
membershipSchema.index({ userId: 1, status: 1 });
membershipSchema.index({ status: 1 });
membershipSchema.index({ approvedBy: 1 });
membershipSchema.index({ rejectedBy: 1 });
membershipSchema.index({ removedBy: 1 });
membershipSchema.index({ joinedAt: -1 });
membershipSchema.index({ approvedAt: -1 });
membershipSchema.index({ removedAt: -1 });

// Ensure only one active membership per user
membershipSchema.index({ userId: 1, status: 1 }, { 
  unique: true,
  partialFilterExpression: { status: 'ACTIVE' }
});

// Pre-save middleware to set timestamps
membershipSchema.pre('save', function(next) {
  const now = new Date();
  
  // Set approvedAt when status becomes ACTIVE (only if not already set)
  // Don't overwrite approvedAt if it's already set (preserves first approval time)
  if (this.isModified('status') && this.status === 'ACTIVE' && !this.approvedAt) {
    this.approvedAt = now;
  }
  
  // Set rejectedAt when status becomes REJECTED (only if not already set)
  if (this.isModified('status') && this.status === 'REJECTED' && !this.rejectedAt) {
    this.rejectedAt = now;
  }
  
  // Set removedAt when status becomes REMOVED (only if not already set by remove() method)
  if (this.isModified('status') && this.status === 'REMOVED' && !this.removedAt) {
    this.removedAt = now;
  }
  
  // Clear approval/rejection data when status changes to INACTIVE
  if (this.isModified('status') && this.status === 'INACTIVE') {
    this.approvedAt = undefined;
    this.approvedBy = undefined;
    this.rejectedAt = undefined;
    this.rejectedBy = undefined;
    this.rejectionReason = undefined;
  }
  
  next();
});

// Static method to get active membership for a user
membershipSchema.statics.getActiveMembership = function(userId: mongoose.Types.ObjectId) {
  return this.findOne({ userId, status: 'ACTIVE' }).populate('userId approvedBy');
};

// Static method to get all memberships for a user
membershipSchema.statics.getUserMemberships = function(userId: mongoose.Types.ObjectId) {
  return this.find({ userId }).populate('userId approvedBy').sort({ createdAt: -1 });
};

// Static method to get pending memberships
membershipSchema.statics.getPendingMemberships = function() {
  return this.find({ status: 'PENDING' }).populate('userId').sort({ joinedAt: 1 });
};

// Static method to get active memberships
membershipSchema.statics.getActiveMemberships = function() {
  return this.find({ status: 'ACTIVE' }).populate('userId approvedBy rejectedBy').sort({ approvedAt: -1 });
};

// Instance method to approve membership
membershipSchema.methods.approve = async function(approvedBy: string | mongoose.Types.ObjectId) {
  this.status = 'ACTIVE';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();

  // Clear rejection data when approving a previously rejected membership
  if (this.rejectionReason || this.rejectedAt || this.rejectedBy) {
    this.rejectionReason = undefined;
    this.rejectedAt = undefined;
    this.rejectedBy = undefined;
  }

  await this.save(); // Save membership first

  // Find the associated user and update their role and club membership status
  const user = await mongoose.model('User').findById(this.userId);
  if (user) {
    console.log(`User ${user.name} (${user.studentId}) current role: ${user.role}`);
    user.role = 'CLUB_STUDENT';
    (user as any).isClubMember = true; // Cast to any to bypass potential type strictness if isClubMember is not directly in IUser
    console.log(`User ${user.name} (${user.studentId}) role set to: ${user.role}`);
    await user.save();
    console.log(`User ${user.name} (${user.studentId}) role updated to CLUB_STUDENT and saved.`);
  }

  return this;  
};

// Instance method to reject membership
membershipSchema.methods.reject = function(rejectionReason: string, rejectedBy?: string | mongoose.Types.ObjectId) {
  this.status = 'REJECTED';
  this.rejectionReason = rejectionReason;
  this.rejectedAt = new Date();
  if (rejectedBy) {
    this.rejectedBy = rejectedBy;
  }
  return this.save();
};

// Instance method to remove membership
membershipSchema.methods.remove = function(removalReason: string, removedBy: { _id: mongoose.Types.ObjectId; name: string; studentId: string }) {
  this.status = 'REMOVED';
  this.removalReason = removalReason;
  this.removedAt = new Date();
  this.removedBy = removedBy;
  return this.save();
};

// Virtual for getting membership duration (for active memberships)
membershipSchema.virtual('duration').get(function() {
  if (this.status === 'ACTIVE' && this.approvedAt) {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.approvedAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return null;
});

// Ensure virtual fields are serialized
membershipSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret: any) {
    // Convert ObjectIds to strings for JSON serialization
    if (ret.userId && typeof ret.userId === 'object') {
      ret.userId = ret.userId.toString();
    }
          if (ret.approvedBy && typeof ret.approvedBy === 'object' && ret.approvedBy !== null) {
        ret.approvedBy = ret.approvedBy.toString();
      }
      if (ret.rejectedBy && typeof ret.rejectedBy === 'object' && ret.rejectedBy !== null) {
        ret.rejectedBy = ret.rejectedBy.toString();
      }
    return ret;
  }
});

// Create and export the model
const Membership = mongoose.models.Membership || mongoose.model<IMembership>('Membership', membershipSchema);

export default Membership;
