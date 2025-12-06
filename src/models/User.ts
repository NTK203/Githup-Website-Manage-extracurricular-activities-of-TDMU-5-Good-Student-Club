import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

// Define the User role type
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT' | 'STUDENT';

// Define the User interface
export interface IUser extends Document {
  studentId: string;
  name: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
  role: UserRole;
  phone?: string;
  class?: string;
  faculty?: string;
  position?: string;
  department?: string;
  isClubMember?: boolean;
  avatarUrl?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
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
        // Allow admin IDs, Google IDs (g{googleId}), or valid student IDs
        if (v.startsWith('admin') || v.startsWith('superadmin') || v.startsWith('g')) return true;
        return /^\d{13}$/.test(v); // 13 digits for student IDs
      },
      message: 'Mã số sinh viên không hợp lệ'
    }
  },
  name: {
    type: String,
    required: [true, 'Họ và tên là bắt buộc'],
    trim: true,
    minlength: [2, 'Họ và tên không hợp lệ'],
    maxlength: [100, 'Họ và tên không hợp lệ']
  },
  email: {
    type: String,
    required: [true, 'Email là bắt buộc'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
        // Allow admin emails, valid student emails, or any email (for Google OAuth)
        if (v === 'admin@tdmu.edu.vn' || v === 'admin.clb@tdmu.edu.vn' || v === 'superadmin@tdmu.edu.vn') return true;
        if (/^[0-9]{13}@student\.tdmu\.edu\.vn$/.test(v)) return true;
        // Allow any email format for Google OAuth users (they will have googleId)
        // This validation will be checked in pre-save hook
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Email không hợp lệ'
    }
  },
  passwordHash: {
    type: String,
    required: false,
    validate: {
      validator: function(v: string | undefined) {
        // Only validate if passwordHash is being set or modified
        // Skip validation if field is not modified (for existing users)
        if (!this.isModified('passwordHash') && !this.isNew) {
          return true;
        }
        
        // If passwordHash is provided, it must be at least 6 characters
        // Note: This is the hashed password, so we can only check length
        // Pattern validation (uppercase, special char) is done at API level before hashing
        if (v) {
          return v.length >= 6;
        }
        return true; // Optional if googleId exists
      },
      message: 'Mật khẩu phải có ít nhất 6 ký tự, 1 chữ cái viết hoa và 1 ký tự đặc biệt'
    }
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple null values
    trim: true
  },
  role: {
    type: String,
    enum: {
      values: ['SUPER_ADMIN', 'ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER', 'CLUB_STUDENT', 'STUDENT'],
      message: 'Vai trò không hợp lệ'
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
      message: 'Số điện thoại không hợp lệ'
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
    required: false, // Optional field
    maxlength: [100, 'Tên khoa không được quá 100 ký tự'],
    validate: {
      validator: function(v: any) {
        // Skip validation if value is undefined, null, or empty
        if (v === undefined || v === null || v === '') {
          return true;
        }
        
        // Convert to string and trim
        const value = String(v).trim();
        if (value === '') {
          return true;
        }
        
        // Allow any faculty value (user can input custom faculty names)
        // This is more flexible than restricting to a fixed list
        // Minimum length check to ensure it's a valid name
        return value.length >= 2 && value.length <= 100;
      },
      message: 'Khoa/Viện phải có từ 2 đến 100 ký tự'
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
  resetPasswordToken: {
    type: String,
    trim: true
  },
  resetPasswordExpires: {
    type: Date
  },
  // Removed soft delete fields since we're doing hard delete now

}, {
  timestamps: true, // Automatically add createdAt and updatedAt
  collection: 'users'
});

// Indexes for better query performance
// Note: studentId, email, and googleId already have unique indexes from schema definition
userSchema.index({ role: 1 });
userSchema.index({ faculty: 1 });
userSchema.index({ class: 1 });
// Removed isDeleted index since we're doing hard delete now

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    if (!this.passwordHash) {
      return false; // User doesn't have a password (Google login only)
    }
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

// Pre-save middleware to validate that user has either passwordHash or googleId
userSchema.pre('save', async function(next) {
  // User must have either passwordHash or googleId
  if (!this.passwordHash && !this.googleId) {
    return next(new Error('User must have either passwordHash or googleId'));
  }
  
  // If user has googleId, allow any email format
  // If user doesn't have googleId, email must be student email or admin email
  if (!this.googleId) {
    const isAdminEmail = this.email === 'admin@tdmu.edu.vn' || 
                        this.email === 'admin.clb@tdmu.edu.vn' || 
                        this.email === 'superadmin@tdmu.edu.vn';
    const isStudentEmail = /^[0-9]{13}@student\.tdmu\.edu\.vn$/.test(this.email);
    
    if (!isAdminEmail && !isStudentEmail) {
      return next(new Error('Email phải có định dạng: mã số sinh viên 13 chữ số@student.tdmu.edu.vn hoặc admin@tdmu.edu.vn hoặc admin.clb@tdmu.edu.vn hoặc superadmin@tdmu.edu.vn'));
    }
  }
  
  // Ensure faculty is undefined if empty string
  if (this.faculty && typeof this.faculty === 'string' && this.faculty.trim() === '') {
    this.faculty = undefined;
  }
  
  next();
});

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
