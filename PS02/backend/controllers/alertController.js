import Alert from '../models/Alert.js';

export const getAlerts = async (req, res) => {
  try {
    const { severity, status, nodeId } = req.query;
    const query = {};

    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (nodeId) query.nodeId = nodeId.toUpperCase();

    const alerts = await Alert.find(query).sort({ timestamp: -1 });

    const counts = {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === 'Critical').length,
      warning: alerts.filter((a) => a.severity === 'Warning').length,
      safe: alerts.filter((a) => a.severity === 'Safe').length,
      resolved: alerts.filter((a) => a.status === 'Resolved').length,
    };

    res.json({ success: true, counts, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAlert = async (req, res) => {
  try {
    const { nodeId, alertType, value, severity, message } = req.body;
    const newAlert = await Alert.create({
      nodeId: nodeId ? nodeId.toUpperCase() : 'MASTER-01',
      alertType,
      value: value || '',
      severity: severity || 'Warning',
      message,
      status: 'Active',
    });
    res.status(201).json({ success: true, data: newAlert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status || 'Resolved' },
      { new: true }
    );
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    res.json({ success: true, message: 'Alert deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const acknowledgeAllAlerts = async (req, res) => {
  try {
    const result = await Alert.updateMany(
      { status: 'Active' },
      { $set: { status: 'Acknowledged' } }
    );
    res.json({
      success: true,
      message: `Acknowledged ${result.modifiedCount} active alert(s)`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
