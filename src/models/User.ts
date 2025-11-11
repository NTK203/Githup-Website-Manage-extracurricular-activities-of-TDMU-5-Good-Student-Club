import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

// Define the User role type
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT' | 'STUDENT';

// Define the User interface
export interface IUser extends Document {
  studentId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone?: string;
  class?: string;
  faculty?: string;
  position?: string;
  department?: string;
  isClubMember?: boolean;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Define the User schema
const userSchema = new Schema<IUser>({
  studentId: {
    type: String,
    required: [true, 'Mã số sinh viên là bắt buộc'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        // Allow admin IDs or valid student IDs
        if (v.startsWith('admin') || v.startsWith('superadmin')) return true;
        return /^\d{13}$/.test(v); // 13 digits for student IDs
      },
      message: 'Mã số sinh viên phải có 13 chữ số hoặc bắt đầu bằng "admin" hoặc "superadmin"'
    }
  },
  name: {
    type: String,
    required: [true, 'Họ và tên là bắt buộc'],
    trim: true,
    minlength: [2, 'Họ và tên phải có ít nhất 2 ký tự'],
    maxlength: [100, 'Họ và tên không được quá 100 ký tự']
  },
  email: {
    type: String,
    required: [true, 'Email là bắt buộc'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
        // Allow admin emails or valid student emails
        if (v === 'admin@tdmu.edu.vn' || v === 'admin.clb@tdmu.edu.vn' || v === 'superadmin@tdmu.edu.vn') return true;
        return /^[0-9]{13}@student\.tdmu\.edu\.vn$/.test(v);
      },
      message: 'Email phải có định dạng: mã số sinh viên 13 chữ số@student.tdmu.edu.vn hoặc admin@tdmu.edu.vn hoặc admin.clb@tdmu.edu.vn hoặc superadmin@tdmu.edu.vn'
    }
  },
  passwordHash: {
    type: String,
    required: [true, 'Mật khẩu là bắt buộc'],
    minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự']
  },
  role: {
    type: String,
    enum: {
      values: ['SUPER_ADMIN', 'ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER', 'CLUB_STUDENT', 'STUDENT'],
      message: 'Vai trò phải là SUPER_ADMIN, ADMIN, CLUB_LEADER, CLUB_DEPUTY, CLUB_MEMBER, CLUB_STUDENT hoặc STUDENT'
    },
    required: [true, 'Vai trò là bắt buộc'],
    default: 'STUDENT' as UserRole
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Optional field
        return /^[0-9]{10,11}$/.test(v);
      },
      message: 'Số điện thoại phải có 10-11 chữ số'
    }
  },
  class: {
    type: String,
    trim: true,
    maxlength: [20, 'Tên lớp không được quá 20 ký tự']
  },
  faculty: {
    type: String,
    trim: true,
    maxlength: [100, 'Tên khoa không được quá 100 ký tự'],
    enum: {
      values: [
        'Trường Kinh Tế Tài Chính',
        'Trường Luật Và Quản Lí Phát Triển',
        'Viện Kỹ Thuật Công Nghệ',
        'Viện Đào Tạo Ngoại Ngữ',
        'Viện Đào Tạo CNTT Chuyển Đổi Số',
        'Viện Đào Tạo Kiến Trúc Xây Dựng Và Giao Thông',
        'Khoa Sư Phạm',
        'Khoa Kiến Thức Chung',
        'Khoa Công Nghiệp Văn Hóa Thể Thao Và Du Lịch',
        'Ban Quản Lý Đào Tạo Sau Đại Học',
        'Khác'
      ],
      message: 'Khoa/Viện không hợp lệ'
    }
  },
  position: {
    type: String,
    trim: true,
    maxlength: [50, 'Chức vụ không được quá 50 ký tự']
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'Tên phòng ban không được quá 100 ký tự']
  },
  isClubMember: {
    type: Boolean,
    default: false,
    index: true
  },
  avatarUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Optional field
        return /^https?:\/\/.+/.test(v);
      },
      message: 'URL ảnh đại diện phải là một URL hợp lệ'
    }
  },
  // Removed soft delete fields since we're doing hard delete now

}, {
  timestamps: true, // Automatically add createdAt and updatedAt
  collection: 'users'
});

// Indexes for better query performance
userSchema.index({ studentId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ faculty: 1 });
userSchema.index({ class: 1 });
// Removed isDeleted index since we're doing hard delete now

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    throw new Error('Lỗi khi so sánh mật khẩu');
  }
};

// Static method to hash password
userSchema.statics.hashPassword = async function(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Pre-save middleware to hash password if it's modified
// DISABLED: We now hash password in the API before saving
// userSchema.pre('save', async function(next) {
//   // Only hash the password if it has been modified (or is new)
//   if (!this.isModified('passwordHash')) return next();
//   
//   try {
//     // Hash the password with cost of 12
//     const saltRounds = 12;
//     this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
//     next();
//   } catch (error) {
//     next(error as Error);
//   }
// });

// Virtual for getting user's display name
userSchema.virtual('displayName').get(function() {
  return this.name;
});

// Virtual for getting user's initials
userSchema.virtual('initials').get(function() {
  return this.name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret: any) {
    if (ret.passwordHash) {
      delete ret.passwordHash; // Don't include password hash in JSON
    }
    return ret;
  }
});

// Create and export the model
const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;
