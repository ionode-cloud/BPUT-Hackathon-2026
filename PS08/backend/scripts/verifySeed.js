require('dotenv').config();
const mongoose = require('mongoose');
const { User, Organization, ESGData, BRSRReport, Document, Notification, AuditLog } = require('../models');
const { calculateESGScore } = require('../utils/esgScoreEngine');
const { validateProjectDataset } = require('../utils/aiValidationEngine');

async function testAll() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email: 'admin@esg360.com' });
  const orgsCount = await Organization.countDocuments();
  const esgCount = await ESGData.countDocuments();
  const brsrCount = await BRSRReport.countDocuments();
  const docCount = await Document.countDocuments();
  const notifCount = await Notification.countDocuments();
  const auditCount = await AuditLog.countDocuments();

  // Test pending items for Approvals tab
  const pendingDocs = await Document.countDocuments({ status: { $in: ['Submitted', 'Under Review'] } });
  const pendingESG = await ESGData.countDocuments({ status: { $in: ['Submitted', 'Under Review', 'Correction Required'] } });
  const pendingOrgs = await Organization.countDocuments({ verificationStatus: { $ne: 'Verified' } });

  // Test Consolidation & Scoring data for Bhadla
  const bhadla = await Organization.findOne({ name: /Bhadla/i });
  const bhadlaRecords = await ESGData.find({ organization: bhadla._id, 'reportingPeriod.year': '2026' });
  const scoreResult = calculateESGScore(bhadlaRecords, { sector: bhadla.sector, projectName: bhadla.name });

  // Test AI Validation dataset
  const validationCheck = validateProjectDataset(bhadlaRecords);

  console.log('====================================================');
  console.log('✅ ALL TABS SEED VERIFICATION REPORT:');
  console.log('----------------------------------------------------');
  console.log('1. Super Admin User      : ' + (user ? 'ACTIVE (' + user.email + ')' : 'MISSING'));
  console.log('2. Organizations Total   : ' + orgsCount + ' (Pending Approval: ' + pendingOrgs + ')');
  console.log('3. ESG Records Total     : ' + esgCount + ' (Pending Review: ' + pendingESG + ')');
  console.log('4. Consolidation & Score : Bhadla records: ' + bhadlaRecords.length + ', Score: ' + scoreResult.finalScore + '/100 (' + scoreResult.rating + ' ' + scoreResult.band + ')');
  console.log('   Depts Populated       : ' + [...new Set(bhadlaRecords.map(r => r.department))].join(', '));
  console.log('5. BRSR Reports Total    : ' + brsrCount);
  console.log('6. Documents Vault Total : ' + docCount + ' (Pending Review: ' + pendingDocs + ')');
  console.log('7. Notifications Total   : ' + notifCount);
  console.log('8. Audit Logs Total      : ' + auditCount);
  console.log('9. AI Validation Issues  : ' + validationCheck.allIssues.length + ' dataset checks computed');
  console.log('====================================================');

  await mongoose.disconnect();
  process.exit(0);
}

testAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
