/**
 * Threshold utility — provides status calculations, reference tables, and formatting
 * aligned with the user specification.
 */

export const SENSOR_SPEC_TABLE = [
  {
    key: 'co',
    name: 'CO (Carbon Monoxide)',
    unit: 'ppm',
    sensor: 'MQ7',
    safeText: '0–4.4',
    moderateText: '4.5–9',
    dangerousText: '>35 (short-term); >9 (8-hr avg)',
    safeMin: 0,
    safeMax: 4.4,
    moderateMin: 4.5,
    moderateMax: 9,
    dangerousMin: 9.1,
  },
  {
    key: 'co2',
    name: 'CO₂ (Carbon Dioxide)',
    unit: 'ppm',
    sensor: 'MH-Z19',
    safeText: '400–1000',
    moderateText: '1000–2000',
    dangerousText: '>5000 (OSHA); >40,000 life-threatening',
    safeMin: 400,
    safeMax: 1000,
    moderateMin: 1001,
    moderateMax: 2000,
    dangerousMin: 2001,
  },
  {
    key: 'no2',
    name: 'NO₂ (Nitrogen Dioxide)',
    unit: 'ppb',
    sensor: 'MiCS-6814',
    safeText: '0–53',
    moderateText: '54–100',
    dangerousText: '>200',
    safeMin: 0,
    safeMax: 53,
    moderateMin: 54,
    moderateMax: 100,
    dangerousMin: 101,
  },
  {
    key: 'so2',
    name: 'SO₂ (Sulfur Dioxide)',
    unit: 'ppb',
    sensor: 'MQ135',
    safeText: '0–35',
    moderateText: '36–75',
    dangerousText: '>185',
    safeMin: 0,
    safeMax: 35,
    moderateMin: 36,
    moderateMax: 75,
    dangerousMin: 76,
  },
  {
    key: 'o3',
    name: 'O₃ (Ozone)',
    unit: 'ppb',
    sensor: 'MQ131',
    safeText: '0–54',
    moderateText: '55–70',
    dangerousText: '>85',
    safeMin: 0,
    safeMax: 54,
    moderateMin: 55,
    moderateMax: 70,
    dangerousMin: 71,
  },
  {
    key: 'pm25',
    name: 'PM2.5',
    unit: 'µg/m³',
    sensor: 'PMS7003',
    safeText: '0–12',
    moderateText: '12.1–35.4',
    dangerousText: '>55.4 (>150.4 hazardous)',
    safeMin: 0,
    safeMax: 12,
    moderateMin: 12.1,
    moderateMax: 35.4,
    dangerousMin: 35.5,
  },
  {
    key: 'pm10',
    name: 'PM10',
    unit: 'µg/m³',
    sensor: 'PMS7003',
    safeText: '0–54',
    moderateText: '55–154',
    dangerousText: '>254 (>424 hazardous)',
    safeMin: 0,
    safeMax: 54,
    moderateMin: 55,
    moderateMax: 154,
    dangerousMin: 155,
  },
  {
    key: 'temperature',
    name: 'Temperature',
    unit: '°C',
    sensor: 'DHT22',
    safeText: '20–26 (comfort)',
    moderateText: '15–20 or 26–32',
    dangerousText: '<10 or >38 (health risk)',
    safeMin: 20,
    safeMax: 26,
    moderateMin: 15,
    moderateMax: 32,
    dangerousMin: 38,
    dangerousMaxLow: 10,
  },
  {
    key: 'humidity',
    name: 'Humidity',
    unit: '% RH',
    sensor: 'DHT22',
    safeText: '30–50',
    moderateText: '20–30 or 50–60',
    dangerousText: '<20 or >70 (mold/discomfort)',
    safeMin: 30,
    safeMax: 50,
    moderateMin: 20,
    moderateMax: 60,
    dangerousMin: 70,
    dangerousMaxLow: 20,
  },
  {
    key: 'voc',
    name: 'VOC (Volatile Organic)',
    unit: 'ppb',
    sensor: 'MiCS-6814',
    safeText: '0–200',
    moderateText: '201–500',
    dangerousText: '>500',
    safeMin: 0,
    safeMax: 200,
    moderateMin: 201,
    moderateMax: 500,
    dangerousMin: 501,
  },
  {
    key: 'nh3',
    name: 'NH₃ (Ammonia)',
    unit: 'ppm',
    sensor: 'MQ137',
    safeText: '0–25',
    moderateText: '25.1–50',
    dangerousText: '>50',
    safeMin: 0,
    safeMax: 25,
    moderateMin: 25.1,
    moderateMax: 50,
    dangerousMin: 50.1,
  },
  {
    key: 'smoke',
    name: 'Smoke Level',
    unit: 'raw',
    sensor: 'MQ2',
    safeText: '0–200',
    moderateText: '201–500',
    dangerousText: '>500',
    safeMin: 0,
    safeMax: 200,
    moderateMin: 201,
    moderateMax: 500,
    dangerousMin: 501,
  },
];

export const DEFAULT_THRESHOLDS = SENSOR_SPEC_TABLE.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {});

/**
 * Get status for a sensor value.
 * @param {string} sensorType
 * @param {number|null} value
 * @returns {'safe'|'moderate'|'dangerous'|'unknown'}
 */
export const getStatus = (sensorType, value) => {
  if (value === null || value === undefined || isNaN(value)) return 'unknown';
  const t = DEFAULT_THRESHOLDS[sensorType];
  if (!t) return 'unknown';

  const v = Number(value);

  // Temperature and humidity use range intervals
  if (t.dangerousMaxLow !== undefined) {
    if (v < t.dangerousMaxLow || v > t.dangerousMin) return 'dangerous';
    if (v < t.safeMin || v > t.safeMax) return 'moderate';
    return 'safe';
  }

  if (v >= t.dangerousMin) return 'dangerous';
  if (v >= t.moderateMin) return 'moderate';
  return 'safe';
};

export const STATUS_COLORS = {
  safe: {
    bg: 'rgba(16, 185, 129, 0.12)',
    text: '#059669',
    border: '#10B981',
    dot: '#10B981',
  },
  moderate: {
    bg: 'rgba(255, 174, 51, 0.15)',
    text: '#D97706',
    border: '#FFAE33',
    dot: '#FFAE33',
  },
  dangerous: {
    bg: 'rgba(255, 83, 118, 0.15)',
    text: '#E11D48',
    border: '#FF5376',
    dot: '#FF5376',
  },
  unknown: {
    bg: 'rgba(148, 163, 184, 0.12)',
    text: '#64748B',
    border: '#CBD5E1',
    dot: '#94A3B8',
  },
  info: {
    bg: 'rgba(79, 117, 254, 0.12)',
    text: '#3B66F5',
    border: '#4F75FE',
    dot: '#4F75FE',
  },
};

export const STATUS_LABELS = {
  safe: 'Safe / Good',
  moderate: 'Moderate / Average',
  dangerous: 'Dangerous / Unhealthy',
  unknown: 'No Data',
};

/**
 * Format a numeric value with appropriate precision
 */
export const formatValue = (value, unit) => {
  if (value === null || value === undefined) return '—';
  const num = Number(value);
  if (isNaN(num)) return '—';
  if (unit === 'ppm' || unit === 'µg/m³' || unit === '°C' || unit === '%RH' || unit === '% RH') {
    return num.toFixed(1);
  }
  if (unit === 'ppb') return num.toFixed(1);
  return num.toFixed(0);
};

/**
 * Returns a percentage fill (0–100) for a threshold bar visualization
 */
export const getThresholdPercentage = (sensorType, value) => {
  if (value === null || value === undefined || isNaN(value)) return 0;
  const t = DEFAULT_THRESHOLDS[sensorType];
  if (!t) return 0;
  const max = t.dangerousMin * 1.4;
  return Math.min(100, Math.max(0, (Number(value) / max) * 100));
};

export const SENSOR_TYPES = [
  'co', 'co2', 'no2', 'so2', 'o3', 'pm25', 'pm10', 'temperature', 'humidity', 'voc', 'nh3', 'smoke'
];

export const TIME_RANGES = [
  { label: 'Last 1 Hour',  value: '1h',  hours: 1 },
  { label: 'Last 6 Hours', value: '6h',  hours: 6 },
  { label: 'Last 24 Hours',value: '24h', hours: 24 },
  { label: 'Last 7 Days',  value: '7d',  hours: 168 },
];

export const formatTimestamp = (ts) => {
  if (!ts) return 'Never';
  const d = new Date(ts);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const timeAgo = (ts) => {
  if (!ts) return 'Never';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};
