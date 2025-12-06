import mongoose, { Document, Schema } from 'mongoose';

// Define the Notification type
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

// Define the Notification interface
export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;        // Người nhận thông báo
  title: string;                          // Tiêu đề
  message: string;                        // Nội dung
  type: NotificationType;                 // Loại thông báo
  isRead: boolean;                         // Đã đọc chưa
  relatedType?: string;                   // Loại liên quan (activity, membership, etc.)
  relatedId?: mongoose.Types.ObjectId;    // ID của đối tượng liên quan
  createdBy?: mongoose.Types.ObjectId;     // Người gửi (userId của admin/officer)
  readAt?: Date;                          // Thời điểm đọc
  createdAt: Date;
  updatedAt: Date;
}

// Define the Notification schema
const notificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID là bắt buộc']
  },
  title: {
    type: String,
    required: [true, 'Tiêu đề là bắt buộc'],
    trim: true,
    maxlength: [200, 'Tiêu đề không được quá 200 ký tự']
  },
  message: {
    type: String,
    required: [true, 'Nội dung là bắt buộc'],
    trim: true,
    maxlength: [1000, 'Nội dung không được quá 1000 ký tự']
  },
  type: {
    type: String,
    enum: {
      values: ['info', 'success', 'warning', 'error'],
      message: 'Loại thông báo phải là info, success, warning hoặc error'
    },
    required: [true, 'Loại thông báo là bắt buộc'],
    default: 'info'
  },
  isRead: {
    type: Boolean,
    required: true,
    default: false
  },
  relatedType: {
    type: String,
    trim: true,
    maxlength: [50, 'Loại liên quan không được quá 50 ký tự']
  },
  relatedId: {
    type: Schema.Types.ObjectId,
    refPath: 'relatedType'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // Automatically add createdAt and updatedAt
  collection: 'notifications'
});

// Indexes for better query performance
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

// Compound index for common queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// Static method to get unread notifications for a user
notificationSchema.statics.getUnreadNotifications = function(userId: mongoose.Types.ObjectId, limit: number = 20) {
  return this.find({ userId, isRead: false })
    .populate('createdBy', 'name studentId')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get all notifications for a user
notificationSchema.statics.getUserNotifications = function(
  userId: mongoose.Types.ObjectId, 
  options: { limit?: number; page?: number; unreadOnly?: boolean } = {}
) {
  const { limit = 20, page = 1, unreadOnly = false } = options;
  const skip = (page - 1) * limit;
  
  const query: any = { userId };
  if (unreadOnly) {
    query.isRead = false;
  }
  
  return this.find(query)
    .populate('createdBy', 'name studentId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = function(userId: mongoose.Types.ObjectId) {
  return this.countDocuments({ userId, isRead: false });
};

// Static method to mark notification as read
notificationSchema.statics.markAsRead = function(notificationId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId) {
  return this.findOneAndUpdate(
    { _id: notificationId, userId }, // Ensure user can only mark their own notifications as read
    { 
      isRead: true, 
      readAt: new Date() 
    },
    { new: true }
  );
};

// Static method to mark all notifications as read for a user
notificationSchema.statics.markAllAsRead = function(userId: mongoose.Types.ObjectId) {
  return this.updateMany(
    { userId, isRead: false },
    { 
      isRead: true, 
      readAt: new Date() 
    }
  );
};

// Static method to create notifications for multiple users
notificationSchema.statics.createForUsers = async function(
  userIds: mongoose.Types.ObjectId[],
  notificationData: {
    title: string;
    message: string;
    type: NotificationType;
    relatedType?: string;
    relatedId?: mongoose.Types.ObjectId;
    createdBy?: mongoose.Types.ObjectId;
  }
) {
  const notifications = userIds.map(userId => ({
    userId,
    ...notificationData,
    isRead: false
  }));
  
  return this.insertMany(notifications);
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Ensure virtual fields are serialized
notificationSchema.set('toJSON', {
  transform: function(doc, ret: any) {
    // Convert ObjectIds to strings for JSON serialization
    if (ret.userId && typeof ret.userId === 'object' && !ret.userId.name) {
      ret.userId = ret.userId.toString();
    }
    // Only convert createdBy to string if it's not populated (doesn't have name property)
    // If it's populated, keep it as object with name and studentId
    if (ret.createdBy && typeof ret.createdBy === 'object' && ret.createdBy !== null) {
      // If it's just an ObjectId (not populated), convert to string
      if (!ret.createdBy.name && !ret.createdBy.studentId) {
        ret.createdBy = ret.createdBy.toString();
      }
      // If it's populated, keep it as object (it already has name and studentId)
    }
    if (ret.relatedId && typeof ret.relatedId === 'object' && ret.relatedId !== null) {
      ret.relatedId = ret.relatedId.toString();
    }
    return ret;
  }
});

// Create and export the model
const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;

