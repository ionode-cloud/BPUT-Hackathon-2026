// Navigation items and page titles for Sustainable Facility AI
export const NAV_ITEMS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'digitaltwin',  label: 'Digital Twin & Parking' },
  { id: 'air',          label: 'Air Quality' },
  { id: 'energy',       label: 'Energy' },
  { id: 'water',        label: 'Water' },
  { id: 'waste',        label: 'Waste' },
  { id: 'forecasting',  label: 'AI Forecast' },
  { id: 'priority',     label: 'Priority Engine' },
  { id: 'alerts',       label: 'Alert History' },
  { id: 'anomalydetection', label: 'Anomaly Detection' },
  { id: 'history',      label: 'History' },
  { id: 'adminconsole', label: 'Admin Console', adminOnly: true },
];

export const PAGE_TITLES = {
  overview:     'Overview',
  digitaltwin:  'Digital Twin and Smart Parking',
  air:          'Air and Weather Quality',
  energy:       'Energy Optimization',
  water:        'Water Management',
  waste:        'Waste Management',
  forecasting:  'AI Forecast',
  priority:     'Priority Engine',
  alerts:       'Alerts and History',
  anomalydetection: 'Anomaly Detection',
  history:      'Telemetry History Log',
  adminconsole: 'Admin Console & Access Control',
};

// All available subsystem tabs that can be granted to users
export const SUBSYSTEM_TABS = [
  { id: 'overview',    label: 'Overview',                category: 'General',     description: 'Executive facility metrics and status summary' },
  { id: 'digitaltwin', label: 'Digital Twin & Parking',  category: 'Spatial',     description: '3D spatial nodes and ultrasonic parking bays' },
  { id: 'air',         label: 'Air Quality',             category: 'Environment', description: 'AQI, PM2.5, PM10, CO2, and weather analytics' },
  { id: 'energy',      label: 'Energy',                  category: 'Utilities',   description: 'Power draw, HVAC compressors, and solar infeed' },
  { id: 'water',       label: 'Water',                   category: 'Utilities',   description: 'Flow sensors, reservoir tanks, and solenoid valves' },
  { id: 'waste',       label: 'Waste',                   category: 'Sanitation',  description: 'Smart bin levels, sonar telemetry, and segregation' },
  { id: 'forecasting', label: 'AI Forecast',             category: 'Analytics',   description: 'Predictive neural forecast and ARIMA trend models' },
  { id: 'priority',    label: 'Priority Engine',         category: 'Analytics',   description: 'Heuristic operational priority and action matrix' },
  { id: 'alerts',      label: 'Alert History',           category: 'Security',    description: 'Real-time alert triage, thresholds, and incidents' },
  { id: 'anomalydetection', label: 'Anomaly Detection',  category: 'Intelligence', description: 'Real-time telemetry anomaly detection and tabular diagnostics' },
  { id: 'history',     label: 'History',                 category: 'Ledger',      description: 'Historical telemetry records and Excel exports' },
];

