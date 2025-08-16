import { dbConnect } from '../lib/db';
import Membership from '../models/Membership';
import User from '../models/User';

async function seedMemberships() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await dbConnect();
    console.log('✅ Connected to MongoDB');

    // Clear existing memberships
    await Membership.deleteMany({});
    console.log('🗑️ Cleared existing memberships');

    // Get all users from database
    const users = await User.find({}).select('_id studentId name role');
    console.log(`📋 Found ${users.length} users in database`);

    if (users.length === 0) {
      console.log('❌ No users found. Please run seed users first.');
      return;
    }

    // Create sample memberships
    const sampleMemberships = [];

    // Get admin user for approval
    const adminUser = users.find(u => u.role === 'ADMIN');
    if (!adminUser) {
      console.log('❌ No admin user found for approval');
      return;
    }

    // Create memberships for different scenarios
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      // Skip admin users (they don't need to apply for membership)
      if (user.role === 'ADMIN') continue;

      // Create different types of memberships
      if (i % 4 === 0) {
        // PENDING memberships (25%)
        sampleMemberships.push({
          userId: user._id,
          status: 'PENDING',
          joinedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random date within last 7 days
        });
      } else if (i % 4 === 1) {
        // ACTIVE memberships (25%)
        sampleMemberships.push({
          userId: user._id,
          status: 'ACTIVE',
          joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
          approvedBy: adminUser._id,
          approvedAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) // Approved within last 20 days
        });
      } else if (i % 4 === 2) {
        // REJECTED memberships (25%)
        sampleMemberships.push({
          userId: user._id,
          status: 'REJECTED',
          joinedAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000), // Random date within last 14 days
          rejectedAt: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000), // Rejected within last 10 days
          rejectionReason: 'Không đủ tiêu chí tham gia CLB. Vui lòng cải thiện điểm số và hoạt động ngoại khóa.'
        });
      } else {
        // No membership (25%) - these users won't have any membership record
        continue;
      }
    }

    // Insert memberships
    const createdMemberships = await Membership.insertMany(sampleMemberships);
    console.log(`✅ Successfully created ${createdMemberships.length} memberships`);

    // Display summary
    console.log('\n📊 Membership Summary:');
    const pendingCount = createdMemberships.filter(m => m.status === 'PENDING').length;
    const activeCount = createdMemberships.filter(m => m.status === 'ACTIVE').length;
    const rejectedCount = createdMemberships.filter(m => m.status === 'REJECTED').length;
    
    console.log(`   PENDING: ${pendingCount} memberships`);
    console.log(`   ACTIVE: ${activeCount} memberships`);
    console.log(`   REJECTED: ${rejectedCount} memberships`);
    console.log(`   NO MEMBERSHIP: ${users.length - createdMemberships.length} users`);

    // Display some examples
    console.log('\n📋 Sample Memberships:');
    for (let i = 0; i < Math.min(5, createdMemberships.length); i++) {
      const membership = createdMemberships[i];
      const user = users.find(u => u._id.toString() === membership.userId.toString());
      console.log(`${i + 1}. ${user?.name} (${user?.studentId}) - ${membership.status}`);
      if (membership.status === 'REJECTED' && membership.rejectionReason) {
        console.log(`   Reason: ${membership.rejectionReason}`);
      }
    }

    console.log('\n🎉 Membership seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding memberships:', error);
    process.exit(1);
  } finally {
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedMemberships();
}

export default seedMemberships;
