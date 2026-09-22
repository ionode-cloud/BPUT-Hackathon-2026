import Node from '../models/Node.js';
import SensorReading from '../models/SensorReading.js';
import Alert from '../models/Alert.js';
import {
  calculateHeatIndex,
  calculateWBGT,
  evaluateHeatRiskLevel,
} from './edgeAiEngine.js';

export async function seedNodeReadings(nodeId, nodeType = 'slave', hours = 24) {
  const isMaster = nodeType === 'master';
  const now = Date.now();
  const tempProfile = [
    29.2, 28.5, 28.1, 28.0, 28.4, 29.8, 31.5, 33.8, 36.4, 38.9, 41.2, 43.1,
    44.2, 43.8, 42.6, 40.8, 38.5, 36.2, 34.1, 32.5, 31.2, 30.4, 29.8, 29.4,
  ];
  const humidityProfile = [
    78, 80, 82, 82, 80, 75, 68, 60, 52, 46, 42, 39,
    38, 40, 44, 48, 55, 62, 68, 72, 74, 75, 76, 77,
  ];

  const readings = [];
  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now - i * 60 * 60 * 1000);
    const hourIndex = (24 + new Date(timestamp).getHours()) % 24;
    const baseTemp = tempProfile[hourIndex];
    const baseHum = humidityProfile[hourIndex];

    const tempOffset = isMaster ? -2.2 : (Math.random() * 2.0);
    const temp = Math.round((baseTemp + tempOffset + (Math.random() * 0.6 - 0.3)) * 10) / 10;
    const hum = Math.max(28, Math.min(95, Math.round(baseHum + (isMaster ? 4 : -2) + (Math.random() * 2 - 1))));
    const rad = Math.round((temp + (isMaster ? 2.2 : (hourIndex >= 9 && hourIndex <= 16 ? 7.2 : 2.4)) + Math.random() * 0.4) * 10) / 10;
    const wind = Math.round((isMaster ? 0.8 : 1.8 + Math.random() * 1.5) * 10) / 10;
    const lux = Math.round(hourIndex >= 6 && hourIndex <= 18 ? (isMaster ? 3200 : 55000 + Math.random() * 25000) : (isMaster ? 80 : 15));
    const surf = Math.round((temp + (isMaster ? 3.2 : (hourIndex >= 10 && hourIndex <= 15 ? 12.5 : 4.2))) * 10) / 10;
    const hi = calculateHeatIndex(temp, hum);
    const wbgt = calculateWBGT(temp, hum, rad);

    readings.push({
      nodeId,
      timestamp,
      temperature: temp,
      humidity: hum,
      voc: Math.round(80 + (hourIndex > 10 && hourIndex < 16 ? 35 : 10) + Math.random() * 15),
      radiantHeat: rad,
      windSpeed: wind,
      windDirection: isMaster ? 140 : 210,
      lightIntensity: lux,
      surfaceTemperature: surf,
      heatIndex: hi,
      wbgt,
      riskLevel: evaluateHeatRiskLevel(wbgt),
    });
  }

  await SensorReading.insertMany(readings);
  return readings;
}

export async function populateSeedData() {
  const count = await Node.countDocuments();
  if (count === 0) {
    console.log('[Auto-Seed] Initializing sample heatwave nodes...');
    const defaultNodes = [
      {
        nodeId: 'MASTER-01',
        nodeName: 'Arduino UNO Q Master Node',
        nodeType: 'master',
        location: 'Community Emergency Center & Room 102',
        latitude: 20.2961,
        longitude: 85.8245,
        status: 'online',
        lastSeen: new Date(),
        signalStrength: -48,
        batteryLevel: 98,
      },
      {
        nodeId: 'SLAVE-01',
        nodeName: 'Street Market Corridor Node',
        nodeType: 'slave',
        location: 'Outdoor Street Vendor & Market Corridor',
        latitude: 20.2985,
        longitude: 85.8280,
        status: 'online',
        lastSeen: new Date(),
        signalStrength: -65,
        batteryLevel: 88,
      },
      {
        nodeId: 'SLAVE-02',
        nodeName: 'Rooftop & Schoolyard Node',
        nodeType: 'slave',
        location: 'Sector 5 Primary School Roof & Yard',
        latitude: 20.2938,
        longitude: 85.8212,
        status: 'online',
        lastSeen: new Date(),
        signalStrength: -71,
        batteryLevel: 92,
      },
    ];
    await Node.insertMany(defaultNodes);
  }

  // Ensure coordinates exist on all nodes
  await Node.findOneAndUpdate({ nodeId: 'MASTER-01', latitude: { $exists: false } }, { latitude: 20.2961, longitude: 85.8245 });
  await Node.findOneAndUpdate({ nodeId: 'SLAVE-01', latitude: { $exists: false } }, { latitude: 20.2985, longitude: 85.8280 });
  await Node.findOneAndUpdate({ nodeId: 'SLAVE-02', latitude: { $exists: false } }, { latitude: 20.2938, longitude: 85.8212 });

  // Clean up and strip any legacy thermalMatrix fields from existing sensor readings
  await SensorReading.updateMany({ thermalMatrix: { $exists: true } }, { $unset: { thermalMatrix: 1 } });

  // Backfill 24h readings for any node that has fewer than 12 readings
  const allNodes = await Node.find();
  for (const node of allNodes) {
    const readingCount = await SensorReading.countDocuments({ nodeId: node.nodeId });
    if (readingCount < 12) {
      console.log(`[Auto-Seed] Backfilling 24h historical telemetry for node ${node.nodeId}...`);
      await seedNodeReadings(node.nodeId, node.nodeType, 24);
      console.log(`[Auto-Seed] Populated 24 readings for ${node.nodeId}`);
    }
  }

  const alertCount = await Alert.countDocuments();
  if (alertCount === 0) {
    const alerts = [
      {
        nodeId: 'SLAVE-01',
        alertType: 'High WBGT',
        value: '33.4°C',
        severity: 'Critical',
        message: 'Extreme Heatwave Alert: Outdoor WBGT reached 33.4°C at Street Market Corridor. Mandatory work stoppage enforced.',
        status: 'Active',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
      },
      {
        nodeId: 'SLAVE-02',
        alertType: 'High surface temperature',
        value: '58.2°C',
        severity: 'Warning',
        message: 'MLX90640 thermal array detected roof surface temperature exceeding 58°C in school zone.',
        status: 'Active',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
      },
      {
        nodeId: 'MASTER-01',
        alertType: 'Required rest break',
        value: '30.2°C WBGT',
        severity: 'Warning',
        message: 'Occupational safety trigger: 30 min shaded rest mandatory for manual labourer profile.',
        status: 'Active',
        timestamp: new Date(Date.now() - 75 * 60 * 1000),
      },
      {
        nodeId: 'MASTER-01',
        alertType: 'Relief action triggered',
        value: 'Relay Active',
        severity: 'Safe',
        message: 'Local Edge AI STM32U585 activated high-volume ventilation and evaporative misting lines.',
        status: 'Active',
        timestamp: new Date(Date.now() - 110 * 60 * 1000),
      },
      {
        nodeId: 'MASTER-01',
        alertType: 'Network outage',
        value: 'Autonomous Mode',
        severity: 'Warning',
        message: 'External cellular backhaul disconnected. System running autonomously on local Arduino UNO Q Edge AI.',
        status: 'Active',
        timestamp: new Date(Date.now() - 160 * 60 * 1000),
      },
      {
        nodeId: 'SLAVE-01',
        alertType: 'Extreme temperature',
        value: '44.8°C',
        severity: 'Critical',
        message: 'Ambient air temp reached peak 44.8°C with high solar irradiance (79,000 lux).',
        status: 'Resolved',
        timestamp: new Date(Date.now() - 320 * 60 * 1000),
      },
    ];

    await Alert.insertMany(alerts);
  }
  console.log('[Auto-Seed] Initial data population check complete.');
}

