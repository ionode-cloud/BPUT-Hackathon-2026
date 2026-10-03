require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const targetEmail = process.argv[2] || process.env.SUPERADMIN_EMAIL || 'admin@esg360.com';
const targetPassword = process.argv[3] || process.env.SUPERADMIN_PASSWORD || 'Admin@123456';

async function resetAdmin() {
  console.log('🔄 Connecting to MongoDB Atlas...');
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI not found in environment variables.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  let admin = await User.findOne({ role: 'Super Admin' }).select('+password');

  if (!admin) {
    console.log('⚠️  No Super Admin found. Searching by email: ' + targetEmail);
    admin = await User.findOne({ email: targetEmail.toLowerCase() }).select('+password');
  }

  if (!admin) {
    console.log('⚠️  Super Admin account does not exist. Creating new Super Admin...');
    const Organization = require('../models/Organization');
    const groupOrg = await Organization.findOne({ type: 'Group' });

    admin = await User.create({
      name: 'Super Admin',
      email: targetEmail.toLowerCase(),
      password: targetPassword,
      role: 'Super Admin',
      organization: groupOrg ? groupOrg._id : undefined,
      department: 'Executive Governance',
      isActive: true,
    });
    console.log(`✅ Created Super Admin user successfully.`);
  } else {
    admin.name = 'Super Admin';
    admin.email = targetEmail.toLowerCase();
    admin.password = targetPassword;
    admin.isActive = true;
    await admin.save();
    console.log(`✅ Super Admin updated successfully.`);
  }

  // Verification
  const reloadedAdmin = await User.findById(admin._id).select('+password');
  const isMatch = await reloadedAdmin.matchPassword(targetPassword);

  console.log('\n========================================');
  console.log('🎉 Super Admin Credentials Confirmed:');
  console.log(`   User ID  : ${reloadedAdmin._id}`);
  console.log(`   Name     : ${reloadedAdmin.name}`);
  console.log(`   Email    : ${reloadedAdmin.email}`);
  console.log(`   Password : ${targetPassword}`);
  console.log(`   Role     : ${reloadedAdmin.role}`);
  console.log(`   Active   : ${reloadedAdmin.isActive}`);
  console.log(`   Password Validated: ${isMatch ? '✅ YES' : '❌ NO'}`);
  console.log('========================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

resetAdmin().catch((err) => {
  console.error('❌ Error resetting Super Admin:', err);
  process.exit(1);
});
