const { spawn } = require('child_process');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('🌱 Starting database seeding...\n');

// Run users seeding first
console.log('📝 Seeding users...');
const usersProcess = spawn('npx', ['tsx', path.join(__dirname, '../src/scripts/seedUsers.ts')], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

usersProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Users seeding completed successfully!\n');
    
    // Run memberships seeding after users
    console.log('📝 Seeding memberships...');
    const membershipsProcess = spawn('npx', ['tsx', path.join(__dirname, '../src/scripts/seedMemberships.ts')], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' }
    });

    membershipsProcess.on('close', (membershipsCode) => {
      if (membershipsCode === 0) {
        console.log('\n✅ Memberships seeding completed successfully!');
        console.log('\n🎉 All seeding completed successfully!');
      } else {
        console.error('\n❌ Memberships seeding failed!');
        process.exit(membershipsCode);
      }
    });
  } else {
    console.error('\n❌ Users seeding failed!');
    process.exit(code);
  }
});
