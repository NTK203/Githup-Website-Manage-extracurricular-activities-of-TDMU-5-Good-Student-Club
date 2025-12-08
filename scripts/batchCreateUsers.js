/**
 * Script to batch create 20 test users
 * Run: node scripts/batchCreateUsers.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

console.log('🚀 Starting batch create users script...');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Found' : 'Not found');

// User Schema (simplified for script)
const userSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['SUPER_ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER', 'CLUB_STUDENT', 'STUDENT'],
    required: true 
  },
  phone: String,
  class: String,
  faculty: String,
  isClubMember: { type: Boolean, default: false },
  avatarUrl: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Membership Schema
const membershipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'REMOVED'],
    default: 'PENDING' 
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Membership = mongoose.models.Membership || mongoose.model('Membership', membershipSchema);

// Users data
const usersData = [
  // 1️⃣ CLUB_DEPUTY (5 người)
  {
    studentId: '2124802010111',
    name: 'Trần Minh Khôi',
    email: '2124802010111@student.tdmu.edu.vn',
    class: 'D2XCNTT01',
    faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
    role: 'CLUB_DEPUTY',
    isClubMember: true
  },
  {
    studentId: '2124802010222',
    name: 'Nguyễn Thị Lan Anh',
    email: '2124802010222@student.tdmu.edu.vn',
    class: 'D2XCNTT01',
    faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
    role: 'CLUB_DEPUTY',
    isClubMember: true
  },
  {
    studentId: '2124802010333',
    name: 'Lê Hoàng Nam',
    email: '2124802010333@student.tdmu.edu.vn',
    class: 'D2XCNTT02',
    faculty: 'Viện Kỹ Thuật Công Nghệ',
    role: 'CLUB_DEPUTY',
    isClubMember: true
  },
  {
    studentId: '2124802010444',
    name: 'Phạm Gia Huy',
    email: '2124802010444@student.tdmu.edu.vn',
    class: 'D2XCNTT02',
    faculty: 'Viện Kỹ Thuật Công Nghệ',
    role: 'CLUB_DEPUTY',
    isClubMember: true
  },
  {
    studentId: '2124802010555',
    name: 'Võ Ngọc Bích',
    email: '2124802010555@student.tdmu.edu.vn',
    class: 'D2XCNTT03',
    faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
    role: 'CLUB_DEPUTY',
    isClubMember: true
  },
  // 2️⃣ CLUB_MEMBER (5 người)
  {
    studentId: '2124802010666',
    name: 'Nguyễn Đức Thịnh',
    email: '2124802010666@student.tdmu.edu.vn',
    class: 'D2XCNTT03',
    faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
    role: 'CLUB_MEMBER',
    isClubMember: true
  },
  {
    studentId: '2124802010777',
    name: 'Đặng Thu Uyên',
    email: '2124802010777@student.tdmu.edu.vn',
    class: 'D2XCNTT03',
    faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
    role: 'CLUB_MEMBER',
    isClubMember: true
  },
  {
    studentId: '2124802010888',
    name: 'Bùi Anh Tuấn',
    email: '2124802010888@student.tdmu.edu.vn',
    class: 'D2XCNTT04',
    faculty: 'Viện Kỹ Thuật Công Nghệ',
    role: 'CLUB_MEMBER',
    isClubMember: true
  },
  {
    studentId: '2124802010999',
    name: 'Lý Phương Nhi',
    email: '2124802010999@student.tdmu.edu.vn',
    class: 'D2XCNTT04',
    faculty: 'Viện Kỹ Thuật Công Nghệ',
    role: 'CLUB_MEMBER',
    isClubMember: true
  },
  {
    studentId: '2124802010100',
    name: 'Hồ Quang Hậu',
    email: '2124802010100@student.tdmu.edu.vn',
    class: 'D2XCNTT05',
    faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
    role: 'CLUB_MEMBER',
    isClubMember: true
  },
  // 3️⃣ CLUB_STUDENT (5 người)
  {
    studentId: '2124802010112',
    name: 'Trương Thế Bảo',
    email: '2124802010112@student.tdmu.edu.vn',
    class: 'D2XKTPM01',
    faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
    role: 'CLUB_STUDENT',
    isClubMember: true
  },
  {
    studentId: '2124802010113',
    name: 'Nguyễn Khánh Linh',
    email: '2124802010113@student.tdmu.edu.vn',
    class: 'D2XKTPM01',
    faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
    role: 'CLUB_STUDENT',
    isClubMember: true
  },
  {
    studentId: '2124802010114',
    name: 'Phạm Minh Tài',
    email: '2124802010114@student.tdmu.edu.vn',
    class: 'D2XKTPM02',
    faculty: 'Viện Kỹ Thuật Công Nghệ',
    role: 'CLUB_STUDENT',
    isClubMember: true
  },
  {
    studentId: '2124802010115',
    name: 'Lâm Thúy Vy',
    email: '2124802010115@student.tdmu.edu.vn',
    class: 'D2XKTPM02',
    faculty: 'Viện Kỹ Thuật Công Nghệ',
    role: 'CLUB_STUDENT',
    isClubMember: true
  },
  {
    studentId: '2124802010116',
    name: 'Võ Nhật Hào',
    email: '2124802010116@student.tdmu.edu.vn',
    class: 'D2XKTPM03',
    faculty: 'Viện Đào Tạo CNTT Chuyển Đổi Số',
    role: 'CLUB_STUDENT',
    isClubMember: true
  },
  // 4️⃣ STUDENT (không thuộc CLB - 5 người)
  {
    studentId: '2124802010117',
    name: 'Nguyễn Quốc Bảo',
    email: '2124802010117@student.tdmu.edu.vn',
    class: 'D2XQTKD01',
    faculty: 'Trường Kinh Tế Tài Chính',
    role: 'STUDENT',
    isClubMember: false
  },
  {
    studentId: '2124802010118',
    name: 'Lê Thị Mỹ Duyên',
    email: '2124802010118@student.tdmu.edu.vn',
    class: 'D2XQTKD01',
    faculty: 'Trường Kinh Tế Tài Chính',
    role: 'STUDENT',
    isClubMember: false
  },
  {
    studentId: '2124802010119',
    name: 'Phan Hữu Phúc',
    email: '2124802010119@student.tdmu.edu.vn',
    class: 'D2XLUAT01',
    faculty: 'Trường Luật Và Quản Lí Phát Triển',
    role: 'STUDENT',
    isClubMember: false
  },
  {
    studentId: '2124802010120',
    name: 'Trịnh Ngọc Yến',
    email: '2124802010120@student.tdmu.edu.vn',
    class: 'D2XNNANH01',
    faculty: 'Viện Đào Tạo Ngoại Ngữ',
    role: 'STUDENT',
    isClubMember: false
  },
  {
    studentId: '2124802010121',
    name: 'Đoàn Minh Tường',
    email: '2124802010121@student.tdmu.edu.vn',
    class: 'D2XSP01',
    faculty: 'Khoa Sư Phạm',
    role: 'STUDENT',
    isClubMember: false
  }
];

const password = 'Abc@123';

async function batchCreateUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Hash password once
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('✅ Password hashed');

    const results = {
      created: [],
      skipped: [],
      failed: []
    };

    // Get admin user ID for membership approval (try to find any SUPER_ADMIN or CLUB_LEADER)
    let adminUserId = null;
    try {
      const adminUser = await User.findOne({ 
        role: { $in: ['SUPER_ADMIN', 'CLUB_LEADER'] } 
      });
      if (adminUser) {
        adminUserId = adminUser._id;
        console.log(`✅ Found admin user: ${adminUser.name} (${adminUser.role})`);
      }
    } catch (err) {
      console.warn('⚠️  Could not find admin user for membership approval');
    }

    console.log(`\n🔄 Processing ${usersData.length} users...\n`);

    // Process each user
    for (let i = 0; i < usersData.length; i++) {
      const userData = usersData[i];
      const index = i + 1;

      try {
        // Check if user already exists
        const existingUser = await User.findOne({
          $or: [{ studentId: userData.studentId }, { email: userData.email }]
        });

        if (existingUser) {
          console.log(`⏭️  [${index}/${usersData.length}] SKIPPED: ${userData.name} (${userData.studentId}) - Already exists`);
          results.skipped.push({
            studentId: userData.studentId,
            name: userData.name,
            reason: 'User already exists'
          });
          continue;
        }

        // Create new user
        const newUser = new User({
          studentId: userData.studentId,
          name: userData.name,
          email: userData.email.toLowerCase(),
          passwordHash: hashedPassword,
          role: userData.role,
          class: userData.class,
          faculty: userData.faculty,
          isClubMember: userData.isClubMember
        });

        await newUser.save();
        console.log(`✅ [${index}/${usersData.length}] CREATED: ${userData.name} (${userData.studentId}) - ${userData.role}`);

        // Create membership record for club members
        if (userData.isClubMember && adminUserId) {
          try {
            const newMembership = new Membership({
              userId: newUser._id,
              status: 'ACTIVE',
              approvedBy: adminUserId
            });
            await newMembership.save();
            console.log(`   └─ Membership created (ACTIVE)`);
          } catch (membershipError) {
            console.warn(`   ⚠️  Failed to create membership: ${membershipError.message}`);
          }
        }

        results.created.push({
          studentId: userData.studentId,
          name: userData.name,
          email: userData.email,
          role: userData.role
        });

      } catch (error) {
        console.error(`❌ [${index}/${usersData.length}] FAILED: ${userData.name} (${userData.studentId})`);
        console.error(`   Error: ${error.message}`);
        results.failed.push({
          studentId: userData.studentId,
          name: userData.name,
          error: error.message
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total users: ${usersData.length}`);
    console.log(`✅ Created: ${results.created.length}`);
    console.log(`⏭️  Skipped: ${results.skipped.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log('='.repeat(60));

    if (results.skipped.length > 0) {
      console.log('\n⏭️  Skipped users:');
      results.skipped.forEach(user => {
        console.log(`   - ${user.name} (${user.studentId}): ${user.reason}`);
      });
    }

    if (results.failed.length > 0) {
      console.log('\n❌ Failed users:');
      results.failed.forEach(user => {
        console.log(`   - ${user.name} (${user.studentId}): ${user.error}`);
      });
    }

    if (results.created.length > 0) {
      console.log('\n✅ Successfully created users:');
      console.log(`   All users have password: ${password}`);
      console.log('\n   Role breakdown:');
      const roleCount = {};
      results.created.forEach(user => {
        roleCount[user.role] = (roleCount[user.role] || 0) + 1;
      });
      Object.entries(roleCount).forEach(([role, count]) => {
        console.log(`   - ${role}: ${count}`);
      });
    }

    console.log('\n✅ Batch creation completed!');

  } catch (error) {
    console.error('❌ Error in batch create:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
batchCreateUsers();
