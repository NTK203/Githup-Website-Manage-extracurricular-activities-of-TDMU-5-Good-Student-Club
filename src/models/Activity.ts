import mongoose, { Document, Schema } from 'mongoose';

// Define the Activity visibility type
export type ActivityVisibility = 'public' | 'private';

// Define the Activity status type
export type ActivityStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';

// Define the Activity type
export type ActivityType = 'single_day' | 'multiple_days';

// Define the Participant role type
export type ParticipantRole = 'Trưởng Nhóm' | 'Phó Trưởng Nhóm' | 'Thành Viên Ban Tổ Chức' | 'Người Tham Gia' | 'Người Giám Sát';

// Define the TimeSlot interface
export interface ITimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  activities: string;
  detailedLocation?: string; // Địa điểm chi tiết cho từng buổi
}

// Define the Participant interface
export interface IParticipant {
  userId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: ParticipantRole;
  joinedAt: Date;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'removed';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  removedBy?: mongoose.Types.ObjectId;
  removedAt?: Date;
  // Registration slots for multiple_days activities
  registeredDaySlots?: Array<{
    day: number;
    slot: 'morning' | 'afternoon' | 'evening';
  }>;
  // Attendance fields
  checkedIn?: boolean;
  checkedInAt?: Date;
  checkedInBy?: mongoose.Types.ObjectId;
  checkInLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
  checkInPhoto?: string;
}

// Define the LocationData interface for GPS coordinates
export interface ILocationData {
  lat: number;
  lng: number;
  address: string;
  radius: number;
}

// Define the MultiTimeLocation interface for different time slots
export interface IMultiTimeLocation {
  id: string;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  radius: number;
}

// Define the Activity interface
export interface IActivity extends Document {
  name: string;
  description: string;
  date: Date;
  location: string;
  locationData?: ILocationData; // GPS coordinates for attendance tracking
  multiTimeLocations?: IMultiTimeLocation[]; // Multiple locations for different time slots
  maxParticipants?: number;
  registrationThreshold?: number; // Phần trăm tối thiểu để đăng ký (0-100)
  visibility: ActivityVisibility;
  responsiblePerson: mongoose.Types.ObjectId;
  status: ActivityStatus;
  type: ActivityType;
  imageUrl?: string;
  overview?: string;
  
  // Time slots for single day activities
  timeSlots?: ITimeSlot[];
  
  // Schedule for multiple days activities
  startDate?: Date;
  endDate?: Date;
  schedule?: Array<{
    day: number;
    date: Date;
    activities: string;
  }>;
  
  // Participants
  participants: IParticipant[];
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Define the Activity schema
const timeSlotSchema = new Schema<ITimeSlot>({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    enum: ['Buổi Sáng', 'Buổi Chiều', 'Buổi Tối']
  },
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Thời gian bắt đầu phải có định dạng HH:MM'
    }
  },
  endTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Thời gian kết thúc phải có định dạng HH:MM'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  activities: {
    type: String,
    trim: true,
    maxlength: [1000, 'Mô tả hoạt động không được quá 1000 ký tự']
  },
  detailedLocation: {
    type: String,
    trim: true,
    maxlength: [500, 'Địa điểm chi tiết không được quá 500 ký tự']
  }
}, { _id: false });

const participantSchema = new Schema<IParticipant>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID là bắt buộc']
  },
  name: {
    type: String,
    required: [true, 'Tên người tham gia là bắt buộc'],
    trim: true,
    maxlength: [100, 'Tên không được quá 100 ký tự']
  },
  email: {
    type: String,
    required: [true, 'Email là bắt buộc'],
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Email không hợp lệ'
    }
  },
  role: {
    type: String,
    enum: {
      values: ['Trưởng Nhóm', 'Phó Trưởng Nhóm', 'Thành Viên Ban Tổ Chức', 'Người Tham Gia', 'Người Giám Sát'],
      message: 'Vai trò phải là Trưởng Nhóm, Phó Trưởng Nhóm, Thành Viên Ban Tổ Chức, Người Tham Gia hoặc Người Giám Sát'
    },
    required: [true, 'Vai trò là bắt buộc'],
    default: 'Người Tham Gia'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  approvalStatus: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'rejected', 'removed'],
      message: 'Trạng thái duyệt phải là pending, approved, rejected hoặc removed'
    },
    default: 'pending'
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
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  removedAt: {
    type: Date,
    default: null
  },
  // Registration slots for multiple_days activities
  registeredDaySlots: [{
    day: {
      type: Number,
      required: true,
      min: [1, 'Số ngày phải lớn hơn 0']
    },
    slot: {
      type: String,
      required: true,
      enum: ['morning', 'afternoon', 'evening'],
      message: 'Buổi phải là morning, afternoon hoặc evening'
    }
  }],
  // Attendance fields
  checkedIn: {
    type: Boolean,
    default: false
  },
  checkedInAt: {
    type: Date,
    default: null
  },
  checkedInBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  checkInLocation: {
    lat: {
      type: Number,
      default: null
    },
    lng: {
      type: Number,
      default: null
    },
    address: {
      type: String,
      trim: true,
      default: null
    }
  },
  checkInPhoto: {
    type: String,
    trim: true,
    default: null
  }
}, { _id: false });

const activitySchema = new Schema<IActivity>({
  name: {
    type: String,
    required: [true, 'Tên hoạt động là bắt buộc'],
    trim: true,
    minlength: [5, 'Tên hoạt động phải có ít nhất 5 ký tự'],
    maxlength: [200, 'Tên hoạt động không được quá 200 ký tự']
  },
  description: {
    type: String,
    required: [true, 'Mô tả hoạt động là bắt buộc'],
    trim: true,
    minlength: [10, 'Mô tả hoạt động phải có ít nhất 10 ký tự'],
    maxlength: [2000, 'Mô tả hoạt động không được quá 2000 ký tự']
  },
  date: {
    type: Date,
    required: false, // Make it optional - will be validated based on type
    validate: {
      validator: function(v: Date) {
        // For single_day, date is required
        if (this.type === 'single_day' && !v) {
          return false;
        }
        // For multiple_days, date is optional
        if (this.type === 'multiple_days' && !v) {
          return true; // Allow missing date for multiple_days
        }
        // If date is provided, validate it
        if (v) {
          try {
            // Parse the activity date
            const activityDate = new Date(v);
            
            // Get current date/time
            const now = new Date();
            
            // Normalize both dates to start of day in UTC for fair comparison
            // This ensures timezone doesn't affect the comparison
            const activityDateUTC = Date.UTC(
              activityDate.getUTCFullYear(),
              activityDate.getUTCMonth(),
              activityDate.getUTCDate()
            );
            
            const todayUTC = Date.UTC(
              now.getUTCFullYear(),
              now.getUTCMonth(),
              now.getUTCDate()
            );
            
            // Allow today and future dates (activityDateUTC >= todayUTC)
            // This means activity date can be today or any future date
            const isValid = activityDateUTC >= todayUTC;
            
            // Reject only if activity date is before today
            if (!isValid) {
              return false;
            }
            
            return true;
          } catch (error) {
            return false;
          }
        }
        return true;
      },
      message: 'Ngày diễn ra phải là ngày hôm nay hoặc ngày trong tương lai'
    }
  },
  location: {
    type: String,
    required: [true, 'Địa điểm là bắt buộc'],
    trim: true,
    maxlength: [200, 'Địa điểm không được quá 200 ký tự']
  },
  locationData: {
    lat: {
      type: Number,
      min: [-90, 'Vĩ độ phải từ -90 đến 90'],
      max: [90, 'Vĩ độ phải từ -90 đến 90']
    },
    lng: {
      type: Number,
      min: [-180, 'Kinh độ phải từ -180 đến 180'],
      max: [180, 'Kinh độ phải từ -180 đến 180']
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Địa chỉ không được quá 500 ký tự']
    },
    radius: {
      type: Number,
      min: [10, 'Bán kính tối thiểu là 10m'],
      max: [10000, 'Bán kính tối đa là 10km'],
      default: 100
    }
  },
  multiTimeLocations: [{
    id: {
      type: String,
      required: true
    },
    timeSlot: {
      type: String,
      enum: ['morning', 'afternoon', 'evening'],
      required: true
    },
    location: {
      lat: {
        type: Number,
        required: true,
        min: [-90, 'Vĩ độ phải từ -90 đến 90'],
        max: [90, 'Vĩ độ phải từ -90 đến 90']
      },
      lng: {
        type: Number,
        required: true,
        min: [-180, 'Kinh độ phải từ -180 đến 180'],
        max: [180, 'Kinh độ phải từ -180 đến 180']
      },
      address: {
        type: String,
        trim: true,
        maxlength: [500, 'Địa chỉ không được quá 500 ký tự']
      }
    },
    radius: {
      type: Number,
      min: [10, 'Bán kính tối thiểu là 10m'],
      max: [10000, 'Bán kính tối đa là 10km'],
      default: 100
    }
  }],
  maxParticipants: {
    type: Number,
    min: [1, 'Số lượng tối đa phải lớn hơn 0'],
    max: [1000, 'Số lượng tối đa không được quá 1000']
  },
  registrationThreshold: {
    type: Number,
    min: [0, 'Ngưỡng đăng ký phải từ 0 đến 100'],
    max: [100, 'Ngưỡng đăng ký phải từ 0 đến 100'],
    default: 80
  },
  visibility: {
    type: String,
    enum: {
      values: ['public', 'private'],
      message: 'Quyền xem phải là public hoặc private'
    },
    required: [true, 'Quyền xem là bắt buộc'],
    default: 'public'
  },
  responsiblePerson: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Người phụ trách là bắt buộc'],
    validate: {
      validator: function(v: mongoose.Types.ObjectId) {
        // This will be validated in the application logic
        return true;
      },
      message: 'Người phụ trách phải có vai trò phù hợp'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'published', 'ongoing', 'completed', 'cancelled', 'postponed'],
      message: 'Trạng thái phải là draft, published, ongoing, completed, cancelled hoặc postponed'
    },
    required: [true, 'Trạng thái là bắt buộc'],
    default: 'draft'
  },
  type: {
    type: String,
    enum: {
      values: ['single_day', 'multiple_days'],
      message: 'Loại hoạt động phải là single_day hoặc multiple_days'
    },
    required: [true, 'Loại hoạt động là bắt buộc']
  },
  imageUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Optional field
        return /^https?:\/\/.+/.test(v);
      },
      message: 'URL ảnh phải bắt đầu bằng http:// hoặc https://'
    }
  },
  overview: {
    type: String,
    trim: true,
    maxlength: [1000, 'Tổng quan không được quá 1000 ký tự']
  },
  
  // Time slots for single day activities
  timeSlots: {
    type: [timeSlotSchema],
    validate: {
      validator: function(v: ITimeSlot[] | undefined) {
        // Only validate if type is single_day
        if (this.type === 'single_day') {
          // Check if v is undefined, null, or empty array
          if (v === undefined || v === null || !Array.isArray(v) || v.length === 0) {
            return false;
          }
        }
        return true;
      },
      message: 'Hoạt động 1 ngày phải có ít nhất 1 buổi'
    }
  },
  
  // Schedule for multiple days activities
  startDate: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        if (this.type === 'multiple_days' && !v) {
          return false;
        }
        return true;
      },
      message: 'Hoạt động nhiều ngày phải có ngày bắt đầu'
    }
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        if (this.type === 'multiple_days' && !v) {
          return false;
        }
        if (this.type === 'multiple_days' && this.startDate && v <= this.startDate) {
          return false;
        }
        return true;
      },
      message: 'Ngày kết thúc phải sau ngày bắt đầu'
    }
  },
  schedule: {
    type: [{
      day: {
        type: Number,
        required: true,
        min: [1, 'Số ngày phải lớn hơn 0']
      },
      date: {
        type: Date,
        required: true
      },
      activities: {
        type: String,
        trim: true,
        maxlength: [1000, 'Mô tả hoạt động không được quá 1000 ký tự']
      }
    }],
    validate: {
      validator: function(v: any[] | undefined) {
        // Only validate if type is multiple_days
        if (this.type === 'multiple_days') {
          // Check if v is undefined, null, or empty array
          if (v === undefined || v === null || !Array.isArray(v) || v.length === 0) {
            return false;
          }
        }
        return true;
      },
      message: 'Hoạt động nhiều ngày phải có lịch trình'
    }
  },
  
  // Participants
  participants: {
    type: [participantSchema],
    default: []
  },
  
  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Người tạo là bắt buộc']
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Người cập nhật là bắt buộc']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
activitySchema.index({ status: 1, visibility: 1 });
activitySchema.index({ date: 1 });
activitySchema.index({ type: 1 });
activitySchema.index({ createdBy: 1 });
activitySchema.index({ responsiblePerson: 1 });
activitySchema.index({ 'participants.userId': 1 });

// Virtual for current participants count
activitySchema.virtual('currentParticipantsCount').get(function() {
  if (!this.participants || !Array.isArray(this.participants)) {
    return 0;
  }
  return this.participants.length;
});

// Virtual for checking if activity is full
activitySchema.virtual('isFull').get(function() {
  if (!this.maxParticipants) return false;
  if (!this.participants || !Array.isArray(this.participants)) {
    return false;
  }
  return this.participants.length >= this.maxParticipants;
});

// Virtual for checking if user can join
activitySchema.methods.canUserJoin = function(userId: mongoose.Types.ObjectId) {
  if (this.isFull) return false;
  if (!this.participants || !Array.isArray(this.participants)) {
    return true; // Can join if no participants array
  }
  return !this.participants.some((p: any) => p && p.userId && p.userId.equals(userId));
};

// Static method to find activities by visibility and user role
activitySchema.statics.findByVisibilityAndRole = function(visibility: ActivityVisibility, userRole: string) {
  if (visibility === 'public') {
    return this.find({ visibility: 'public' });
  } else {
    // Private activities - only visible to club members
    const allowedRoles = ['SUPER_ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER', 'CLUB_STUDENT'];
    if (allowedRoles.includes(userRole)) {
      return this.find({ visibility: 'private' });
    }
    return this.find({ _id: null }); // Return empty result
  }
};

// Pre-save middleware to validate responsible person role
activitySchema.pre('save', async function(next) {
  if (this.isModified('responsiblePerson')) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(this.responsiblePerson);
      if (!user) {
        throw new Error('Người phụ trách không tồn tại');
      }
      
      const allowedRoles = ['SUPER_ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'];
      if (!allowedRoles.includes(user.role)) {
        throw new Error('Người phụ trách phải có vai trò phù hợp');
      }
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

// Create and export the model
const Activity = mongoose.models.Activity || mongoose.model<IActivity>('Activity', activitySchema);

export default Activity;
