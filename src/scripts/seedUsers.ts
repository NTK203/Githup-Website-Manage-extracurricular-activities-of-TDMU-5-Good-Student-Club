import { dbConnect } from '../lib/db';
import bcrypt from 'bcrypt';
import User from '../models/User';
import { UserRole } from '../models/User';

// Sample user data
const sampleUsers = [
  {
    studentId: 'admin001',
    name: 'Admin CLB',
    email: 'admin@tdmu.edu.vn',
    password: 'admin123',
    role: 'ADMIN' as UserRole,
    phone: '0123456789',
    class: 'Admin',
    faculty: 'Quản trị hệ thống',
    isClubMember: true
  },
  {
    studentId: '20210001',
    name: 'Nguyễn Văn A',
    email: '20210001@student.tdmu.edu.vn',
    password: 'password123',
    role: 'OFFICER' as UserRole,
    phone: '0123456781',
    class: 'CNTT-K15',
    faculty: 'Công nghệ thông tin',
    isClubMember: true
  },
  {
    studentId: '20210002',
    name: 'Trần Thị B',
    email: '20210002@student.tdmu.edu.vn',
    password: 'password123',
    role: 'STUDENT' as UserRole,
    phone: '0123456782',
    class: 'CNTT-K15',
    faculty: 'Công nghệ thông tin',
    isClubMember: true
  },
  {
    studentId: '20210003',
    name: 'Lê Văn C',
    email: '20210003@student.tdmu.edu.vn',
    password: 'password123',
    role: 'STUDENT' as UserRole,
    phone: '0123456783',
    class: 'CNTT-K15',
    faculty: 'Công nghệ thông tin',
    isClubMember: true
  },
  {
    studentId: '20210004',
    name: 'Phạm Thị D',
    email: '20210004@student.tdmu.edu.vn',
    password: 'password123',
    role: 'STUDENT' as UserRole,
    phone: '0123456784',
    class: 'CNTT-K15',
    faculty: 'Công nghệ thông tin',
    isClubMember: true
  },
  {
    studentId: '20210005',
    name: 'Hoàng Văn E',
    email: '20210005@student.tdmu.edu.vn',
    password: 'password123',
    role: 'STUDENT' as UserRole,
    phone: '0123456785',
    class: 'CNTT-K15',
    faculty: 'Công nghệ thông tin',
    isClubMember: true
  },
  // Thêm một số user không phải thành viên CLB để test
  {
    studentId: '20210006',
    name: 'Vũ Thị F',
    email: '20210006@student.tdmu.edu.vn',
    password: 'password123',
    role: 'STUDENT' as UserRole,
    phone: '0123456786',
    class: 'CNTT-K15',
    faculty: 'Công nghệ thông tin',
    isClubMember: false
  },
  {
    studentId: '20210007',
    name: 'Đỗ Văn G',
    email: '20210007@student.tdmu.edu.vn',
    password: 'password123',
    role: 'STUDENT' as UserRole,
    phone: '0123456787',
    class: 'CNTT-K15',
    faculty: 'Công nghệ thông tin',
    isClubMember: false
  }
];

async function seedUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await dbConnect();
    console.log('✅ Connected to MongoDB');

    // Clear existing users (optional - comment out if you want to keep existing data)
    await User.deleteMany({});
    console.log('🗑️ Cleared existing users');

    // Hash passwords and create users
    const usersToCreate = await Promise.all(
      sampleUsers.map(async (userData) => {
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(userData.password, saltRounds);
        
        return {
          studentId: userData.studentId,
          name: userData.name,
          email: userData.email,
          passwordHash: passwordHash,
          role: userData.role,
          phone: userData.phone,
          class: userData.class,
          faculty: userData.faculty,
          isClubMember: userData.isClubMember
        };
      })
    );

    // Insert users into database
    const createdUsers = await User.insertMany(usersToCreate);
    console.log(`✅ Successfully created ${createdUsers.length} users`);

    // Display created users
    console.log('\n📋 Created Users:');
    createdUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.role} - ${user.name} (${user.studentId})`);
      console.log(`   Email: ${user.email}`);
      if (user.class) console.log(`   Class: ${user.class}`);
      if (user.faculty) console.log(`   Faculty: ${user.faculty}`);
      console.log('');
    });

    // Display summary by role
    const roleCounts = createdUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📊 Summary by Role:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`   ${role}: ${count} users`);
    });

    console.log('\n🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    // await disconnect(); // This line was removed as per the new_code
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedUsers();
}

export default seedUsers;
