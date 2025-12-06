import mongoose, { Document, Schema } from 'mongoose';

export interface INews extends Document {
  title: string;
  content: string;
  imageUrl?: string; // Deprecated, use imageUrls instead
  imageUrls?: string[]; // Array of image URLs (max 10)
  pdfUrl?: string;
  author: mongoose.Types.ObjectId;
  isPinned: boolean;
  likes: mongoose.Types.ObjectId[];
  comments: mongoose.Types.ObjectId[]; // Array of comment IDs
  createdAt: Date;
  updatedAt: Date;
}

const newsSchema = new Schema<INews>({
  title: {
    type: String,
    required: [true, 'Tiêu đề là bắt buộc'],
    trim: true,
    maxlength: [200, 'Tiêu đề không được quá 200 ký tự']
  },
  content: {
    type: String,
    required: [true, 'Nội dung là bắt buộc'],
    trim: true
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
  imageUrls: {
    type: [String],
    default: [],
    validate: {
      validator: function(v: string[]) {
        if (!v || v.length === 0) return true; // Optional
        if (v.length > 10) return false; // Max 10 images
        return v.every(url => /^https?:\/\/.+/.test(url));
      },
      message: 'Tối đa 10 ảnh và URL ảnh phải hợp lệ'
    }
  },
  pdfUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Optional
        return /^https?:\/\/.+/.test(v);
      },
      message: 'URL PDF không hợp lệ'
    }
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Tác giả là bắt buộc']
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment' // Có thể tạo model Comment sau nếu cần
  }]
}, {
  timestamps: true,
  collection: 'news'
});

// Indexes
newsSchema.index({ author: 1 });
newsSchema.index({ isPinned: -1, createdAt: -1 });
newsSchema.index({ createdAt: -1 });

const News = mongoose.models.News || mongoose.model<INews>('News', newsSchema);

export default News;

