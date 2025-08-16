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
  // Registration form fields
  motivation?: string;
  experience?: string;
  expectations?: string;
  commitment?: string;
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
  }
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
  
  // Set approvedAt when status becomes ACTIVE
  if (this.isModified('status') && this.status === 'ACTIVE') {
    this.approvedAt = now;
  }
  
  // Set rejectedAt when status becomes REJECTED
  if (this.isModified('status') && this.status === 'REJECTED') {
    this.rejectedAt = now;
  }
  
  // Set removedAt when status becomes REMOVED
  if (this.isModified('status') && this.status === 'REMOVED') {
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
membershipSchema.methods.approve = function(approvedBy: string | mongoose.Types.ObjectId) {
  this.status = 'ACTIVE';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  return this.save();
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
