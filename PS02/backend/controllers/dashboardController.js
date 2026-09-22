import Node from '../models/Node.js';
import SensorReading from '../models/SensorReading.js';
import Alert from '../models/Alert.js';
import {
  generateEdgeAiPrediction,
  getPersonalisedRisk,
  getLocalReliefActions,
} from '../utils/edgeAiEngine.js';

export const getDashboardSummary = async (req, res) => {
  try {
    const totalNodes = await Node.countDocuments();
    const onlineNodes = await Node.countDocuments({ status: 'online' });
    const activeAlerts = await Alert.countDocuments({ status: 'Active' });

    // Fetch latest reading from master node or fallback to newest reading
    let masterReading = await SensorReading.findOne({ nodeId: 'MASTER-01' }).sort({ timestamp: -1 });
    if (!masterReading) {
      masterReading = await SensorReading.findOne().sort({ timestamp: -1 });
    }

    // When no readings exist in database yet
    const temp = masterReading ? masterReading.temperature : null;
    const humidity = masterReading ? masterReading.humidity : null;
    const heatIndex = masterReading ? masterReading.heatIndex : null;
    const wbgt = masterReading ? masterReading.wbgt : null;
    const riskLevel = masterReading ? masterReading.riskLevel : null;

    // Relief actions
    const reliefActions = masterReading ? getLocalReliefActions(masterReading) : [];

    // Personalised risks for all 3 profiles
    const profiles = masterReading ? {
      Labourer: getPersonalisedRisk('Labourer', masterReading),
      Child: getPersonalisedRisk('Child', masterReading),
      Elderly: getPersonalisedRisk('Elderly', masterReading),
    } : null;

    // Edge AI prediction
    const prediction = masterReading ? generateEdgeAiPrediction(masterReading) : null;

    res.json({
      success: true,
      data: {
        stats: {
          totalNodes,
          onlineNodes,
          currentWbgt: wbgt,
          heatRiskLevel: riskLevel,
          currentTemperature: temp,
          humidity,
          heatIndex,
          activeAlerts,
        },
        hardware: {
          masterNode: 'MASTER-01',
          platform: 'Arduino UNO Q',
          processor: 'Qualcomm Dragonwing QRB2210 Linux',
          coprocessor: 'STM32U585 Low-Power Controller',
          offlineStatus: 'Active & Resilient (Zero Cloud Dependence)',
          lastSynced: masterReading ? masterReading.timestamp : new Date(),
        },
        reliefActions,
        personalisedRisk: profiles,
        prediction,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getHeatStress = async (req, res) => {
  try {
    const nodeId = req.query.nodeId ? req.query.nodeId.toUpperCase() : 'MASTER-01';
    const limit = parseInt(req.query.limit) || 24;

    const readings = await SensorReading.find({ nodeId })
      .select('-thermalMatrix')
      .sort({ timestamp: -1 })
      .limit(limit);

    // Chronological order for chart plotting
    const chronological = [...readings].reverse();

    res.json({
      success: true,
      nodeId,
      data: chronological,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPrediction = async (req, res) => {
  try {
    const nodeId = req.query.nodeId ? req.query.nodeId.toUpperCase() : 'MASTER-01';
    let reading = await SensorReading.findOne({ nodeId }).sort({ timestamp: -1 });
    if (!reading) {
      reading = await SensorReading.findOne().sort({ timestamp: -1 });
    }

    if (!reading) {
      return res.json({ success: true, nodeId, data: null });
    }

    const prediction = generateEdgeAiPrediction(reading);

    res.json({
      success: true,
      nodeId,
      data: prediction,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
