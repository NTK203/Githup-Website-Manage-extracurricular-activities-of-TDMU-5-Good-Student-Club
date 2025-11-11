const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB directly
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Contact Request Schema
const contactRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    default: 'PENDING'
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  adminNotes: {
    type: String,
    maxlength: 1000
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

const ContactRequest = mongoose.model('ContactRequest', contactRequestSchema);

// Sample contact requests data
const sampleContactRequests = [
  {
    userName: 'Nguyễn Văn A',
    userEmail: 'nguyenvana@example.com',
    subject: 'Tài khoản bị khóa không rõ lý do',
    message: 'Tôi đã đăng ký thành viên CLB từ 2 tuần trước nhưng tài khoản bỗng nhiên bị khóa. Tôi không biết lý do tại sao và mong admin có thể giúp tôi kiểm tra lại.',
    status: 'PENDING',
    priority: 'HIGH',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
  },
  {
    userName: 'Trần Thị B',
    userEmail: 'tranthib@example.com',
    subject: 'Không thể đăng nhập vào hệ thống',
    message: 'Tôi đã thử đăng nhập nhiều lần nhưng hệ thống báo lỗi "Tài khoản không hoạt động". Tôi đã là thành viên CLB từ năm ngoái và chưa bao giờ gặp vấn đề này.',
    status: 'IN_PROGRESS',
    priority: 'URGENT',
    adminNotes: 'Đã kiểm tra - tài khoản bị vô hiệu hóa do vi phạm nội quy. Cần liên hệ trực tiếp để giải thích.',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
  },
  {
    userName: 'Lê Văn C',
    userEmail: 'levanc@example.com',
    subject: 'Yêu cầu kích hoạt lại tài khoản',
    message: 'Tôi xin lỗi vì đã vi phạm nội quy CLB. Tôi đã hiểu rõ lỗi lầm và cam kết sẽ tuân thủ đúng quy định. Mong admin xem xét cho phép tôi tham gia lại CLB.',
    status: 'RESOLVED',
    priority: 'MEDIUM',
    adminNotes: 'Đã xem xét và chấp thuận. Tài khoản đã được kích hoạt lại.',
    resolvedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
  },
  {
    userName: 'Phạm Thị D',
    userEmail: 'phamthid@example.com',
    subject: 'Thắc mắc về quyền truy cập',
    message: 'Tôi thấy tài khoản của mình bị hạn chế quyền truy cập. Tôi không hiểu tại sao vì tôi đã tham gia đầy đủ các hoạt động và tuân thủ nội quy.',
    status: 'CLOSED',
    priority: 'LOW',
    adminNotes: 'Vấn đề đã được giải quyết - do lỗi hệ thống tạm thời.',
    resolvedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
  },
  {
    userName: 'Hoàng Văn E',
    userEmail: 'hoangvane@example.com',
    subject: 'Không nhận được thông báo hoạt động',
    message: 'Tôi đã đăng ký tham gia hoạt động "Mùa hè xanh" nhưng không nhận được thông báo xác nhận. Tôi lo lắng có thể bị bỏ sót.',
    status: 'PENDING',
    priority: 'MEDIUM',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
  },
  {
    userName: 'Vũ Thị F',
    userEmail: 'vuthif@example.com',
    subject: 'Yêu cầu cập nhật thông tin cá nhân',
    message: 'Tôi đã thay đổi số điện thoại và địa chỉ email. Tôi muốn cập nhật thông tin này trong hệ thống để nhận được thông báo chính xác.',
    status: 'PENDING',
    priority: 'LOW',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
  }
];

async function seedContactRequests() {
  try {
    console.log('🌱 Bắt đầu seed dữ liệu contact requests...');

    // Wait for connection
    await mongoose.connection.db.admin().ping();
    console.log('✅ Đã kết nối database');

    // Clear existing contact requests
    await ContactRequest.deleteMany({});
    console.log('✅ Đã xóa dữ liệu contact requests cũ');

    // Get a sample user ID (you may need to adjust this based on your actual user data)
    const User = mongoose.model('User');
    const sampleUser = await User.findOne({ role: 'STUDENT' });
    
    if (!sampleUser) {
      console.log('⚠️ Không tìm thấy user mẫu. Tạo contact requests với userId mặc định...');
    }

    // Create contact requests
    const contactRequests = sampleContactRequests.map(request => ({
      ...request,
      userId: sampleUser ? sampleUser._id : new mongoose.Types.ObjectId(),
      resolvedBy: request.status === 'RESOLVED' || request.status === 'CLOSED' 
        ? (sampleUser ? sampleUser._id : new mongoose.Types.ObjectId()) 
        : undefined
    }));

    await ContactRequest.insertMany(contactRequests);
    console.log(`✅ Đã tạo ${contactRequests.length} contact requests mẫu`);

    // Display summary
    const stats = await ContactRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\n📊 Thống kê contact requests:');
    stats.forEach(stat => {
      console.log(`  - ${stat._id}: ${stat.count}`);
    });

    console.log('\n🎉 Hoàn thành seed dữ liệu contact requests!');
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the seed function
seedContactRequests();
