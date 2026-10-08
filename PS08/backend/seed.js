/**
 * ESG360 Clean Seeder
 * Purges all seed/dummy records and provisions the primary Super Admin account.
 * Ready for users to add their own organizations, metrics, users, and reports.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const {
  User,
  Organization,
  ESGData,
  BRSRReport,
  Document,
  Notification,
  AuditLog,
} = require('./models');

const ADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'admin@esg360.com';
const ADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'Admin@123456';

async function seed() {
  console.log('🔄 Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  console.log('🧹 Purging all dummy data and records...');
  await Promise.all([
    ESGData.deleteMany({}),
    BRSRReport.deleteMany({}),
    Document.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
    Organization.deleteMany({}),
    User.deleteMany({
      email: { $nin: [ADMIN_EMAIL.toLowerCase(), 'ionodecloud@gmail.com'] },
    }),
  ]);
  console.log('✅ Clean slate prepared.\n');

  console.log('👤 Provisioning clean Super Admin account...');
  let admin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() }).select('+password');
  if (!admin) {
    admin = await User.create({
      name: 'Super Admin',
      email: ADMIN_EMAIL.toLowerCase(),
      password: ADMIN_PASSWORD,
      role: 'Super Admin',
      organization: null,
      department: 'Executive Governance',
      isActive: true,
    });
    console.log(`✅ Created Super Admin: ${ADMIN_EMAIL}`);
  } else {
    admin.name = 'Super Admin';
    admin.password = ADMIN_PASSWORD;
    admin.role = 'Super Admin';
    admin.organization = null;
    admin.isActive = true;
    await admin.save();
    console.log(`✅ Reset Super Admin: ${ADMIN_EMAIL}`);
  }

  // Preserve team account if present
  const ionodeUser = await User.findOne({ email: 'ionodecloud@gmail.com' });
  if (ionodeUser) {
    ionodeUser.role = 'Super Admin';
    ionodeUser.organization = null;
    ionodeUser.isActive = true;
    await ionodeUser.save();
    console.log('✅ Preserved ionodecloud@gmail.com as Super Admin');
  }

  console.log('\n======================================================');
  console.log('✨ Clean Slate Ready - No dummy data loaded.');
  console.log(`   Super Admin Email   : ${ADMIN_EMAIL}`);
  console.log(`   Super Admin Password: ${ADMIN_PASSWORD}`);
  console.log('   Users can now add their own organizations, metrics & data.');
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Error executing seed:', err);
  process.exit(1);
});
