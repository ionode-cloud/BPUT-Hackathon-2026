import Node from '../models/Node.js';
import SensorReading from '../models/SensorReading.js';

export const getHeatmapData = async (req, res) => {
  try {
    const nodes = await Node.find();

    const defaultCoords = {
      'MASTER-01': { lat: 20.2961, lng: 85.8245, type: 'Indoor / High Occupancy Refugium', area: 'Bhubaneswar Smart City Sector 4' },
      'SLAVE-01':  { lat: 20.2985, lng: 85.8280, type: 'Direct Sun Exposure / Concrete Urban Canyon', area: 'Market Square Corridor B' },
      'SLAVE-02':  { lat: 20.2938, lng: 85.8212, type: 'Elevated Dark Tar Roof / Bare Schoolyard', area: 'Sector 5 North Residential Block' },
    };

    const mappedPoints = await Promise.all(
      nodes.map(async (nodeDoc) => {
        const def = defaultCoords[nodeDoc.nodeId] || {
          lat: 20.2950,
          lng: 85.8250,
          type: 'Peripheral Microclimate Monitoring Node',
          area: 'Bhubaneswar Municipal Zone',
        };

        const reading = await SensorReading.findOne({ nodeId: nodeDoc.nodeId }).sort({ timestamp: -1 });

        const temp = reading ? reading.temperature : null;
        const wbgt = reading ? reading.wbgt : null;
        const surfaceTemp = reading ? reading.surfaceTemperature : null;
        const heatIndex = reading ? reading.heatIndex : null;
        const status = reading ? reading.riskLevel : null;

        return {
          nodeId: nodeDoc.nodeId,
          zoneName: nodeDoc.nodeName || `${nodeDoc.nodeId} Zone`,
          zoneType: def.type,
          area: nodeDoc.location || def.area,
          lat: nodeDoc.latitude ?? def.lat,
          lng: nodeDoc.longitude ?? def.lng,
          nodeType: nodeDoc.nodeType || 'slave',
          connectionStatus: nodeDoc.status || 'online',
          currentTemp: temp,
          wbgt,
          surfaceTemperature: surfaceTemp,
          heatIndex,
          riskLevel: status,
          radiantHeat: reading?.radiantHeat ?? null,
          windSpeed: reading?.windSpeed ?? null,
          solarLux: reading?.lightIntensity ?? null,
          thermalIntervention: wbgt != null
            ? wbgt >= 31.0
              ? 'Emergency misting & cooling shelters open'
              : wbgt >= 28.5
              ? 'Active hydration stations & shaded rest mandatory'
              : 'Standard monitoring'
            : null,
        };
      })
    );

    // Calculate municipal aggregate metrics
    const validTemps = mappedPoints.map((p) => p.currentTemp).filter((t) => t != null);
    const validWbgts = mappedPoints.map((p) => p.wbgt).filter((w) => w != null);
    const validSurfs = mappedPoints.map((p) => p.surfaceTemperature).filter((s) => s != null);

    const avgTemp = validTemps.length > 0
      ? (validTemps.reduce((acc, v) => acc + v, 0) / validTemps.length).toFixed(1)
      : null;
    const avgWbgt = validWbgts.length > 0
      ? (validWbgts.reduce((acc, v) => acc + v, 0) / validWbgts.length).toFixed(1)
      : null;
    const maxSurfaceTemp = validSurfs.length > 0
      ? Math.max(...validSurfs)
      : null;
    const hotSpotCount = mappedPoints.filter((p) => p.riskLevel === 'Dangerous').length;

    res.json({
      success: true,
      city: 'Bhubaneswar Urban Heat Monitoring Grid',
      summary: {
        totalSensors: mappedPoints.length,
        avgTemperature: avgTemp ? `${avgTemp}°C` : null,
        avgWbgt: avgWbgt ? `${avgWbgt}°C` : null,
        maxSurfaceHeat: maxSurfaceTemp ? `${maxSurfaceTemp}°C` : null,
        activeHotSpots: hotSpotCount,
      },
      points: mappedPoints,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
