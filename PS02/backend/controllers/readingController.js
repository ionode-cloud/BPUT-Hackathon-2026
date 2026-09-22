import SensorReading from '../models/SensorReading.js';
import Node from '../models/Node.js';
import Alert from '../models/Alert.js';
import {
  calculateHeatIndex,
  calculateWBGT,
  evaluateHeatRiskLevel,
} from '../utils/edgeAiEngine.js';

export const getReadings = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const nodeId = req.query.nodeId ? req.query.nodeId.toUpperCase() : null;
    const query = nodeId ? { nodeId } : {};

    const readings = await SensorReading.find(query)
      .select('-thermalMatrix')
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({ success: true, count: readings.length, data: readings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLatestReadings = async (req, res) => {
  try {
    const allNodes = await Node.find({}, 'nodeId');
    const dbNodeIds = allNodes.map((n) => n.nodeId);
    const readingNodeIds = await SensorReading.distinct('nodeId');
    const allUniqueIds = Array.from(new Set(['MASTER-01', ...dbNodeIds, ...readingNodeIds]));

    const results = {};

    await Promise.all(
      allUniqueIds.map(async (id) => {
        const reading = await SensorReading.findOne({ nodeId: id })
          .select('-thermalMatrix')
          .sort({ timestamp: -1 });
        if (reading) {
          results[id] = reading;
        }
      })
    );

    // Default primary reading (prefer MASTER-01)
    const primary = results['MASTER-01'] || Object.values(results)[0] || null;

    res.json({
      success: true,
      data: {
        primary,
        nodes: results,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReadingsByNode = async (req, res) => {
  try {
    const nodeId = req.params.nodeId.toUpperCase();
    const limit = parseInt(req.query.limit) || 50;

    const readings = await SensorReading.find({ nodeId })
      .select('-thermalMatrix')
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({ success: true, count: readings.length, data: readings.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createReading = async (req, res) => {
  try {
    const {
      nodeId,
      temperature,
      humidity,
      voc = 80,
      radiantHeat,
      windSpeed = 1.5,
      windDirection = 120,
      lightIntensity = 45000,
      surfaceTemperature,
    } = req.body;

    if (!nodeId || temperature === undefined || humidity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'nodeId, temperature, and humidity are required fields',
      });
    }

    const upperNodeId = nodeId.toUpperCase();
    const radHeat = radiantHeat !== undefined ? radiantHeat : temperature + 4.5;
    const surfTemp = surfaceTemperature !== undefined ? surfaceTemperature : temperature + 6.0;

    // Local Edge AI computation
    const heatIndex = calculateHeatIndex(temperature, humidity);
    const wbgt = calculateWBGT(temperature, humidity, radHeat);
    const riskLevel = evaluateHeatRiskLevel(wbgt);

    const reading = await SensorReading.create({
      nodeId: upperNodeId,
      timestamp: req.body.timestamp || new Date(),
      temperature,
      humidity,
      voc,
      radiantHeat: radHeat,
      windSpeed,
      windDirection,
      lightIntensity,
      surfaceTemperature: surfTemp,
      heatIndex,
      wbgt,
      riskLevel,
    });

    // Update node's lastSeen timestamp
    await Node.findOneAndUpdate(
      { nodeId: upperNodeId },
      { lastSeen: new Date(), status: 'online' }
    );

    // Threshold alert auto-generation
    if (wbgt >= 31.0) {
      await Alert.create({
        nodeId: upperNodeId,
        alertType: 'High WBGT',
        value: `${wbgt}°C`,
        severity: 'Critical',
        message: `Extreme heat stress risk: WBGT reached ${wbgt}°C at ${upperNodeId}. Work cessation recommended.`,
        status: 'Active',
      });
    } else if (wbgt >= 28.5) {
      await Alert.create({
        nodeId: upperNodeId,
        alertType: 'Dangerous heat risk',
        value: `${wbgt}°C`,
        severity: 'Warning',
        message: `Elevated heat stress: WBGT is ${wbgt}°C at ${upperNodeId}. Active cooling triggered.`,
        status: 'Active',
      });
    }

    if (surfTemp >= 48.0) {
      await Alert.create({
        nodeId: upperNodeId,
        alertType: 'High surface temperature',
        value: `${surfTemp}°C`,
        severity: 'Warning',
        message: `MLX90640 thermal array recorded severe roof/surface heat of ${surfTemp}°C.`,
        status: 'Active',
      });
    }

    res.status(201).json({ success: true, data: reading });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAllReadings = async (req, res) => {
  try {
    const result = await SensorReading.deleteMany({});
    res.json({ success: true, message: `All sensor readings deleted (${result.deletedCount} cleared)` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteReadingById = async (req, res) => {
  try {
    const deleted = await SensorReading.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Reading not found' });
    }
    res.json({ success: true, message: 'Reading deleted', data: deleted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
