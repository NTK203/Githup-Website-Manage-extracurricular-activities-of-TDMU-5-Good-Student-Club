import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  newsId: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content: string;
  imageUrl?: string; // Image attachment for comment
  parentId?: mongoose.Types.ObjectId; // For nested comments/replies
  likes: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>({
  newsId: {
    type: Schema.Types.ObjectId,
    ref: 'News',
    required: [true, 'News ID là bắt buộc'],
    index: true
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Tác giả là bắt buộc']
  },
  content: {
    type: String,
    required: false, // Allow empty content if imageUrl is provided
    trim: true,
    maxlength: [1000, 'Nội dung bình luận không được quá 1000 ký tự'],
    default: ''
  },
  imageUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Optional
        return /^https?:\/\/.+/.test(v);
      },
      message: 'URL ảnh không hợp lệ'
    }
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  collection: 'comments'
});

// Indexes
commentSchema.index({ newsId: 1, createdAt: -1 });
commentSchema.index({ parentId: 1 });

const Comment = mongoose.models.Comment || mongoose.model<IComment>('Comment', commentSchema);

export default Comment;

