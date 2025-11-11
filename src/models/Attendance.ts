import mongoose, { Document, Schema } from 'mongoose';

// Define the Attendance status type
export type AttendanceStatus = 'pending' | 'approved' | 'rejected';

// Define the individual attendance record (nested in main document)
export interface IAttendanceRecord {
  _id?: mongoose.Types.ObjectId;
  timeSlot: 'Buổi Sáng' | 'Buổi Chiều' | 'Buổi Tối';
  checkInType: 'start' | 'end'; // Đầu buổi hoặc cuối buổi
  checkInTime: Date;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  photoUrl?: string;
  status: AttendanceStatus;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  verificationNote?: string; // Ghi chú khi duyệt (approved) hoặc lý do hủy (rejected)
  cancelReason?: string; // Lý do hủy điểm danh (khi status = 'rejected')
  lateReason?: string; // Lý do trễ (by student)
  createdAt: Date;
  updatedAt: Date;
}

// Define the Attendance interface (main document - one per user per activity)
export interface IAttendance extends Document {
  // Activity reference
  activityId: mongoose.Types.ObjectId;
  
  // Student information
  userId: mongoose.Types.ObjectId;
  studentName: string;
  studentEmail: string;
  studentId?: string; // Mã sinh viên
  
  // Array of attendance records
  attendances: IAttendanceRecord[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Define the nested attendance record schema
const attendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    _id: {
      type: Schema.Types.ObjectId,
      auto: true
    },
    timeSlot: {
      type: String,
      enum: {
        values: ['Buổi Sáng', 'Buổi Chiều', 'Buổi Tối'],
        message: 'Buổi phải là Buổi Sáng, Buổi Chiều hoặc Buổi Tối'
      },
      required: [true, 'Buổi là bắt buộc']
    },
    checkInType: {
      type: String,
      enum: {
        values: ['start', 'end'],
        message: 'Loại điểm danh phải là start (đầu buổi) hoặc end (cuối buổi)'
      },
      required: [true, 'Loại điểm danh là bắt buộc']
    },
    checkInTime: {
      type: Date,
      required: [true, 'Thời gian điểm danh là bắt buộc'],
      default: Date.now
    },
    location: {
      lat: {
        type: Number,
        required: [true, 'Vĩ độ là bắt buộc'],
        min: [-90, 'Vĩ độ phải từ -90 đến 90'],
        max: [90, 'Vĩ độ phải từ -90 đến 90']
      },
      lng: {
        type: Number,
        required: [true, 'Kinh độ là bắt buộc'],
        min: [-180, 'Kinh độ phải từ -180 đến 180'],
        max: [180, 'Kinh độ phải từ -180 đến 180']
      },
      address: {
        type: String,
        trim: true,
        maxlength: [500, 'Địa chỉ không được quá 500 ký tự']
      }
    },
    photoUrl: {
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
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'],
        message: 'Trạng thái phải là pending, approved hoặc rejected'
      },
      required: [true, 'Trạng thái là bắt buộc'],
      default: 'pending'
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    verificationNote: {
      type: String,
      trim: true,
      maxlength: [500, 'Ghi chú không được quá 500 ký tự']
    },
    cancelReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'Lý do hủy không được quá 500 ký tự'],
      validate: {
        validator: function(v: any) {
          // Allow null, undefined, or non-empty string
          if (v === null || v === undefined) return true;
          if (typeof v === 'string') {
            const trimmed = v.trim();
            return trimmed.length > 0 && trimmed.length <= 500;
          }
          return false;
        },
        message: 'Lý do hủy phải là chuỗi ký tự từ 1 đến 500 ký tự'
      }
    },
    lateReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'Lý do trễ không được quá 500 ký tự'],
      validate: {
        validator: function(v: any) {
          // Allow null, undefined, or non-empty string
          if (v === null || v === undefined) return true;
          if (typeof v === 'string') {
            const trimmed = v.trim();
            return trimmed.length > 0 && trimmed.length <= 500;
          }
          return false;
        },
        message: 'Lý do trễ phải là chuỗi ký tự từ 1 đến 500 ký tự'
      }
    }
  },
  {
    timestamps: true // Tự động tạo createdAt và updatedAt cho mỗi record
  }
);

// Define the Attendance schema (main document)
const attendanceSchema = new Schema<IAttendance>(
  {
    activityId: {
      type: Schema.Types.ObjectId,
      ref: 'Activity',
      required: [true, 'ID hoạt động là bắt buộc'],
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'ID người dùng là bắt buộc'],
      index: true
    },
    studentName: {
      type: String,
      required: [true, 'Tên sinh viên là bắt buộc'],
      trim: true,
      maxlength: [100, 'Tên không được quá 100 ký tự']
    },
    studentEmail: {
      type: String,
      required: [true, 'Email sinh viên là bắt buộc'],
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Email không hợp lệ'
      }
    },
    studentId: {
      type: String,
      trim: true,
      maxlength: [50, 'Mã sinh viên không được quá 50 ký tự']
    },
    attendances: {
      type: [attendanceRecordSchema],
      default: []
    }
  },
  {
    timestamps: true, // Tự động tạo createdAt và updatedAt
    collection: 'attendances'
  }
);

// Compound index để đảm bảo mỗi sinh viên chỉ có 1 document cho mỗi activity
attendanceSchema.index(
  { activityId: 1, userId: 1 },
  { unique: true, name: 'unique_user_activity' }
);

// Index để tìm kiếm nhanh theo activity
attendanceSchema.index({ activityId: 1 });

// Index để tìm kiếm theo user
attendanceSchema.index({ userId: 1 });

// Export the model
const Attendance = mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', attendanceSchema);

export default Attendance;
