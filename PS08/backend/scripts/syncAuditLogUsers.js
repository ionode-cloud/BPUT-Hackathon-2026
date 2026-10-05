require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

async function syncExisting() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const logs = await AuditLog.find().sort({ createdAt: -1 });
  console.log(`Found ${logs.length} audit logs.`);

  const processedEmails = new Set();
  let createdCount = 0;
  let updatedCount = 0;

  for (const log of logs) {
    const email = (log.userEmail || '').trim().toLowerCase();
    if (!email || processedEmails.has(email)) continue;
    processedEmails.add(email);

    let user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log(`[CREATE] Missing user from audit log: ${email} (${log.userName}) - Role: ${log.userRole}`);
      user = await User.create({
        name: log.userName || email.split('@')[0],
        email: email,
        password: log.password || 'Admin@123456',
        role: log.userRole || 'Project/Department User',
        organization: log.organization || null,
        isActive: true,
      });
      // Link audit log back to user
      log.user = user._id;
      await log.save();
      createdCount++;
    } else {
      console.log(`[EXISTING] User already in DB: ${email}`);
      // If user had plain text password or needs sync with audit log password:
      if (log.password && log.password !== 'Admin@123456') {
        const isMatch = await user.matchPassword(log.password);
        if (!isMatch) {
          user.password = log.password;
          await user.save();
          console.log(`[UPDATE] Updated password for ${email}`);
          updatedCount++;
        }
      }
      if (!log.user) {
        log.user = user._id;
        await log.save();
      }
    }
  }

  console.log(`\nSync Summary: ${createdCount} created, ${updatedCount} updated.`);

  const allUsers = await User.find({}, 'name email role');
  console.log(`\n--- ALL USERS IN DB (${allUsers.length}) ---`);
  allUsers.forEach((u) => console.log(`- ${u.email} | ${u.name} | ${u.role}`));

  await mongoose.disconnect();
}

syncExisting()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error during sync:', err);
    process.exit(1);
  });
