require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const User = require('../models/User');
const ESGData = require('../models/ESGData');
const { validateRecord } = require('../utils/aiValidationEngine');

async function syncMEILData() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.\n');

    // 1. Update Projects with MEIL Sector, District, and Project ID
    console.log('1. Syncing MEIL Projects...');
    const projects = await Organization.find({ type: 'Project' });
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      let sector = 'Transportation';
      let district = p.location?.city || 'Hyderabad';
      if (p.name.toLowerCase().includes('solar') || p.name.toLowerCase().includes('energy')) {
        sector = 'Power';
      } else if (p.name.toLowerCase().includes('water') || p.name.toLowerCase().includes('canal')) {
        sector = 'Water';
      } else if (p.name.toLowerCase().includes('metro') || p.name.toLowerCase().includes('port') || p.name.toLowerCase().includes('terminal')) {
        sector = 'Transportation';
      } else if (p.name.toLowerCase().includes('expressway') || p.name.toLowerCase().includes('highway')) {
        sector = 'Construction';
      }

      const sectorCode = sector.slice(0, 3).toUpperCase();
      p.projectId = p.projectId || `PRJ-${sectorCode}-26-00${i + 1}`;
      p.sector = p.sector || sector;
      p.location = p.location || {};
      p.location.district = p.location.district || district;
      p.location.state = p.location.state || (sector === 'Power' ? 'Rajasthan' : 'Maharashtra');
      await p.save();
      console.log(`  ✓ Updated Project: ${p.name} [ID: ${p.projectId}, Sector: ${p.sector}]`);
    }

    // 2. Add New MEIL Water / Irrigation Project if not already existing
    let polavaramProject = await Organization.findOne({ name: 'Polavaram Irrigation & Bulk Water Project' });
    if (!polavaramProject) {
      polavaramProject = await Organization.create({
        name: 'Polavaram Irrigation & Bulk Water Project',
        type: 'Project',
        projectId: 'PRJ-WAT-26-108',
        sector: 'Irrigation',
        industry: 'Water & Irrigation Systems',
        reportingYear: '2026',
        location: {
          address: 'Godavari River Basin, Polavaram Site',
          city: 'Polavaram',
          district: 'West Godavari',
          state: 'Andhra Pradesh',
          country: 'India',
        },
        status: 'Active',
        verificationStatus: 'Verified',
      });
      console.log('  ✓ Created Polavaram Irrigation & Bulk Water Project (MEIL)');
    }

    // 3. Update Users with Employee ID and Designation
    console.log('\n2. Updating User credentials...');
    const users = await User.find({});
    for (const u of users) {
      if (!u.employeeId) {
        if (u.role === 'Super Admin') {
          u.employeeId = 'MEIL-ADM-001';
          u.designation = 'Chief Governance & ESG Director';
        } else if (u.role === 'ESG Manager') {
          u.employeeId = 'MEIL-ESG-102';
          u.designation = 'Senior Lead ESG Manager';
        } else if (u.role === 'Compliance Officer') {
          u.employeeId = 'MEIL-CMP-203';
          u.designation = 'Chief Statutory Compliance Officer';
        } else {
          u.employeeId = `MEIL-EMP-${Math.floor(1000 + Math.random() * 9000)}`;
          u.designation = 'Operational ESG Specialist';
        }
        await u.save();
        console.log(`  ✓ User: ${u.name} -> ${u.employeeId} (${u.designation})`);
      }
    }

    // 4. Update existing ESG records with Common Fields
    console.log('\n3. Enriching ESG Data with Common Fields...');
    const records = await ESGData.find({}).populate('organization');
    for (const r of records) {
      let changed = false;
      if (!r.groupCompany) {
        r.groupCompany = 'MEIL Group (Megha Engineering & Infrastructures Ltd.)';
        changed = true;
      }
      if (!r.projectName && r.organization) {
        r.projectName = r.organization.name;
        r.projectId = r.organization.projectId || 'PRJ-MEIL-26';
        r.sectorType = r.organization.sector || r.organization.industry || 'Transportation';
        r.location = {
          state: r.organization.location?.state || 'Telangana',
          district: r.organization.location?.district || r.organization.location?.city || 'Hyderabad',
          city: r.organization.location?.city || 'Hyderabad',
        };
        changed = true;
      }
      if (!r.department) {
        if (r.category === 'Environmental') r.department = 'Environmental';
        else if (r.category === 'Social') {
          if (r.metric.includes('Injury') || r.metric.includes('Fatality') || r.metric.includes('Incident') || r.metric.includes('Drill')) {
            r.department = 'Safety';
          } else {
            r.department = 'HR';
          }
        } else {
          r.department = 'Compliance';
        }
        changed = true;
      }
      if (!r.submittedByName) {
        r.submittedByName = 'Rajesh Sharma';
        r.employeeId = 'MEIL-ENV-401';
        r.designation = `${r.department} Officer`;
        changed = true;
      }
      if (!r.dateOfSubmission && r.status !== 'Draft') {
        r.dateOfSubmission = r.createdAt || new Date();
        changed = true;
      }

      if (changed) {
        await r.save();
      }
    }
    console.log(`  ✓ Enriched ${records.length} ESG records with Common Fields.`);

    // 5. Seed Abnormal Change Demonstration (Example from Prompt: 100 KL -> 10,000 KL Spike)
    const adminUser = await User.findOne({ role: 'Super Admin' });
    const targetProject = (await Organization.findOne({ type: 'Project' })) || polavaramProject;

    const spikeMetric = await ESGData.findOne({
      metric: 'Total Water Withdrawal',
      projectId: 'PRJ-DEMO-SPIKE-26',
    });

    if (!spikeMetric && targetProject && adminUser) {
      console.log('\n4. Creating prompt demonstration records (100 KL -> 10,000 KL Spike & Blank Water)...');

      // Previous period: 100 KL
      const prevRec = await ESGData.create({
        category: 'Environmental',
        department: 'Environmental',
        metric: 'Total Water Withdrawal',
        reportingPeriod: { year: '2025', quarter: 'Q4', month: 'December' },
        organization: targetProject._id,
        project: targetProject._id,
        projectName: targetProject.name,
        projectId: 'PRJ-DEMO-SPIKE-26',
        groupCompany: 'MEIL Group (Megha Engineering & Infrastructures Ltd.)',
        sectorType: targetProject.sector || 'Water',
        location: { state: 'Telangana', district: 'Hyderabad' },
        value: 100,
        unit: 'KL',
        description: 'Baseline monthly water consumption for pipeline fabrication yard.',
        dataSource: 'Flow Meter #1 Log',
        status: 'Approved',
        submittedBy: adminUser._id,
        submittedByName: 'Suresh Rao',
        employeeId: 'MEIL-ENV-209',
        designation: 'Environmental Engineer',
        dateOfSubmission: new Date('2025-12-31'),
      });

      // Current period: 10000 KL (Spike!)
      const currRec = await ESGData.create({
        category: 'Environmental',
        department: 'Environmental',
        metric: 'Total Water Withdrawal',
        reportingPeriod: { year: '2026', quarter: 'Q1', month: 'January' },
        organization: targetProject._id,
        project: targetProject._id,
        projectName: targetProject.name,
        projectId: 'PRJ-DEMO-SPIKE-26',
        groupCompany: 'MEIL Group (Megha Engineering & Infrastructures Ltd.)',
        sectorType: targetProject.sector || 'Water',
        location: { state: 'Telangana', district: 'Hyderabad' },
        value: 10000,
        unit: 'KL',
        description: 'Monthly water withdrawal reading (Sudden multi-fold jump).',
        dataSource: 'Bulk Tanker Invoices',
        status: 'Submitted',
        submittedBy: adminUser._id,
        submittedByName: 'Suresh Rao',
        employeeId: 'MEIL-ENV-209',
        designation: 'Environmental Engineer',
        dateOfSubmission: new Date(),
        aiValidationResults: [
          {
            type: 'ABNORMAL_CHANGE',
            severity: 'HIGH',
            field: 'value',
            message: 'Unusual Increase Detected: Water Consumption spiked by 9,900% (Previous Month: 100 KL ➔ Current Month: 10,000 KL).',
            suggestion: 'Verify flow meter calibration or attach bulk water tanker invoice.',
            details: { previousValue: 100, currentValue: 10000, percentChange: 9900 },
          },
        ],
      });
      console.log('  ✓ Created 100 KL ➔ 10,000 KL Spike record (Prompt Demo).');

      // Create a Correction Required sample record
      await ESGData.create({
        category: 'Social',
        department: 'HR',
        metric: 'Female Employees',
        reportingPeriod: { year: '2026', quarter: 'Q1' },
        organization: targetProject._id,
        project: targetProject._id,
        projectName: targetProject.name,
        projectId: targetProject.projectId || 'PRJ-MEIL-26',
        groupCompany: 'MEIL Group (Megha Engineering & Infrastructures Ltd.)',
        sectorType: targetProject.sector || 'Transportation',
        location: { state: 'Telangana', district: 'Hyderabad' },
        value: 48,
        unit: 'Nos.',
        description: 'Female employees on site.',
        dataSource: 'HRMS Biometric Attendance',
        status: 'Correction Required',
        submittedBy: adminUser._id,
        submittedByName: 'Pooja Reddy',
        employeeId: 'MEIL-HR-314',
        designation: 'HR Executive',
        correctionComment: 'Please attach breakdown of permanent vs contractual female staff and contractor labour muster.',
        workflowHistory: [
          { status: 'Draft', changedBy: adminUser._id, comment: 'Draft created' },
          { status: 'Submitted', changedBy: adminUser._id, comment: 'Submitted for HR review' },
          { status: 'Correction Required', changedBy: adminUser._id, comment: 'Breakdown of permanent vs contractual required' },
        ],
      });
      console.log('  ✓ Created Correction Required demonstration record.');
    }

    console.log('\n🎉 MEIL Data Sync & Field Enrichment completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

syncMEILData();
