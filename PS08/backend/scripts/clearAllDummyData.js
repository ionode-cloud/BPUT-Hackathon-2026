require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const {
  User,
  Organization,
  ESGData,
  BRSRReport,
  Document,
  Notification,
  AuditLog,
} = require('../models');

async function clearAllDummyData() {
  console.log('🔄 Connecting to MongoDB Atlas...');
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI not found in environment variables.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  console.log('🧹 Purging all dummy metrics, reports, documents, notifications, audit logs, and organizations...');

  const [esgRes, brsrRes, docRes, notifRes, auditRes, orgRes] = await Promise.all([
    ESGData.deleteMany({}),
    BRSRReport.deleteMany({}),
    Document.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
    Organization.deleteMany({}),
  ]);

  console.log(`   - ESG Data Records Deleted: ${esgRes.deletedCount}`);
  console.log(`   - BRSR Reports Deleted:     ${brsrRes.deletedCount}`);
  console.log(`   - Documents Deleted:        ${docRes.deletedCount}`);
  console.log(`   - Notifications Deleted:    ${notifRes.deletedCount}`);
  console.log(`   - Audit Logs Deleted:       ${auditRes.deletedCount}`);
  console.log(`   - Organizations Deleted:    ${orgRes.deletedCount}`);

  // Purge dummy demo users while preserving Super Admin accounts for login
  console.log('\n🧹 Cleaning up users...');
  
  // Delete all users except Super Admin
  const deletedUsersRes = await User.deleteMany({
    email: {
      $nin: ['admin@esg360.com', 'ionodecloud@gmail.com'],
    },
  });
  console.log(`   - Demo/Dummy Users Deleted: ${deletedUsersRes.deletedCount}`);

  // Ensure primary Super Admin user exists and is completely unlinked from dummy orgs
  let superAdmin = await User.findOne({ email: 'admin@esg360.com' }).select('+password');
  if (!superAdmin) {
    superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@esg360.com',
      password: 'Admin@123456',
      role: 'Super Admin',
      organization: null,
      department: 'Executive Governance',
      isActive: true,
    });
    console.log('   - Created clean Super Admin (admin@esg360.com / Admin@123456)');
  } else {
    superAdmin.name = 'Super Admin';
    superAdmin.password = 'Admin@123456';
    superAdmin.role = 'Super Admin';
    superAdmin.organization = null;
    superAdmin.isActive = true;
    await superAdmin.save();
    console.log('   - Reset Super Admin (admin@esg360.com / Admin@123456) with organization: null');
  }

  // Also clean up ionodecloud if present
  const ionodeUser = await User.findOne({ email: 'ionodecloud@gmail.com' });
  if (ionodeUser) {
    ionodeUser.role = 'Super Admin';
    ionodeUser.organization = null;
    ionodeUser.isActive = true;
    await ionodeUser.save();
    console.log('   - Updated ionodecloud@gmail.com with Super Admin and organization: null');
  }

  // Remove uploaded dummy test files from backend/uploads
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
      if (file !== '.gitkeep') {
        try {
          fs.unlinkSync(path.join(uploadsDir, file));
          console.log(`   - Removed dummy upload: ${file}`);
        } catch (err) {
          console.warn(`   - Warning: Could not delete ${file}:`, err.message);
        }
      }
    }
  }

  console.log('\n======================================================');
  console.log('✨ All Seed and Dummy Data Successfully Removed!');
  console.log('   The platform is clean and ready for user self-input.');
  console.log('   Super Admin Login: admin@esg360.com / Admin@123456');
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

clearAllDummyData().catch((err) => {
  console.error('❌ Error executing cleanup:', err);
  process.exit(1);
});
