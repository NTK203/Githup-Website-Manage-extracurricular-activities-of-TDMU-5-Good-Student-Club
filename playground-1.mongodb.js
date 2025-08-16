/* global use, db */
// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

const database = 'db-sv5tot-tdmu';

// The current database to use.
use(database);

// ========================================
// 1. CREATE COLLECTIONS
// ========================================

// Create users collection if not exists
if (!db.getCollectionNames().includes('users')) {
  db.createCollection('users');
  print("✅ Created users collection");
}

// Create memberships collection if not exists
if (!db.getCollectionNames().includes('memberships')) {
  db.createCollection('memberships');
  print("✅ Created memberships collection");
}

// ========================================
// 2. CREATE INDEXES
// ========================================

// Users indexes
db.users.createIndex({ "studentId": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "faculty": 1 });
db.users.createIndex({ "class": 1 });
db.users.createIndex({ "isClubMember": 1 });

// Memberships indexes
db.memberships.createIndex({ "userId": 1, "status": 1 });
db.memberships.createIndex({ "status": 1 });
db.memberships.createIndex({ "approvedBy": 1 });
db.memberships.createIndex({ "joinedAt": -1 });
db.memberships.createIndex({ "approvedAt": -1 });
// Ensure only one active membership per user
db.memberships.createIndex({ "userId": 1, "status": 1 }, { 
  unique: true,
  partialFilterExpression: { status: "ACTIVE" }
});

print("✅ Created all indexes");

// ========================================
// 3. SAMPLE DATA - USERS
// ========================================

// Clear existing data
db.users.deleteMany({});
db.memberships.deleteMany({});

// Insert sample users
db.users.insertMany([
  {
    studentId: "21100011",
    name: "Nguyễn Văn A",
    email: "21100011@student.tdmu.edu.vn",
    passwordHash: "$2b$12$tAMQKhFGvteCQrZMcJW4ruNeG1q/KPDgZaXAvvfGJliQu/rnfmx2m",
    role: "STUDENT",
    phone: "0934567890",
    class: "D21CNPM1",
    faculty: "Khoa CNTT",
    isClubMember: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    studentId: "21100012",
    name: "Lê Thị B",
    email: "21100012@student.tdmu.edu.vn",
    passwordHash: "$2b$12$3.RfYSoIOGWOV5iO54P71uj3mZ976CNJvZbER9JTNA.QCLZBn5BDu",
    role: "STUDENT",
    phone: "0934567891",
    class: "D21CNPM1",
    faculty: "Khoa CNTT",
    isClubMember: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    studentId: "21100013",
    name: "Phạm Văn C",
    email: "21100013@student.tdmu.edu.vn",
    passwordHash: "$2b$12$/6dwtd0ApbVV6yTL9V52FuFaegPjA01nnAj/pU1bJctrUv3V416Oa",
    role: "STUDENT",
    phone: "0934567892",
    class: "D21CNPM2",
    faculty: "Khoa CNTT",
    isClubMember: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    studentId: "21100022",
    name: "Trần Thị B",
    email: "21100022@student.tdmu.edu.vn",
    passwordHash: "$2b$12$vDEd42lirRXLnwbXRxJv0e1S99DruURWI7DjD7dF7BfUZd1zRtlXW",
    role: "OFFICER",
    phone: "0939876543",
    class: "D21QTKD2",
    faculty: "Khoa QTKD",
    avatarUrl: "https://res.cloudinary.com/image-sv5t-tdmu/image/upload/v1/avatars/officer1.jpg",
    isClubMember: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    studentId: "21100023",
    name: "Hoàng Văn D",
    email: "21100023@student.tdmu.edu.vn",
    passwordHash: "$2b$12$IcZlVjoC1g7HN1CcNKih1eXa.AhqJeNrLw9cm3eGwvjQAR3Ch01m2",
    role: "OFFICER",
    phone: "0939876544",
    class: "D21QTKD2",
    faculty: "Khoa QTKD",
    avatarUrl: "https://res.cloudinary.com/image-sv5t-tdmu/image/upload/v1/avatars/officer2.jpg",
    isClubMember: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    studentId: "21100024",
    name: "Vũ Thị E",
    email: "21100024@student.tdmu.edu.vn",
    passwordHash: "$2b$12$TQvEnv/olGezbgUm7mNw/epzqQ4M47GJqTT.R8vKTCednCLaSzVFe",
    role: "OFFICER",
    phone: "0939876545",
    class: "D21QTKD1",
    faculty: "Khoa QTKD",
    isClubMember: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    studentId: "admin001",
    name: "Admin Hệ thống",
    email: "admin@tdmu.edu.vn",
    passwordHash: "$2b$12$3a2ytCv94gTAgnBvN.5ql.drf8VBe6fWnec2rOJNQ/VXS75.drOPu",
    role: "ADMIN",
    avatarUrl: "https://res.cloudinary.com/dbtknid43/image/upload/v1755073728/avatars/user_689c3e44e5994eb2bb0096fa_1755073726986.jpg",
    phone: "0987654321",
    isClubMember: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    studentId: "admin002",
    name: "Quản trị viên CLB",
    email: "admin.clb@tdmu.edu.vn",
    passwordHash: "$2b$12$3yxdYKQoj8GaYV1bd/VaBuWlFbcNMdYVOhIn0QfJSz7YATn7c5SsS",
    role: "ADMIN",
    avatarUrl: "https://res.cloudinary.com/dbtknid43/image/upload/v1755073655/avatars/user_689c3e44e5994eb2bb0096fb_1755073653064.jpg",
    isClubMember: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print("✅ Inserted sample users");

// ========================================
// 4. SAMPLE DATA - MEMBERSHIPS
// ========================================

// Get user IDs for reference
const adminUser = db.users.findOne({ role: "ADMIN" });
const studentUsers = db.users.find({ role: "STUDENT" }).toArray();
const officerUsers = db.users.find({ role: "OFFICER" }).toArray();

// Create sample memberships
const sampleMemberships = [];

// Add PENDING memberships for some students
studentUsers.slice(0, 2).forEach((user, index) => {
  sampleMemberships.push({
    userId: user._id,
    status: "PENDING",
    joinedAt: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000), // 1-2 days ago
    createdAt: new Date(),
    updatedAt: new Date()
  });
});

// Add ACTIVE memberships for officers and some students
[...officerUsers, ...studentUsers.slice(2, 3)].forEach((user, index) => {
  sampleMemberships.push({
    userId: user._id,
    status: "ACTIVE",
    joinedAt: new Date(Date.now() - (index + 10) * 24 * 60 * 60 * 1000), // 10+ days ago
    approvedBy: adminUser._id,
    approvedAt: new Date(Date.now() - (index + 5) * 24 * 60 * 60 * 1000), // 5+ days ago
    createdAt: new Date(),
    updatedAt: new Date()
  });
});

// Add REJECTED memberships for some students
studentUsers.slice(3, 4).forEach((user, index) => {
  sampleMemberships.push({
    userId: user._id,
    status: "REJECTED",
    joinedAt: new Date(Date.now() - (index + 15) * 24 * 60 * 60 * 1000), // 15+ days ago
    rejectedAt: new Date(Date.now() - (index + 12) * 24 * 60 * 60 * 1000), // 12+ days ago
    rejectionReason: "Không đủ tiêu chí tham gia CLB. Vui lòng cải thiện điểm số và hoạt động ngoại khóa.",
    createdAt: new Date(),
    updatedAt: new Date()
  });
});

// Insert memberships
db.memberships.insertMany(sampleMemberships);

print("✅ Inserted sample memberships");

// ========================================
// 5. QUERIES AND REPORTS
// ========================================

print("\n📊 DATABASE SUMMARY:");
print("=====================");

// Users summary
const totalUsers = db.users.countDocuments();
const clubMembers = db.users.countDocuments({ isClubMember: true });
const nonClubMembers = db.users.countDocuments({ isClubMember: false });

print(`👥 Users: ${totalUsers} total`);
print(`   - Club members: ${clubMembers}`);
print(`   - Non-club members: ${nonClubMembers}`);

// Users by role
const usersByRole = db.users.aggregate([
  { $group: { _id: "$role", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]).toArray();

print("\n👤 Users by role:");
usersByRole.forEach(role => {
  print(`   - ${role._id}: ${role.count}`);
});

// Memberships summary
const totalMemberships = db.memberships.countDocuments();
const pendingMemberships = db.memberships.countDocuments({ status: "PENDING" });
const activeMemberships = db.memberships.countDocuments({ status: "ACTIVE" });
const rejectedMemberships = db.memberships.countDocuments({ status: "REJECTED" });

print(`\n📝 Memberships: ${totalMemberships} total`);
print(`   - PENDING: ${pendingMemberships}`);
print(`   - ACTIVE: ${activeMemberships}`);
print(`   - REJECTED: ${rejectedMemberships}`);

// ========================================
// 6. USEFUL QUERIES
// ========================================

print("\n🔍 USEFUL QUERIES:");
print("==================");

// 1. Get all pending membership applications with user details
print("\n1. Pending membership applications:");
const pendingWithUsers = db.memberships.aggregate([
  { $match: { status: "PENDING" } },
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
    }
  },
  { $unwind: "$user" },
  {
    $project: {
      _id: 1,
      status: 1,
      joinedAt: 1,
      "user.name": 1,
      "user.studentId": 1,
      "user.email": 1,
      "user.role": 1
    }
  }
]).toArray();

pendingWithUsers.forEach((membership, index) => {
  print(`   ${index + 1}. ${membership.user.name} (${membership.user.studentId}) - ${membership.user.email}`);
  print(`      Applied: ${membership.joinedAt.toLocaleDateString()}`);
});

// 2. Get active members with approval details
print("\n2. Active members:");
const activeWithApprovers = db.memberships.aggregate([
  { $match: { status: "ACTIVE" } },
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "approvedBy",
      foreignField: "_id",
      as: "approver"
    }
  },
  { $unwind: "$user" },
  { $unwind: "$approver" },
  {
    $project: {
      _id: 1,
      status: 1,
      joinedAt: 1,
      approvedAt: 1,
      "user.name": 1,
      "user.studentId": 1,
      "approver.name": 1
    }
  }
]).toArray();

activeWithApprovers.forEach((membership, index) => {
  print(`   ${index + 1}. ${membership.user.name} (${membership.user.studentId})`);
  print(`      Approved by: ${membership.approver.name} on ${membership.approvedAt.toLocaleDateString()}`);
});

// 3. Get rejected applications with reasons
print("\n3. Rejected applications:");
const rejectedWithReasons = db.memberships.aggregate([
  { $match: { status: "REJECTED" } },
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
    }
  },
  { $unwind: "$user" },
  {
    $project: {
      _id: 1,
      status: 1,
      joinedAt: 1,
      rejectedAt: 1,
      rejectionReason: 1,
      "user.name": 1,
      "user.studentId": 1
    }
  }
]).toArray();

rejectedWithReasons.forEach((membership, index) => {
  print(`   ${index + 1}. ${membership.user.name} (${membership.user.studentId})`);
  print(`      Rejected: ${membership.rejectedAt.toLocaleDateString()}`);
  print(`      Reason: ${membership.rejectionReason}`);
});

// 4. Users without any membership application
print("\n4. Users without membership applications:");
const usersWithoutMembership = db.users.aggregate([
  {
    $lookup: {
      from: "memberships",
      localField: "_id",
      foreignField: "userId",
      as: "memberships"
    }
  },
  { $match: { memberships: { $size: 0 } } },
  {
    $project: {
      _id: 1,
      name: 1,
      studentId: 1,
      email: 1,
      role: 1
    }
  }
]).toArray();

usersWithoutMembership.forEach((user, index) => {
  print(`   ${index + 1}. ${user.name} (${user.studentId}) - ${user.email} [${user.role}]`);
});

// 5. Membership statistics by faculty
print("\n5. Membership statistics by faculty:");
const membershipByFaculty = db.memberships.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
    }
  },
  { $unwind: "$user" },
  {
    $group: {
      _id: "$user.faculty",
      total: { $sum: 1 },
      pending: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
      active: { $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] } },
      rejected: { $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] } }
    }
  },
  { $sort: { total: -1 } }
]).toArray();

membershipByFaculty.forEach(faculty => {
  print(`   ${faculty._id}:`);
  print(`      Total: ${faculty.total} | Pending: ${faculty.pending} | Active: ${faculty.active} | Rejected: ${faculty.rejected}`);
});

print("\n✅ Database setup completed successfully!");
print("💡 You can now run the application and test the membership management features.");
