import mongoose, { Document, Schema } from 'mongoose';

export interface IBanner extends Document {
  title: string;
  imageUrl: string;
  link?: string;
  imageFit?: string; // Cách hiển thị ảnh: cover, contain, fill, scale-down
  order: number; // Thứ tự hiển thị
  isActive: boolean; // Có hiển thị hay không
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>({
  title: {
    type: String,
    required: [true, 'Tiêu đề banner là bắt buộc'],
    trim: true,
    maxlength: [200, 'Tiêu đề không được quá 200 ký tự']
  },
  imageUrl: {
    type: String,
    required: [true, 'URL ảnh banner là bắt buộc'],
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'URL ảnh không hợp lệ'
    }
  },
  link: {
    type: String,
    trim: true,
    default: null,
    validate: {
      validator: function(v: string | null) {
        if (!v) return true; // Optional
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Link không hợp lệ'
    }
  },
  imageFit: {
    type: String,
    enum: ['cover', 'contain', 'fill', 'scale-down', 'none'],
    default: 'cover'
  },
  order: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Thứ tự phải lớn hơn hoặc bằng 0']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Người tạo là bắt buộc']
  }
}, {
  timestamps: true,
  collection: 'banners'
});

// Indexes
bannerSchema.index({ isActive: 1, order: 1 });
bannerSchema.index({ createdAt: -1 });

const Banner = mongoose.models.Banner || mongoose.model<IBanner>('Banner', bannerSchema);

export default Banner;
