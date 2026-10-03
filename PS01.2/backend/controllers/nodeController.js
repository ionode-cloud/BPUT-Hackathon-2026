const mongoose = require('mongoose');
const Node = require('../models/Node');
const SensorReading = require('../models/SensorReading');
const { asyncHandler } = require('../middleware/errorHandler');
const { computeActionDevice } = require('../services/actionDeviceService');

/**
 * Helper: parse numeric sensor value and pair with unit
 */
const buildSensor = (val, defaultUnit) => {
  if (val === undefined || val === null) return { value: null, unit: defaultUnit };
  if (typeof val === 'object' && val.value !== undefined) {
    return {
      value: val.value !== null && !isNaN(val.value) ? Number(val.value) : null,
      unit: val.unit || defaultUnit,
    };
  }
  const num = Number(val);
  return {
    value: !isNaN(num) ? num : null,
    unit: defaultUnit,
  };
};

/**
 * Helper: flatten nested sensor structure to flat JSON for frontend/client
 */
const flatten = (doc) => {
  if (!doc) return null;
  const sensors = ['co', 'co2', 'o3', 'no2', 'voc', 'so2', 'pm25', 'pm10', 'temperature', 'humidity', 'nh3', 'smoke'];
  const flat = {
    _id: doc._id,
    nodeId: doc.nodeId,
    timestamp: doc.timestamp,
    dataSource: doc.dataSource || 'iot',
  };
  sensors.forEach((s) => {
    flat[s] = doc[s]?.value ?? null;
  });
  flat.actiondevice = (doc.actiondevice !== undefined && doc.actiondevice !== null)
    ? doc.actiondevice
    : computeActionDevice(flat);
  flat.createdAt = doc.createdAt;
  flat.updatedAt = doc.updatedAt;
  return flat;
};

/**
 * Helper: ensure at least one node is marked as master if nodes exist
 */
const ensureMaster = async () => {
  const count = await Node.countDocuments();
  if (count === 0) return null;

  let master = await Node.findOne({ isMaster: true });
  if (!master) {
    master = await Node.findOne().sort({ nodeNumber: 1, createdAt: 1 });
    if (master) {
      master.isMaster = true;
      await master.save();
    }
  }
  return master;
};

/**
 * Helper: sync any existing SensorReading nodeIds that aren't yet in Node collection
 */
const syncDiscoveredNodes = async () => {
  try {
    const distinctNodeIds = await SensorReading.distinct('nodeId');
    for (const nid of distinctNodeIds) {
      if (!nid) continue;
      const cleanId = String(nid).toUpperCase().trim();
      try {
        const exists = await Node.findOne({ nodeId: cleanId });
        if (!exists) {
          const count = await Node.countDocuments();
          const nodeNumber = count + 1;
          await Node.create({
            nodeId: cleanId,
            name: `Node ${nodeNumber}`,
            nodeNumber,
            isMaster: count === 0,
            status: 'online',
            location: 'Auto-Discovered Station',
            lastSeen: new Date(),
          });
        }
      } catch (err) {
        // Safe to ignore duplicate key on concurrent discovery
      }
    }
  } catch (e) {
    // Ignore error
  }
};

// ── GET /api/nodes ────────────────────────────────────────────────────────────
// List all nodes with latest reading snippet and total counts
exports.getAllNodes = asyncHandler(async (req, res) => {
  await syncDiscoveredNodes();
  await ensureMaster();

  const nodes = await Node.find().sort({ nodeNumber: 1, createdAt: 1 }).lean();

  const enhancedNodes = await Promise.all(
    nodes.map(async (node) => {
      const [totalReadings, latestDoc] = await Promise.all([
        SensorReading.countDocuments({ nodeId: node.nodeId }),
        SensorReading.findOne({ nodeId: node.nodeId }).sort({ timestamp: -1 }).lean(),
      ]);

      return {
        ...node,
        totalReadings,
        latestReading: latestDoc ? flatten(latestDoc) : null,
      };
    })
  );

  res.json({
    success: true,
    count: enhancedNodes.length,
    data: enhancedNodes,
  });
});

// ── GET /api/nodes/master ─────────────────────────────────────────────────────
// Retrieve currently designated master node with its latest reading
exports.getMasterNode = asyncHandler(async (req, res) => {
  await syncDiscoveredNodes();
  const master = await ensureMaster();

  if (!master) {
    return res.json({
      success: true,
      data: null,
      message: 'No nodes registered yet',
    });
  }

  const latestDoc = await SensorReading.findOne({ nodeId: master.nodeId }).sort({ timestamp: -1 }).lean();

  res.json({
    success: true,
    data: {
      ...master.toObject(),
      latestReading: latestDoc ? flatten(latestDoc) : null,
    },
  });
});

// ── GET /api/nodes/latest ─────────────────────────────────────────────────────
// Get the single latest reading across the network or scoped to ?nodeId=
exports.getLatestNodeReading = asyncHandler(async (req, res) => {
  const { nodeId } = req.query;
  let filter = {};

  if (nodeId) {
    filter.nodeId = String(nodeId).toUpperCase().trim();
  } else {
    // Fall back to current master node if no specific node requested
    const master = await ensureMaster();
    if (master) {
      filter.nodeId = master.nodeId;
    }
  }

  const latest = await SensorReading.findOne(filter).sort({ timestamp: -1 }).lean();
  res.json({
    success: true,
    data: latest ? flatten(latest) : null,
  });
});

// ── GET /api/nodes/:nodeId ────────────────────────────────────────────────────
// Retrieve single node by its nodeId
exports.getNodeById = asyncHandler(async (req, res) => {
  const cleanId = String(req.params.nodeId).toUpperCase().trim();
  const node = await Node.findOne({ nodeId: cleanId }).lean();

  if (!node) {
    return res.status(404).json({
      success: false,
      message: `Node with ID ${cleanId} not found`,
    });
  }

  const [totalReadings, latestDoc] = await Promise.all([
    SensorReading.countDocuments({ nodeId: cleanId }),
    SensorReading.findOne({ nodeId: cleanId }).sort({ timestamp: -1 }).lean(),
  ]);

  res.json({
    success: true,
    data: {
      ...node,
      totalReadings,
      latestReading: latestDoc ? flatten(latestDoc) : null,
    },
  });
});

// ── POST /api/nodes/:nodeId ───────────────────────────────────────────────────
// Send sensor data directly to a node ID via Postman!
// Auto-registers the node if it doesn't already exist.
exports.sendNodeSensorData = asyncHandler(async (req, res) => {
  const cleanId = String(req.params.nodeId).toUpperCase().trim();
  const {
    timestamp,
    dataSource,
    co,
    co2,
    o3,
    no2,
    voc,
    so2,
    pm25,
    pm10,
    temperature,
    humidity,
    smoke,
    nh3,
    location,
    name,
    latitude,
    longitude,
  } = req.body;

  // 1. Create the sensor reading
  const actiondevice = computeActionDevice(req.body);
  const reading = await SensorReading.create({
    nodeId:      cleanId,
    timestamp:   timestamp ? new Date(timestamp) : new Date(),
    dataSource:  dataSource || 'iot',
    actiondevice,
    co:          buildSensor(co,          'ppm'),
    co2:         buildSensor(co2,         'ppm'),
    o3:          buildSensor(o3,          'ppb'),
    no2:         buildSensor(no2,         'ppb'),
    voc:         buildSensor(voc,         'ppb'),
    so2:         buildSensor(so2,         'ppb'),
    nh3:         buildSensor(nh3,         'ppm'),
    pm25:        buildSensor(pm25,        'µg/m³'),
    pm10:        buildSensor(pm10,        'µg/m³'),
    temperature: buildSensor(temperature, '°C'),
    humidity:    buildSensor(humidity,    '%RH'),
    smoke:       buildSensor(smoke,       'raw'),
  });

  const flatReading = flatten(reading.toObject());

  // 2. Ensure node exists or auto-create it
  let node = await Node.findOne({ nodeId: cleanId });
  const io = req.app.locals?.io;
  let isNewNode = false;

  const parsedLat = latitude !== undefined && latitude !== null && latitude !== '' && !isNaN(Number(latitude)) ? Number(latitude) : null;
  const parsedLng = longitude !== undefined && longitude !== null && longitude !== '' && !isNaN(Number(longitude)) ? Number(longitude) : null;

  if (!node) {
    const count = await Node.countDocuments();
    const nodeNumber = count + 1;
    node = await Node.create({
      nodeId: cleanId,
      name: name ? name.trim() : `Node ${nodeNumber}`,
      nodeNumber,
      isMaster: count === 0, // First node ever created becomes master
      status: 'online',
      location: location ? location.trim() : 'Auto-Discovered Station',
      latitude: parsedLat,
      longitude: parsedLng,
      lastSeen: new Date(),
    });
    isNewNode = true;
    if (io) {
      io.emit('node_created', node);
    }
  } else {
    node.lastSeen = new Date();
    node.status = 'online';
    if (location && !node.location) node.location = location.trim();
    if (name) node.name = name.trim();
    if (parsedLat !== null) node.latitude = parsedLat;
    if (parsedLng !== null) node.longitude = parsedLng;
    await node.save();
    if (io) {
      io.emit('node_updated', node);
    }
  }

  // 3. Socket.IO broadcast of real-time telemetry
  if (io) {
    io.emit('new_reading', flatReading);
  }

  res.status(201).json({
    success: true,
    message: `Telemetry ingested successfully for ${node.name} (${cleanId})`,
    node: {
      nodeId: node.nodeId,
      name: node.name,
      nodeNumber: node.nodeNumber,
      isMaster: node.isMaster,
      status: node.status,
      location: node.location,
      latitude: node.latitude,
      longitude: node.longitude,
      lastSeen: node.lastSeen,
    },
    data: flatReading,
  });
});

// ── POST /api/nodes ───────────────────────────────────────────────────────────
// Manually register a new node or ingest initial data
exports.createNode = asyncHandler(async (req, res) => {
  let { nodeId, name, location, latitude, longitude, ...sensorData } = req.body;

  if (!nodeId) {
    const count = await Node.countDocuments();
    nodeId = `NODE-${String(count + 1).padStart(2, '0')}`;
  }

  const cleanId = String(nodeId).toUpperCase().trim();
  let existing = await Node.findOne({ nodeId: cleanId });
  if (existing) {
    return res.status(400).json({
      success: false,
      message: `Node with ID ${cleanId} already exists. Use POST /api/nodes/${cleanId} to send sensor data.`,
    });
  }

  const totalCount = await Node.countDocuments();
  const nodeNumber = totalCount + 1;
  const nodeName = name ? name.trim() : `Node ${nodeNumber}`;
  const parsedLat = latitude !== undefined && latitude !== null && latitude !== '' && !isNaN(Number(latitude)) ? Number(latitude) : null;
  const parsedLng = longitude !== undefined && longitude !== null && longitude !== '' && !isNaN(Number(longitude)) ? Number(longitude) : null;

  const newNode = await Node.create({
    nodeId: cleanId,
    name: nodeName,
    nodeNumber,
    isMaster: totalCount === 0, // First created node becomes master
    location: location ? location.trim() : 'Main Station',
    latitude: parsedLat,
    longitude: parsedLng,
    status: 'online',
    lastSeen: new Date(),
  });

  const io = req.app.locals?.io;
  if (io) {
    io.emit('node_created', newNode);
  }

  // If sensor data was also provided in body, ingest it
  let createdReading = null;
  const hasSensorKeys = ['temperature', 'humidity', 'co2', 'pm25', 'pm10', 'co', 'no2', 'so2', 'o3', 'voc', 'nh3', 'smoke'].some(
    (k) => sensorData[k] !== undefined
  );

  if (hasSensorKeys) {
    const actiondevice = computeActionDevice(sensorData);
    const reading = await SensorReading.create({
      nodeId: cleanId,
      timestamp: new Date(),
      dataSource: 'iot',
      actiondevice,
      co:          buildSensor(sensorData.co,          'ppm'),
      co2:         buildSensor(sensorData.co2,         'ppm'),
      o3:          buildSensor(sensorData.o3,          'ppb'),
      no2:         buildSensor(sensorData.no2,         'ppb'),
      voc:         buildSensor(sensorData.voc,         'ppb'),
      so2:         buildSensor(sensorData.so2,         'ppb'),
      nh3:         buildSensor(sensorData.nh3,         'ppm'),
      pm25:        buildSensor(sensorData.pm25,        'µg/m³'),
      pm10:        buildSensor(sensorData.pm10,        'µg/m³'),
      temperature: buildSensor(sensorData.temperature, '°C'),
      humidity:    buildSensor(sensorData.humidity,    '%RH'),
      smoke:       buildSensor(sensorData.smoke,       'raw'),
    });
    createdReading = flatten(reading.toObject());
    if (io) {
      io.emit('new_reading', createdReading);
    }
  }

  res.status(201).json({
    success: true,
    message: `Node ${newNode.name} (${newNode.nodeId}) registered successfully`,
    data: newNode,
    reading: createdReading,
  });
});

// ── PUT /api/nodes/:nodeId & PUT /api/nodes ──────────────────────────────────
// Update node by ID: metadata (name, location, status) AND/OR live sensor telemetry!
// STRICT RULE: If the node ID does not exist, do NOT create a new node. Return 404 with error message for Postman.
exports.updateNodeById = asyncHandler(async (req, res) => {
  const targetId = req.params.nodeId || req.body.nodeId || req.body.id || req.query.nodeId;

  if (!targetId) {
    return res.status(400).json({
      success: false,
      message: 'Node ID is required. Please specify nodeId in the URL path (e.g., /api/nodes/NODE-01) or in the request body ({ "nodeId": "NODE-01" }).',
    });
  }

  const cleanId = String(targetId).trim();
  const upperId = cleanId.toUpperCase();

  // Search by nodeId (uppercase/case-insensitive) or MongoDB _id (if valid ObjectId)
  let query = { nodeId: upperId };
  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    query = { $or: [{ nodeId: upperId }, { _id: cleanId }] };
  }

  let node = await Node.findOne(query);
  const io = req.app.locals?.io;

  // STRICT VALIDATION: If node does not exist, NEVER create a new node on PUT.
  // Return 404 with clear message for Postman.
  if (!node) {
    return res.status(404).json({
      success: false,
      message: `Node with ID '${cleanId}' does not exist. Cannot create a new node using PUT method. Please create the node first using POST /api/nodes or send initial data via POST /api/nodes/${cleanId}.`,
    });
  }

  const canonicalId = node.nodeId;
  const { name, location, status, latitude, longitude, ...sensorPayload } = req.body;

  if (name !== undefined) node.name = name.trim();
  if (location !== undefined) node.location = location.trim();
  if (status !== undefined) node.status = status;
  if (latitude !== undefined) {
    node.latitude = latitude !== null && latitude !== '' && !isNaN(Number(latitude)) ? Number(latitude) : null;
  }
  if (longitude !== undefined) {
    node.longitude = longitude !== null && longitude !== '' && !isNaN(Number(longitude)) ? Number(longitude) : null;
  }
  node.lastSeen = new Date();
  node.updatedAt = new Date();
  await node.save();
  if (io) io.emit('node_updated', node);

  // Sensor parameters reference dictionary with default units
  const SENSOR_DEFAULT_UNITS = {
    co: 'ppm',
    co2: 'ppm',
    o3: 'ppb',
    no2: 'ppb',
    voc: 'ppb',
    so2: 'ppb',
    pm25: 'µg/m³',
    pm10: 'µg/m³',
    temperature: '°C',
    humidity: '%RH',
    nh3: 'ppm',
    smoke: 'raw',
  };

  const hasSensorKeys = Object.keys(SENSOR_DEFAULT_UNITS).some(
    (k) => req.body[k] !== undefined
  );

  let updatedReading = null;

  if (hasSensorKeys) {
    // Find the latest reading for this node to update it in place, or create one
    let latestDoc = await SensorReading.findOne({ nodeId: canonicalId }).sort({ timestamp: -1 });

    if (latestDoc) {
      Object.keys(SENSOR_DEFAULT_UNITS).forEach((key) => {
        if (req.body[key] !== undefined) {
          latestDoc[key] = buildSensor(req.body[key], SENSOR_DEFAULT_UNITS[key]);
        }
      });
      latestDoc.actiondevice = computeActionDevice(latestDoc);
      latestDoc.updatedAt = new Date();
      await latestDoc.save();
      updatedReading = flatten(latestDoc.toObject());
    } else {
      // If no reading existed yet, create the first reading for this existing node
      const actiondevice = computeActionDevice(req.body);
      const newDoc = await SensorReading.create({
        nodeId: canonicalId,
        timestamp: new Date(),
        dataSource: req.body.dataSource || 'iot',
        actiondevice,
        co:          buildSensor(req.body.co,          'ppm'),
        co2:         buildSensor(req.body.co2,         'ppm'),
        o3:          buildSensor(req.body.o3,          'ppb'),
        no2:         buildSensor(req.body.no2,         'ppb'),
        voc:         buildSensor(req.body.voc,         'ppb'),
        so2:         buildSensor(req.body.so2,         'ppb'),
        nh3:         buildSensor(req.body.nh3,         'ppm'),
        pm25:        buildSensor(req.body.pm25,        'µg/m³'),
        pm10:        buildSensor(req.body.pm10,        'µg/m³'),
        temperature: buildSensor(req.body.temperature, '°C'),
        humidity:    buildSensor(req.body.humidity,    '%RH'),
        smoke:       buildSensor(req.body.smoke,       'raw'),
      });
      updatedReading = flatten(newDoc.toObject());
    }

    // Broadcast over Socket.IO so connected screens update immediately in real time
    if (io && updatedReading) {
      io.emit('update_reading', updatedReading);
      io.emit('new_reading', updatedReading);
    }
  } else {
    // If no sensor keys in body, fetch current latest reading to return in response
    const curLatest = await SensorReading.findOne({ nodeId: canonicalId }).sort({ timestamp: -1 }).lean();
    if (curLatest) {
      updatedReading = flatten(curLatest);
    }
  }

  res.json({
    success: true,
    message: hasSensorKeys
      ? `Sensor telemetry updated successfully for Node ${node.name} (${canonicalId})`
      : `Node ${node.name} (${canonicalId}) updated successfully`,
    node: {
      nodeId: node.nodeId,
      name: node.name,
      nodeNumber: node.nodeNumber,
      isMaster: node.isMaster,
      status: node.status,
      location: node.location,
      latitude: node.latitude,
      longitude: node.longitude,
      lastSeen: node.lastSeen,
    },
    data: updatedReading,
  });
});

// ── PUT /api/nodes/:nodeId/master ─────────────────────────────────────────────
// Set a specific node as the Master Node
exports.setMasterNode = asyncHandler(async (req, res) => {
  const cleanId = String(req.params.nodeId).toUpperCase().trim();
  const targetNode = await Node.findOne({ nodeId: cleanId });

  if (!targetNode) {
    return res.status(404).json({
      success: false,
      message: `Node with ID ${cleanId} not found`,
    });
  }

  // Unset previous master
  await Node.updateMany({}, { isMaster: false });

  // Designate new master
  targetNode.isMaster = true;
  await targetNode.save();

  // Socket.IO broadcast
  const io = req.app.locals?.io;
  if (io) {
    io.emit('master_node_changed', {
      nodeId: targetNode.nodeId,
      name: targetNode.name,
      nodeNumber: targetNode.nodeNumber,
    });
  }

  res.json({
    success: true,
    message: `${targetNode.name} (${targetNode.nodeId}) is now set as Master Node`,
    data: targetNode,
  });
});

// ── DELETE /api/nodes/:nodeId ─────────────────────────────────────────────────
// Delete a node and all its stored telemetry records
exports.deleteNode = asyncHandler(async (req, res) => {
  const cleanId = String(req.params.nodeId).toUpperCase().trim();
  const targetNode = await Node.findOne({ nodeId: cleanId });

  if (!targetNode) {
    return res.status(404).json({
      success: false,
      message: `Node with ID ${cleanId} not found`,
    });
  }

  const wasMaster = targetNode.isMaster;

  // Delete node and its readings
  await Node.deleteOne({ nodeId: cleanId });
  const deleteResult = await SensorReading.deleteMany({ nodeId: cleanId });

  // If deleted node was master, assign another node as master
  let newMaster = null;
  if (wasMaster) {
    newMaster = await Node.findOne().sort({ nodeNumber: 1, createdAt: 1 });
    if (newMaster) {
      newMaster.isMaster = true;
      await newMaster.save();
    }
  }

  // Socket.IO broadcast
  const io = req.app.locals?.io;
  if (io) {
    io.emit('node_deleted', {
      nodeId: cleanId,
      newMasterNodeId: newMaster?.nodeId || null,
    });
  }

  res.json({
    success: true,
    message: `Node ${targetNode.name} (${cleanId}) and ${deleteResult.deletedCount} associated readings deleted successfully`,
    data: {
      deletedNodeId: cleanId,
      deletedReadingsCount: deleteResult.deletedCount,
      newMaster: newMaster ? newMaster.nodeId : null,
    },
  });
});

// ── GET /api/nodes/:nodeId/readings ───────────────────────────────────────────
// Retrieve paginated sensor readings for a specific node
exports.getNodeReadings = asyncHandler(async (req, res) => {
  const cleanId = String(req.params.nodeId).toUpperCase().trim();
  const { limit = 50, page = 1 } = req.query;

  const total = await SensorReading.countDocuments({ nodeId: cleanId });
  const readings = await SensorReading.find({ nodeId: cleanId })
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  res.json({
    success: true,
    count: readings.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit) || 1,
    data: readings.map(flatten),
  });
});

// ── DELETE /api/nodes/:nodeId/readings/:readingId ─────────────────────────────
// Delete a single sensor reading record
exports.deleteNodeReading = asyncHandler(async (req, res) => {
  const { readingId } = req.params;
  const doc = await SensorReading.findByIdAndDelete(readingId);

  if (!doc) {
    return res.status(404).json({
      success: false,
      message: 'Reading record not found',
    });
  }

  const io = req.app.locals?.io;
  if (io) {
    io.emit('delete_reading', { id: readingId });
  }

  res.json({
    success: true,
    message: 'Reading record deleted successfully',
    id: readingId,
  });
});

// ── PUT /api/nodes/:nodeId/readings/:readingId ───────────────────────────────
// Update a specific historical sensor reading by ID
exports.updateNodeReading = asyncHandler(async (req, res) => {
  const { readingId, nodeId } = req.params;
  const cleanId = String(nodeId).toUpperCase().trim();

  const reading = await SensorReading.findOne({ _id: readingId, nodeId: cleanId });
  if (!reading) {
    return res.status(404).json({
      success: false,
      message: `Reading record ${readingId} for node ${cleanId} not found`,
    });
  }

  const SENSOR_DEFAULT_UNITS = {
    co: 'ppm',
    co2: 'ppm',
    o3: 'ppb',
    no2: 'ppb',
    voc: 'ppb',
    so2: 'ppb',
    pm25: 'µg/m³',
    pm10: 'µg/m³',
    temperature: '°C',
    humidity: '%RH',
    nh3: 'ppm',
    smoke: 'raw',
  };

  Object.keys(SENSOR_DEFAULT_UNITS).forEach((key) => {
    if (req.body[key] !== undefined) {
      reading[key] = buildSensor(req.body[key], SENSOR_DEFAULT_UNITS[key]);
    }
  });

  reading.actiondevice = computeActionDevice(reading);
  reading.updatedAt = new Date();
  await reading.save();

  const flat = flatten(reading.toObject());

  const io = req.app.locals?.io;
  if (io) {
    io.emit('update_reading', flat);
  }

  res.json({
    success: true,
    message: 'Sensor reading updated successfully',
    data: flat,
  });
});
