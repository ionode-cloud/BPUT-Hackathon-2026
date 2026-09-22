require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const SensorReading = require('../models/SensorReading');

const rand = (min, max, decimals = 1) => {
  const factor = Math.pow(10, decimals);
  return Math.round((Math.random() * (max - min) + min) * factor) / factor;
};

// Generate realistic readings matching the user's specification ranges
const generateReadings = (hours = 24, intervalMinutes = 15) => {
  const readings = [];
  const totalPoints = Math.floor((hours * 60) / intervalMinutes);
  const now = Date.now();

  for (let i = totalPoints; i >= 0; i--) {
    const timestamp = new Date(now - i * intervalMinutes * 60 * 1000);
    const hourOfDay = timestamp.getHours();

    // Diurnal variation (higher temp in afternoon, higher CO2 during daytime)
    const isDay = hourOfDay >= 8 && hourOfDay <= 19;
    const tempBase = isDay ? 24.5 : 21.0;
    const co2Base  = isDay ? 780  : 450;

    readings.push({
      nodeId: 'SENSOR-01',
      timestamp,
      dataSource: 'iot',
      co:          { value: rand(0.5, 3.8, 2), unit: 'ppm' },
      co2:         { value: rand(co2Base - 50, co2Base + 180, 0), unit: 'ppm' },
      no2:         { value: rand(15, 48, 1), unit: 'ppb' },
      so2:         { value: rand(8, 28, 1), unit: 'ppb' },
      o3:          { value: rand(18, 52, 1), unit: 'ppb' },
      pm25:        { value: rand(5.0, 11.8, 1), unit: 'µg/m³' },
      pm10:        { value: rand(18, 50, 1), unit: 'µg/m³' },
      temperature: { value: rand(tempBase - 1.5, tempBase + 2.0, 1), unit: '°C' },
      humidity:    { value: rand(38, 48, 1), unit: '%RH' },
      voc:         { value: rand(30, 95, 0), unit: 'ppb' },
      nh3:         { value: rand(1.5, 14.0, 1), unit: 'ppm' },
      smoke:       { value: rand(15, 60, 0), unit: 'raw' },
    });
  }

  return readings;
};

const seed = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    console.log('Clearing existing sensor readings...');
    await SensorReading.deleteMany({});
    console.log('   ✓ Sensor readings cleared');

    console.log('📊 Seeding 24h of sensor readings (15-min intervals)...');
    const readings = generateReadings(24, 15);
    await SensorReading.insertMany(readings, { ordered: false });
    console.log(`   ✓ ${readings.length} sensor readings inserted`);

    console.log('\n🎉 Seed complete!\n');
    console.log('   API: http://localhost:5000/api/sensor');
    console.log('   Latest: http://localhost:5000/api/sensor/latest\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
