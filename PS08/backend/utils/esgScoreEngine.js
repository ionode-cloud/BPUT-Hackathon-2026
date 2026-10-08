/**
 * ESG Innovators - ESG Score Calculation Engine
 * Calculates:
 * - Environmental Score (E-Score: 0-100)
 * - Social Score (S-Score: 0-100)
 * - Governance Score (G-Score: 0-100)
 * - Composite Final ESG Score (0-100) with Tier/Grade (AAA - B)
 * - Benchmarking against MEIL infrastructure sector peer averages
 */

const calculateESGScore = (records = [], projectMetadata = {}) => {
  if (!records || records.length === 0) {
    return {
      finalScore: 0,
      rating: 'N/A',
      band: 'Awaiting Approved Operational Records',
      color: '#94A3B8',
      environmentalScore: { score: 0, weight: '40%', factors: [] },
      socialScore: { score: 0, weight: '30%', factors: [] },
      governanceScore: { score: 0, weight: '30%', factors: [] },
      sectorBenchmark: {
        industry: projectMetadata.sector || 'Infrastructure & Engineering',
        peerAverage: 62.5,
        environmentalPeerAvg: 58.0,
        socialPeerAvg: 64.0,
        governancePeerAvg: 65.5,
        difference: 0,
      },
      recordsEvaluated: 0,
      calculatedAt: new Date().toISOString(),
    };
  }

  // Create quick lookup map for metrics
  const m = {};
  records.forEach((r) => {
    if (r.metric) {
      m[r.metric] = Number(r.value);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 1. ENVIRONMENTAL SCORE (Weight: 40%)
  // ─────────────────────────────────────────────────────────────
  let eScore = 50; // default baseline if minimal data
  let eFactors = [];

  const totalEnergy = m['Total Energy Consumption'] || 0;
  const renewableEnergy = m['Renewable Energy Consumed'] || m['Renewable Energy Generated'] || 0;
  const totalWater = m['Total Water Withdrawal'] || 0;
  const waterRecycled = m['Water Recycled/Reused'] || 0;
  const totalWaste = m['Total Waste Generated'] || 0;
  const wasteRecycled = m['Waste Recycled'] || 0;
  const scope1 = m['Scope 1 GHG Emissions'] || 0;
  const scope2 = m['Scope 2 GHG Emissions'] || 0;

  let energyPts = 15;
  if (totalEnergy > 0) {
    const renewRatio = renewableEnergy / totalEnergy;
    energyPts = Math.min(35, Math.round(15 + renewRatio * 20));
    eFactors.push({ factor: 'Renewable Energy Share', score: Math.round(renewRatio * 100) + '%', points: energyPts, max: 35 });
  } else {
    eFactors.push({ factor: 'Energy Accounting', score: 'Standard', points: 15, max: 35 });
  }

  let waterPts = 15;
  if (totalWater > 0) {
    const waterRatio = Math.min(1, waterRecycled / totalWater);
    waterPts = Math.min(35, Math.round(15 + waterRatio * 20));
    eFactors.push({ factor: 'Water Conservation & Recycling', score: Math.round(waterRatio * 100) + '%', points: waterPts, max: 35 });
  } else {
    eFactors.push({ factor: 'Water Stewardship', score: 'Standard', points: 15, max: 35 });
  }

  let wastePts = 15;
  if (totalWaste > 0) {
    const wasteRatio = Math.min(1, wasteRecycled / totalWaste);
    wastePts = Math.min(30, Math.round(15 + wasteRatio * 15));
    eFactors.push({ factor: 'Waste Diversion & Circularity', score: Math.round(wasteRatio * 100) + '%', points: wastePts, max: 30 });
  } else {
    eFactors.push({ factor: 'Waste Management', score: 'Standard', points: 15, max: 30 });
  }

  eScore = Math.min(100, energyPts + waterPts + wastePts);

  // ─────────────────────────────────────────────────────────────
  // 2. SOCIAL SCORE (Weight: 30%)
  // ─────────────────────────────────────────────────────────────
  let sScore = 50;
  let sFactors = [];

  const totalEmployees = m['Total Employees'] || 100;
  const femaleEmployees = m['Female Employees'] || 0;
  const fatalities = m['Fatalities'] || 0;
  const ltir = m['Lost Time Injury Rate'] !== undefined ? m['Lost Time Injury Rate'] : 0.2;
  const trainingHours = m['Training Hours'] || 0;

  // Diversity (35 pts)
  let divPts = 15;
  const femaleRatio = femaleEmployees / totalEmployees;
  if (femaleRatio >= 0.25) divPts = 35;
  else if (femaleRatio >= 0.15) divPts = 28;
  else if (femaleRatio >= 0.08) divPts = 20;
  else divPts = 12;
  sFactors.push({ factor: 'Workplace Gender Diversity', score: Math.round(femaleRatio * 100) + '%', points: divPts, max: 35 });

  // Safety & Zero Harm (35 pts)
  let safetyPts = 35;
  if (fatalities > 0) {
    safetyPts = 0; // zero tolerance for fatalities
  } else if (ltir <= 0.2) {
    safetyPts = 35;
  } else if (ltir <= 0.8) {
    safetyPts = 25;
  } else {
    safetyPts = 15;
  }
  sFactors.push({ factor: 'Occupational Health & Safety (OHS)', score: fatalities === 0 ? 'Zero Harm' : `${fatalities} Incidents`, points: safetyPts, max: 35 });

  // Training & Human Capital (30 pts)
  let trainingPts = 15;
  const avgTraining = totalEmployees > 0 ? trainingHours / totalEmployees : 0;
  if (avgTraining >= 24) trainingPts = 30;
  else if (avgTraining >= 16) trainingPts = 25;
  else if (avgTraining >= 8) trainingPts = 20;
  else trainingPts = 14;
  sFactors.push({ factor: 'Employee Skill & Safety Training', score: `${Math.round(avgTraining)} hrs/employee`, points: trainingPts, max: 30 });

  sScore = Math.min(100, divPts + safetyPts + trainingPts);

  // ─────────────────────────────────────────────────────────────
  // 3. GOVERNANCE SCORE (Weight: 30%)
  // ─────────────────────────────────────────────────────────────
  let gScore = 50;
  let gFactors = [];

  const ethicsCoverage = m['Ethics Policy Coverage'] !== undefined ? m['Ethics Policy Coverage'] : 100;
  const antiCorruptionTraining = m['Anti-Corruption Training Completion'] !== undefined ? m['Anti-Corruption Training Completion'] : 95;
  const boardMembers = m['Total Board Members'] || 10;
  const independentDirectors = m['Independent Directors'] || 5;
  const regulatoryFines = m['Regulatory Fines Paid'] || 0;
  const dataBreaches = m['Data Breaches'] || 0;

  // Board Independence (35 pts)
  let boardPts = 20;
  const indepRatio = independentDirectors / boardMembers;
  if (indepRatio >= 0.5) boardPts = 35;
  else if (indepRatio >= 0.33) boardPts = 25;
  else boardPts = 15;
  gFactors.push({ factor: 'Board Independence & Composition', score: Math.round(indepRatio * 100) + '% Independent', points: boardPts, max: 35 });

  // Ethics & Compliance (35 pts)
  let ethicsPts = 20;
  if (ethicsCoverage >= 95 && antiCorruptionTraining >= 90) ethicsPts = 35;
  else if (ethicsCoverage >= 80) ethicsPts = 28;
  else ethicsPts = 18;
  gFactors.push({ factor: 'Ethics & Anti-Bribery Standards', score: `${ethicsCoverage}% Coverage`, points: ethicsPts, max: 35 });

  // Risk, Regulatory & Redressal (30 pts)
  let riskPts = 30;
  if (regulatoryFines > 0 || dataBreaches > 0) riskPts = 10;
  gFactors.push({ factor: 'Statutory Compliance & Clean Record', score: regulatoryFines === 0 ? 'Zero Fines' : 'Fines Reported', points: riskPts, max: 30 });

  gScore = Math.min(100, boardPts + ethicsPts + riskPts);

  // ─────────────────────────────────────────────────────────────
  // 4. COMPOSITE FINAL ESG SCORE & RATING TIER
  // ─────────────────────────────────────────────────────────────
  const finalScore = Math.round(eScore * 0.40 + sScore * 0.30 + gScore * 0.30);

  let rating = 'BBB';
  let band = 'Average / Moderate Risk';
  let color = '#F59E0B';

  if (finalScore >= 85) {
    rating = 'AAA';
    band = 'Leader - Top Quartile ESG Performer';
    color = '#059669';
  } else if (finalScore >= 75) {
    rating = 'AA';
    band = 'Strong ESG Performance';
    color = '#10B981';
  } else if (finalScore >= 65) {
    rating = 'A';
    band = 'Good Sustainability Management';
    color = '#3B82F6';
  } else if (finalScore >= 55) {
    rating = 'BBB';
    band = 'Moderate / Transitioning Performance';
    color = '#F59E0B';
  } else if (finalScore >= 45) {
    rating = 'BB';
    band = 'Needs Strategic Improvement';
    color = '#EF4444';
  } else {
    rating = 'B';
    band = 'High ESG Exposure';
    color = '#DC2626';
  }

  // Sector benchmarks
  const sectorBenchmark = {
    industry: projectMetadata.sector || 'Infrastructure & Engineering',
    peerAverage: 62.5,
    environmentalPeerAvg: 58.0,
    socialPeerAvg: 64.0,
    governancePeerAvg: 65.5,
    difference: finalScore - 62.5,
  };

  return {
    finalScore,
    rating,
    band,
    color,
    environmentalScore: { score: eScore, weight: '40%', factors: eFactors },
    socialScore: { score: sScore, weight: '30%', factors: sFactors },
    governanceScore: { score: gScore, weight: '30%', factors: gFactors },
    sectorBenchmark,
    recordsEvaluated: records.length,
    calculatedAt: new Date().toISOString(),
  };
};

module.exports = { calculateESGScore };
