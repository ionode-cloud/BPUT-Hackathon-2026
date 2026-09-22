import EventEmitter from 'events';
import Node from '../models/Node.js';
import SensorReading from '../models/SensorReading.js';
import Alert from '../models/Alert.js';
import {
  calculateHeatIndex,
  calculateWBGT,
  evaluateHeatRiskLevel,
} from '../utils/edgeAiEngine.js';
import { seedNodeReadings } from '../utils/seedData.js';

export const nodeEventsEmitter = new EventEmitter();

export const streamNodeEvents = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write('data: {"type":"connected"}\n\n');

  const onAlert = (data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      console.debug('SSE write error:', e);
    }
  };

  nodeEventsEmitter.on('node-alert', onAlert);

  req.on('close', () => {
    nodeEventsEmitter.off('node-alert', onAlert);
  });
};

export const getNodes = async (req, res) => {
  try {
    const nodes = await Node.find().select('-hardwareSpecs').sort({ nodeType: 1, nodeId: 1 });
    
    // Attach latest reading for each node
    const nodesWithLatest = await Promise.all(
      nodes.map(async (n) => {
        const latest = await SensorReading.findOne({ nodeId: n.nodeId })
          .select('-thermalMatrix')
          .sort({ timestamp: -1 });
        const obj = n.toObject();
        delete obj.hardwareSpecs;
        return {
          ...obj,
          latestReading: latest || null,
        };
      })
    );

    res.json({ success: true, count: nodesWithLatest.length, data: nodesWithLatest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getNodeById = async (req, res) => {
  try {
    const node = await Node.findOne({ nodeId: req.params.id.toUpperCase() }).select('-hardwareSpecs');
    if (!node) {
      return res.status(404).json({ success: false, message: 'Node not found' });
    }
    const latest = await SensorReading.findOne({ nodeId: node.nodeId }).sort({ timestamp: -1 });
    const obj = node.toObject();
    delete obj.hardwareSpecs;
    res.json({ success: true, data: { ...obj, latestReading: latest } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createNode = async (req, res) => {
  try {
    const {
      nodeId,
      nodeName,
      nodeType,
      location,
      latitude,
      longitude,
      signalStrength,
      batteryLevel,
      createInitialReading = true,
    } = req.body;

    if (!nodeId) {
      return res.status(400).json({ success: false, message: 'nodeId is required' });
    }

    const cleanNodeId = nodeId.trim().toUpperCase();
    const existing = await Node.findOne({ nodeId: cleanNodeId });
    if (existing) {
      return res.status(400).json({ success: false, message: `Node ${cleanNodeId} already exists` });
    }

    const lat = latitude !== undefined && latitude !== null && !isNaN(Number(latitude))
      ? Number(latitude)
      : 20.2961;
    const lng = longitude !== undefined && longitude !== null && !isNaN(Number(longitude))
      ? Number(longitude)
      : 85.8245;

    const newNode = await Node.create({
      nodeId: cleanNodeId,
      nodeName: nodeName || `${cleanNodeId} Sensor Node`,
      nodeType: nodeType || 'slave',
      location: location || 'Bhubaneswar Urban Sector',
      latitude: lat,
      longitude: lng,
      signalStrength: signalStrength !== undefined ? Number(signalStrength) : -65,
      batteryLevel: batteryLevel !== undefined ? Number(batteryLevel) : 95,
    });

    // Auto-seed historical telemetry for new node so dashboard graphs immediately work
    await seedNodeReadings(cleanNodeId, nodeType || 'slave', 12);

    const latest = await SensorReading.findOne({ nodeId: cleanNodeId })
      .select('-thermalMatrix')
      .sort({ timestamp: -1 });

    const newObj = newNode.toObject();
    delete newObj.hardwareSpecs;

    res.status(201).json({
      success: true,
      data: {
        ...newObj,
        latestReading: latest || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateNode = async (req, res) => {
  try {
    const rawId = (req.params.id || req.params.nodeId || '').trim();
    const upperId = rawId.toUpperCase();

    // Look up node by nodeId or _id
    let node = await Node.findOne({ nodeId: upperId });
    if (!node) {
      node = await Node.findById(rawId).catch(() => null);
    }
    if (!node) {
      return res.status(404).json({ success: false, message: `Node ${rawId} not found` });
    }

    // Check for sensor data in request body (either top-level or nested under sensorData/reading)
    const sensorInput = req.body.sensorData || req.body.reading || req.body.readings || req.body;
    const hasSensorData =
      sensorInput.temperature !== undefined ||
      sensorInput.temp !== undefined ||
      sensorInput.humidity !== undefined ||
      sensorInput.hum !== undefined;

    let newReading = null;
    let triggeredAlerts = [];

    if (hasSensorData) {
      const temperature = Number(sensorInput.temperature ?? sensorInput.temp);
      const humidity = Number(sensorInput.humidity ?? sensorInput.hum);
      const voc = sensorInput.voc !== undefined ? Number(sensorInput.voc) : 80;
      const radiantHeat = sensorInput.radiantHeat !== undefined
        ? Number(sensorInput.radiantHeat)
        : Math.round((temperature + 4.5) * 10) / 10;
      const windSpeed = sensorInput.windSpeed !== undefined ? Number(sensorInput.windSpeed) : 1.5;
      const windDirection = sensorInput.windDirection !== undefined ? Number(sensorInput.windDirection) : 140;
      const lightIntensity = sensorInput.lightIntensity !== undefined ? Number(sensorInput.lightIntensity) : 45000;
      const surfaceTemperature = sensorInput.surfaceTemperature !== undefined
        ? Number(sensorInput.surfaceTemperature)
        : Math.round((temperature + 6.0) * 10) / 10;

      // Compute Edge AI indices on Master Node
      const heatIndex = calculateHeatIndex(temperature, humidity);
      const wbgt = calculateWBGT(temperature, humidity, radiantHeat);
      const riskLevel = evaluateHeatRiskLevel(wbgt);

      // Create new SensorReading
      newReading = await SensorReading.create({
        nodeId: node.nodeId,
        timestamp: req.body.timestamp || new Date(),
        temperature,
        humidity,
        voc,
        radiantHeat,
        windSpeed,
        windDirection,
        lightIntensity,
        surfaceTemperature,
        heatIndex,
        wbgt,
        riskLevel,
      });

      // Threshold alert evaluation: trigger distinct alerts for ALL dangerous metrics

      // 1. WBGT Alert (ISO 7243)
      if (wbgt >= 31.0) {
        const a = await Alert.create({
          nodeId: node.nodeId,
          alertType: 'High WBGT',
          value: `${wbgt}°C`,
          severity: 'Critical',
          message: `Extreme heatwave emergency: WBGT reached ${wbgt}°C at ${node.nodeId}. Mandatory work cessation enforced!`,
          status: 'Active',
          timestamp: new Date(),
        });
        triggeredAlerts.push(a);
      } else if (wbgt >= 28.5) {
        const a = await Alert.create({
          nodeId: node.nodeId,
          alertType: 'Dangerous heat risk',
          value: `${wbgt}°C`,
          severity: 'Warning',
          message: `Elevated heat stress: WBGT is ${wbgt}°C at ${node.nodeId}. Shaded rest and active hydration mandatory.`,
          status: 'Active',
          timestamp: new Date(),
        });
        triggeredAlerts.push(a);
      }

      // 2. Extreme Ambient Air Temperature
      if (temperature >= 40.0) {
        const a = await Alert.create({
          nodeId: node.nodeId,
          alertType: 'Extreme temperature',
          value: `${temperature}°C`,
          severity: 'Critical',
          message: `Severe ambient air temperature of ${temperature}°C recorded at ${node.nodeId}. Dangerous thermal load.`,
          status: 'Active',
          timestamp: new Date(),
        });
        triggeredAlerts.push(a);
      }

      // 3. High Apparent Heat Index
      if (heatIndex >= 42.0) {
        const a = await Alert.create({
          nodeId: node.nodeId,
          alertType: 'High Heat Index',
          value: `${heatIndex}°C`,
          severity: heatIndex >= 50.0 ? 'Critical' : 'Warning',
          message: `Dangerous apparent Heat Index of ${heatIndex}°C detected at ${node.nodeId}. Heat stroke hazard imminent.`,
          status: 'Active',
          timestamp: new Date(),
        });
        triggeredAlerts.push(a);
      }

      // 4. High Surface Temperature (Roof / Wall)
      if (surfaceTemperature >= 50.0) {
        const a = await Alert.create({
          nodeId: node.nodeId,
          alertType: 'High surface temperature',
          value: `${surfaceTemperature}°C`,
          severity: 'Warning',
          message: `Roof and structural surface temperature reached dangerous ${surfaceTemperature}°C at ${node.nodeId}.`,
          status: 'Active',
          timestamp: new Date(),
        });
        triggeredAlerts.push(a);
      }

      // 5. High Radiant Heat (Black Globe DS18B20)
      if (radiantHeat >= 48.0) {
        const a = await Alert.create({
          nodeId: node.nodeId,
          alertType: 'High radiant heat',
          value: `${radiantHeat}°C`,
          severity: 'Warning',
          message: `Extreme mean radiant temperature of ${radiantHeat}°C recorded at ${node.nodeId}. Direct thermal radiation hazard.`,
          status: 'Active',
          timestamp: new Date(),
        });
        triggeredAlerts.push(a);
      }
    }

    // Update node metadata
    const nodeUpdates = { lastSeen: new Date(), status: req.body.status || 'online' };
    if (req.body.nodeName) nodeUpdates.nodeName = req.body.nodeName;
    if (req.body.location) nodeUpdates.location = req.body.location;
    if (req.body.latitude !== undefined) nodeUpdates.latitude = Number(req.body.latitude);
    if (req.body.longitude !== undefined) nodeUpdates.longitude = Number(req.body.longitude);
    if (req.body.signalStrength !== undefined) nodeUpdates.signalStrength = Number(req.body.signalStrength);
    if (req.body.batteryLevel !== undefined) nodeUpdates.batteryLevel = Number(req.body.batteryLevel);

    const updatedNode = await Node.findOneAndUpdate(
      { nodeId: node.nodeId },
      nodeUpdates,
      { new: true }
    );

    const latest = newReading || (await SensorReading.findOne({ nodeId: node.nodeId }).select('-thermalMatrix').sort({ timestamp: -1 }));

    const updatedObj = updatedNode.toObject();
    delete updatedObj.hardwareSpecs;

    // Real-time broadcast to connected frontend clients via SSE
    if (triggeredAlerts.length > 0) {
      nodeEventsEmitter.emit('node-alert', {
        type: 'alerts',
        nodeId: node.nodeId,
        alerts: triggeredAlerts,
      });
    }

    res.json({
      success: true,
      message: triggeredAlerts.length > 0
        ? `Sensor data ingested. ${triggeredAlerts.length} DANGEROUS METRIC ALERTS TRIGGERED!`
        : hasSensorData
        ? 'Sensor data pushed successfully'
        : 'Node updated successfully',
      data: {
        ...updatedObj,
        latestReading: latest,
      },
      alert: triggeredAlerts[0] || null,
      alerts: triggeredAlerts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteNode = async (req, res) => {
  try {
    const deleted = await Node.findOneAndDelete({ nodeId: req.params.id.toUpperCase() });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Node not found' });
    }
    // Also remove associated readings
    await SensorReading.deleteMany({ nodeId: req.params.id.toUpperCase() });
    res.json({ success: true, message: `Node ${req.params.id} and associated telemetry deleted` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
