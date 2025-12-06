import mongoose, { Document, Schema } from 'mongoose';

// Define the Session interface
export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  role: string;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Define the Session schema
const sessionSchema = new Schema<ISession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID là bắt buộc']
  },
  role: {
    type: String,
    required: [true, 'Role là bắt buộc'],
    enum: {
      values: ['SUPER_ADMIN', 'ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER', 'CLUB_STUDENT', 'STUDENT'],
      message: 'Role không hợp lệ'
    }
  },
  lastActive: {
    type: Date,
    required: [true, 'Last active time là bắt buộc'],
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'sessions'
});

// Index for efficient queries
sessionSchema.index({ userId: 1, lastActive: -1 });
sessionSchema.index({ role: 1, lastActive: -1 });

// Static method to update or create session
sessionSchema.statics.updateOrCreate = async function(userId: mongoose.Types.ObjectId, role: string) {
  const lastActive = new Date();
  return this.findOneAndUpdate(
    { userId },
    { userId, role, lastActive },
    { upsert: true, new: true }
  );
};

// Static method to get active sessions (last 5 minutes)
sessionSchema.statics.getActiveSessions = function() {
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
  
  return this.find({
    lastActive: { $gte: fiveMinutesAgo }
  }).distinct('userId');
};

// Static method to count active sessions by role
sessionSchema.statics.countActiveByRole = async function() {
  // Standard practice: Consider user active if last activity within 2 minutes
  // This provides accurate real-time statistics similar to popular web applications
  const twoMinutesAgo = new Date();
  twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);
  
  const sessions = await this.find({
    lastActive: { $gte: twoMinutesAgo }
  }).lean();
  
  // Count by role (sử dụng Set để tránh đếm trùng nếu user có nhiều sessions)
  // 1. Quản trị: SUPER_ADMIN, ADMIN, CLUB_LEADER
  // 2. Cán bộ phụ trách: CLUB_DEPUTY, CLUB_MEMBER
  // 3. Thành viên CLB: CLUB_STUDENT
  // 4. Sinh viên: STUDENT
  const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'CLUB_LEADER'];
  const officerRoles = ['CLUB_DEPUTY', 'CLUB_MEMBER'];
  const clubStudentRole = 'CLUB_STUDENT';
  const studentRole = 'STUDENT';
  
  const adminUserIds = new Set<string>();
  const officerUserIds = new Set<string>();
  const clubStudentUserIds = new Set<string>();
  const studentUserIds = new Set<string>();
  
  sessions.forEach((session: any) => {
    const role = session.role;
    const userId = session.userId.toString();
    
    if (adminRoles.includes(role)) {
      adminUserIds.add(userId);
    } else if (officerRoles.includes(role)) {
      officerUserIds.add(userId);
    } else if (role === clubStudentRole) {
      clubStudentUserIds.add(userId);
    } else if (role === studentRole) {
      studentUserIds.add(userId);
    }
  });
  
  return {
    admin: adminUserIds.size,
    officer: officerUserIds.size,
    clubStudent: clubStudentUserIds.size,
    student: studentUserIds.size
  };
};

// Clean up old sessions (older than 1 hour)
sessionSchema.statics.cleanupOldSessions = async function() {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  
  return this.deleteMany({
    lastActive: { $lt: oneHourAgo }
  });
};

const Session = mongoose.models.Session || mongoose.model<ISession>('Session', sessionSchema);

export default Session;

