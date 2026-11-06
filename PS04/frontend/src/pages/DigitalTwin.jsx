import { useState } from 'react';
import {
  MdLocalParking,
  MdApartment,
  MdElectricBolt,
  MdWaterDrop,
  MdDelete,
  MdLightbulb,
  MdDirectionsCar,
  MdEvStation,
  MdCheckCircle,
  MdWarning,
  MdClose,
  MdArrowForward,
  MdLayers,
  MdFilterList,
} from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import StatCard from '../components/StatCard';
import ExcelDownloadBtn from '../components/ExcelDownloadBtn';

export default function DigitalTwin({ data, history = [], onUpdate, onNavigate }) {
  const d = data || {};

  // Selected asset node for Digital Twin telemetry inspector modal
  const [selectedNode, setSelectedNode] = useState(null);
  const [parkingFilter, setParkingFilter] = useState('all'); // 'all' | 'general' | 'faculty' | 'ev'
  const [hoveredNode, setHoveredNode] = useState(null);

  // Vitals
  const liveKw = d.livePower ?? 18.4;
  const acPower = d.acPower ?? Number((liveKw * 0.78).toFixed(1));
  const dcPower = d.dcPower ?? Number((liveKw * 0.22).toFixed(1));
  const totalSlots = d.totalSlots ?? 48;
  const occupiedSlots = d.occupiedSlots ?? 36;
  const occupancyPct = Math.round((occupiedSlots / totalSlots) * 100);

  // Street Light Vitals (Show Only: ON / OFF)
  const streetLightStatus = (d.streetLightStatus || 'AUTO').toUpperCase();
  const isLightOn =
    streetLightStatus === 'ON' ||
    (streetLightStatus === 'AUTO' && ((d.lightIntensity != null && d.lightIntensity < 60) || (d.streetLightsActive != null && d.streetLightsActive > 0)));
  const streetLightDisplay = streetLightStatus === 'OFF' ? 'OFF' : (streetLightStatus === 'ON' ? 'ON' : (isLightOn ? 'ON' : 'OFF'));

  // Digital Twin Campus Nodes
  const campusNodes = [
    {
      id: 'substation',
      name: 'Central Electrical Substation & AC/DC Array',
      type: 'energy',
      x: 180,
      y: 190,
      color: '#2563eb',
      icon: <MdElectricBolt size={20} color="#ffffff" />,
      tag: 'AC/DC SUB-METER',
      metrics: [
        { label: 'Total Infeed', value: `${liveKw} kW` },
        { label: 'AC Mains Supply', value: `${acPower} kW (415V)` },
        { label: 'DC Clean Supply', value: `${dcPower} kW (380V)` },
        { label: 'Grid Frequency', value: '50.0 Hz' },
      ],
      description: 'Main campus electrical distribution sub-metering dual AC feeder lines alongside rooftop solar DC bus and storage inverter infeed.',
      actionTab: 'energy',
    },
    {
      id: 'block-a',
      name: 'Block A — Academic & Lecture Complex',
      type: 'academic',
      x: 390,
      y: 130,
      color: '#3b82f6',
      icon: <MdApartment size={20} color="#ffffff" />,
      tag: 'Academic Hub',
      metrics: [
        { label: 'Indoor AQI', value: `${d.aqi ?? 42} AQI` },
        { label: 'Dry Waste Level', value: '42% (26.5 kg)' },
        { label: 'Air Purity', value: 'Good Standing' },
        { label: 'Occupancy', value: '1,420 Students' },
      ],
      description: 'Houses 18 smart lecture halls, seminar auditorium, and computer centers with automated HVAC carbon dioxide control.',
      actionTab: 'air',
    },
    {
      id: 'block-b',
      name: 'Block B — Hostel Towers & Student Housing',
      type: 'hostels',
      x: 620,
      y: 120,
      color: '#8b5cf6',
      icon: <MdApartment size={20} color="#ffffff" />,
      tag: 'Residential Hub',
      metrics: [
        { label: 'Water Reserve', value: `${d.tankLevel ?? 78}% Tank` },
        { label: 'Waste Average', value: '65% Fill (80.5 kg)' },
        { label: 'Domestic Supply', value: 'Valve 1: OPEN' },
        { label: 'Residents', value: '860 Hostellers' },
      ],
      description: 'Hostel Block 1 through 4 equipped with ultrasound rooftop tank telemetry and smart plumbing acoustic leak monitoring.',
      actionTab: 'water',
    },
    {
      id: 'block-c',
      name: 'Block C — Central Library & Admin',
      type: 'admin',
      x: 370,
      y: 280,
      color: '#0284c7',
      icon: <MdApartment size={20} color="#ffffff" />,
      tag: 'Administration',
      metrics: [
        { label: 'Power Consumption', value: '4.8 kW' },
        { label: 'Dry Waste Recycled', value: '19.5 kg (96% accuracy)' },
        { label: 'Ambient Noise', value: '38 dB (Whisper Silent)' },
        { label: 'Solar Rooftop', value: '12.4 kW Infeed' },
      ],
      description: 'Administrative offices, research repositories, and digital archives supported by net-metered rooftop solar PV generation.',
      actionTab: 'overview',
    },
    {
      id: 'block-d',
      name: 'Block D — Campus Canteen & Food Courts',
      type: 'canteen',
      x: 600,
      y: 270,
      color: '#ef4444',
      icon: <MdDelete size={20} color="#ffffff" />,
      tag: 'Wet Overflow Risk',
      metrics: [
        { label: 'Wet Waste Bin', value: '88% Fill (59.5 kg)' },
        { label: 'Dry Waste Bin', value: '58% Fill (31.0 kg)' },
        { label: 'Sanitation Dispatch', value: 'Vehicle 02 Assigned' },
        { label: 'Meal Turnover', value: '1,850 Meals/Day' },
      ],
      description: 'Primary student cafeteria and kitchen hub. Sonar volumetric sensors triggered an automated collection alert for organic bins.',
      actionTab: 'waste',
    },
    {
      id: 'environmental',
      name: 'Central Campus Environmental & Water Sentinel',
      type: 'environmental',
      x: 500,
      y: 400,
      color: '#0284c7',
      icon: <MdWaterDrop size={20} color="#ffffff" />,
      tag: 'ECO SENTINEL',
      metrics: [
        { label: 'Campus AQI', value: `${d.aqi ?? 42} AQI` },
        { label: 'Rooftop Water', value: `${d.tankLevel ?? 78}% Tank` },
        { label: 'Ambient Temp', value: `${d.temp ?? 27.4} °C` },
        { label: 'Humidity', value: `${d.humidity ?? 64}% RH` },
      ],
      description: 'Multi-parameter atmospheric meteorological mast and central water telemetry station monitoring campus-wide air purity and water reserves.',
      actionTab: 'air',
    },
    {
      id: 'parking',
      name: 'Campus Smart Parking Plaza & EV Station',
      type: 'parking',
      x: 230,
      y: 390,
      color: '#10b981',
      icon: <MdLocalParking size={20} color="#ffffff" />,
      tag: `${occupancyPct}% OCCUPIED`,
      metrics: [
        { label: 'Occupied Bays', value: `${occupiedSlots} / ${totalSlots} Bays` },
        { label: 'Available Bays', value: `${totalSlots - occupiedSlots} Bays Free` },
        { label: 'EV Fast-Chargers', value: '6 / 8 Active' },
        { label: 'Gate Turnstile Inflow', value: `${d.vehiclesToday ?? 482} Vehicles` },
      ],
      description: 'Ultrasonic ground-loop bay sensors paired with automated number-plate recognition (ANPR) at Main Gate 1 and Gate 3.',
      actionTab: 'digitaltwin',
    },
  ];

  // Parking Bays Matrix (48 slots across 3 zones)
  const parkingSlots = [
    // Zone A: General (Slots 1–24)
    ...Array.from({ length: 24 }, (_, i) => ({
      id: `A-${i + 1}`,
      number: `A-${String(i + 1).padStart(2, '0')}`,
      zone: 'general',
      zoneLabel: 'Zone A (General)',
      // Pre-assigned deterministic occupancy
      occupied: [1, 2, 4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 17, 18, 20, 21, 22, 24].includes(i + 1),
      isEv: false,
      vehicleType: 'Car / SUV',
      duration: `${Math.floor(Math.random() * 3 + 1)}h ${Math.floor(Math.random() * 45 + 10)}m`,
    })),
    // Zone B: Faculty & Staff (Slots 25–40)
    ...Array.from({ length: 16 }, (_, i) => ({
      id: `B-${i + 1}`,
      number: `B-${String(i + 1).padStart(2, '0')}`,
      zone: 'faculty',
      zoneLabel: 'Zone B (Faculty)',
      occupied: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15].includes(i + 1),
      isEv: false,
      vehicleType: 'Faculty Sedan',
      duration: '4h 15m',
    })),
    // Zone C: EV Fast-Charging (Slots 41–48)
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `C-${i + 1}`,
      number: `EV-${String(i + 1).padStart(2, '0')}`,
      zone: 'ev',
      zoneLabel: 'Zone C (EV Fast-Charge)',
      occupied: [1, 2, 3, 5, 6, 7].includes(i + 1),
      isEv: true,
      vehicleType: 'Electric Vehicle (11kW)',
      duration: '1h 20m (Charging)',
    })),
  ];

  const filteredSlots = parkingSlots.filter((slot) => {
    if (parkingFilter === 'all') return true;
    return slot.zone === parkingFilter;
  });

  const availableCount = parkingSlots.filter(s => !s.occupied).length;
  const evActiveCount = parkingSlots.filter(s => s.isEv && s.occupied).length;

  return (
    <>
      {/* Tab Control / Export Banner */}
      <div className="tab-control-banner">
        <div className="banner-left-info">
          <div className="engine-status-pill">
            <span className="pulse-dot-small" style={{ background: '#10b981' }} />
            <span>Campus Digital Twin 3D Model & Smart Parking Ecosystem</span>
          </div>
          <p className="banner-subtext">
            Spatial 2.5D visual twin unifying facility architecture, AC/DC electrical sub-metering, environmental monitoring, and real-time parking bay allocation.
          </p>
        </div>
        <div className="banner-right-actions">
          <ExcelDownloadBtn tabName="digitaltwin" tabLabel="Digital Twin & Parking" data={d} history={history} />
        </div>
      </div>

      {/* Top Twin & Parking Vitals (3/3 Grid Layout: 2 Rows of 3 Cards) */}
      <div className="three" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, marginBottom: 20 }}>
        {/* Row 1 - Card 1: Digital Twin Active Nodes */}
        <StatCard
          label="Digital Twin Active Nodes"
          icon={<MdLayers size={20} color="#2563eb" />}
          badgeText="All Nodes Mapped"
          badgeType="green"
          nowLabel="Mapped Nodes"
          nowValue="7 Campus Zones"
          unit=""
          secondaryLabel="Twin Latency"
          secondaryValue="< 42 ms"
          secondaryColor="#15803d"
          footerLeft="Synchronized with live MongoDB Atlas stream"
          footerRight="Spatial twin 100% active"
          index={0}
        />

        {/* Row 1 - Card 2: Smart Parking Bay Status */}
        <StatCard
          label="Smart Parking Bay Status"
          icon={<MdLocalParking size={20} color="#10b981" />}
          badgeText={occupancyPct > 85 ? 'Congested' : 'Healthy Flow'}
          badgeType={occupancyPct > 85 ? 'amber' : 'green'}
          nowLabel="Occupied"
          nowValue={`${occupiedSlots}/${totalSlots}`}
          unit=" Bays"
          secondaryLabel="Free Bays"
          secondaryValue={`${availableCount} Available`}
          secondaryColor="#10b981"
          footerLeft={`Turnstile inflow: ${d.vehiclesToday ?? 482} vehicles today`}
          footerRight={`${occupancyPct}% capacity`}
          index={1}
        />

        {/* Row 1 - Card 3: EV Fast-Charging Plaza */}
        <StatCard
          label="EV Fast-Charging Plaza"
          icon={<MdEvStation size={20} color="#7c3aed" />}
          badgeText="Fast Charging"
          badgeType="blue"
          nowLabel="Active EV Chargers"
          nowValue={`${evActiveCount}/8`}
          unit=" Bays"
          secondaryLabel="Charging Draw"
          secondaryValue="28.4 kW"
          secondaryColor="#7c3aed"
          footerLeft="11 kW Type-2 DC Fast Chargers"
          footerRight="Zone C EV Plaza"
          index={2}
        />

        {/* Row 2 - Card 4: Street Light Status (ON / OFF Show Only) */}
        <StatCard
          label="Street Light Status"
          icon={<MdLightbulb size={20} color={isLightOn ? '#16a34a' : '#dc2626'} />}
          badgeText={isLightOn ? 'LIGHTS ON' : 'LIGHTS OFF'}
          badgeType={isLightOn ? 'green' : 'red'}
          nowLabel="Illumination"
          nowValue={streetLightDisplay}
          nowColor={isLightOn ? '#16a34a' : '#dc2626'}
          unit=""
          secondaryLabel="Active Poles"
          secondaryValue={isLightOn ? `${d.streetLightsActive ?? 44}/48 Poles` : '0/48 Poles'}
          secondaryColor={isLightOn ? '#16a34a' : '#dc2626'}
          footerLeft={`Ambient Lux: ${d.lightIntensity ?? 140} lux (LDR sensor)`}
          footerRight={isLightOn ? 'Lamps ON' : 'Lamps OFF'}
          index={3}
        />

        {/* Row 2 - Card 5: AC & DC Power Sub-Metering */}
        <StatCard
          label="AC & DC Power Sub-Metering"
          icon={<MdElectricBolt size={20} color="#2563eb" />}
          badgeText="Sub-Metered Infeed"
          badgeType="blue"
          nowLabel="Active Power"
          nowValue={liveKw}
          unit=" kW"
          secondaryLabel="AC / DC Share"
          secondaryValue={`${acPower} / ${dcPower} kW`}
          secondaryColor="#10b981"
          footerLeft="Dual AC grid feeder and rooftop solar DC bus"
          footerRight="Continuous telemetry"
          index={4}
        />

        {/* Row 2 - Card 6: Campus Environmental Sentinel */}
        <StatCard
          label="Campus Environmental Sentinel"
          icon={<MdWaterDrop size={20} color="#0284c7" />}
          badgeText="Optimal Baseline"
          badgeType="green"
          nowLabel="Campus AQI"
          nowValue={d.aqi ?? 42}
          unit=" AQI"
          secondaryLabel="Water Reserve"
          secondaryValue={`${d.tankLevel ?? 78}% Tank`}
          secondaryColor="#0284c7"
          footerLeft={`Ambient: ${d.temp ?? 27.4}°C • ${d.humidity ?? 64}% RH`}
          footerRight="Atmospheric purity"
          index={5}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Interactive Campus Digital Twin Canvas (SVG 2.5D Isometric Model)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdLayers size={22} color="#2563eb" />
              <span>Campus Digital Twin Interactive Spatial Layout</span>
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              Click on any facility node (Substation, Academic Block, Canteen, Environmental Sentinel, or Parking Plaza) to open the real-time sensor HUD.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
              Academic/Power
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Parking/EV
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#0284c7', display: 'inline-block' }} />
              Eco Sentinel
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              Waste Alert
            </span>
          </div>
        </div>

        {/* 2.5D SVG Interactive Campus Plan */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '460px',
            background: 'radial-gradient(ellipse at center, #1e293b 0%, #0f172a 100%)',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <svg viewBox="0 0 800 480" style={{ width: '100%', height: '100%' }}>
            {/* Campus Grid Background */}
            <defs>
              <pattern id="twinGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="800" height="480" fill="url(#twinGrid)" />

            {/* Roadway Interconnects (Campus Boulevard & Ring Road) */}
            <path
              d="M 120 400 L 700 400 M 480 80 L 480 430 M 180 200 L 720 200"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="18"
              strokeLinecap="round"
            />
            <path
              d="M 120 400 L 700 400 M 480 80 L 480 430 M 180 200 L 720 200"
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeDasharray="8,8"
              fill="none"
            />

            {/* Building 3D Footprints */}
            {/* Block A */}
            <rect x="330" y="90" width="120" height="70" rx="8" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1.5" />
            <text x="390" y="130" fill="#93c5fd" fontSize="11" fontWeight="700" textAnchor="middle">BLOCK A (ACADEMIC)</text>

            {/* Block B */}
            <rect x="560" y="80" width="120" height="70" rx="8" fill="#3b0764" stroke="#8b5cf6" strokeWidth="1.5" />
            <text x="620" y="120" fill="#c4b5fd" fontSize="11" fontWeight="700" textAnchor="middle">BLOCK B (HOSTELS)</text>

            {/* Block C */}
            <rect x="310" y="240" width="120" height="70" rx="8" fill="#0c4a6e" stroke="#0284c7" strokeWidth="1.5" />
            <text x="370" y="280" fill="#7dd3fc" fontSize="11" fontWeight="700" textAnchor="middle">BLOCK C (LIBRARY)</text>

            {/* Block D Canteen */}
            <rect x="540" y="230" width="120" height="70" rx="8" fill="#450a0a" stroke="#ef4444" strokeWidth="1.5" />
            <text x="600" y="270" fill="#fca5a5" fontSize="11" fontWeight="700" textAnchor="middle">BLOCK D (CANTEEN)</text>

            {/* Substation */}
            <rect x="120" y="150" width="110" height="70" rx="8" fill="#172554" stroke="#3b82f6" strokeWidth="1.5" />
            <text x="175" y="190" fill="#93c5fd" fontSize="10" fontWeight="700" textAnchor="middle">AC/DC SUBSTATION</text>

            {/* Environmental & Water Sentinel Station */}
            <rect x="440" y="360" width="120" height="70" rx="8" fill="#0c4a6e" stroke="#0284c7" strokeWidth="1.5" />
            <text x="500" y="400" fill="#7dd3fc" fontSize="10" fontWeight="700" textAnchor="middle">ECO SENTINEL</text>

            {/* Parking Plaza */}
            <rect x="160" y="340" width="140" height="85" rx="8" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
            <text x="230" y="380" fill="#6ee7b7" fontSize="11" fontWeight="700" textAnchor="middle">SMART PARKING</text>
            <text x="230" y="400" fill="#a7f3d0" fontSize="9.5" textAnchor="middle">{occupiedSlots}/{totalSlots} BAYS OCCUPIED</text>

            {/* Interactive Node Hotspots */}
            {campusNodes.map((node) => {
              const isHovered = hoveredNode === node.id;
              const isSelected = selectedNode?.id === node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedNode(node)}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Pulsing ring */}
                  <circle
                    r={isHovered || isSelected ? 24 : 18}
                    fill={node.color}
                    opacity="0.3"
                    className="pulse-dot"
                    style={{ animationDuration: '2s' }}
                  />
                  {/* Core circle */}
                  <circle
                    r={isHovered ? 16 : 14}
                    fill={node.color}
                    stroke="#ffffff"
                    strokeWidth="2"
                    filter="drop-shadow(0 4px 8px rgba(0,0,0,0.5))"
                  />
                  {/* Tag banner */}
                  <rect
                    x="-42"
                    y="20"
                    width="84"
                    height="18"
                    rx="9"
                    fill="rgba(15, 23, 42, 0.85)"
                    stroke={node.color}
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="32"
                    fill="#ffffff"
                    fontSize="9.5"
                    fontWeight="750"
                    textAnchor="middle"
                  >
                    {node.tag}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Canvas Floating Legend / Quick Control */}
          <div
            style={{
              position: 'absolute',
              bottom: 14,
              right: 14,
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: '#ffffff',
              fontSize: 12,
            }}
          >
            <span>⚡ <b>Power Infeed:</b> {liveKw} kW (AC: {acPower} kW / DC: {dcPower} kW)</span>
            <span>🚗 <b>Parking:</b> {occupiedSlots}/{totalSlots} Bays Free</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Digital Twin Selected Asset HUD Inspector Modal
          ═══════════════════════════════════════════════════════════════════ */}
      {selectedNode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setSelectedNode(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 540,
              background: '#ffffff',
              borderRadius: 20,
              padding: 24,
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <MdClose size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ padding: 10, borderRadius: 12, background: selectedNode.color, color: '#ffffff' }}>
                {selectedNode.icon}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{selectedNode.name}</h3>
                <span style={{ fontSize: 12, fontWeight: 700, color: selectedNode.color }}>
                  Digital Twin Node • {selectedNode.tag}
                </span>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: '0 0 16px' }}>
              {selectedNode.description}
            </p>

            {/* Node Telemetry Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 18 }}>
              {selectedNode.metrics.map((m, idx) => (
                <div key={idx} style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{m.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Jump to specific subsystem tab button */}
            <button
              type="button"
              onClick={() => {
                const tab = selectedNode.actionTab;
                setSelectedNode(null);
                if (onNavigate && tab) onNavigate('dashboard', tab);
              }}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 750,
                fontSize: 13.5,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <span>Inspect {selectedNode.name} Full Console</span>
              <MdArrowForward size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Smart Parking System Visualizer (Interactive 48-Slot Bay Grid)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdLocalParking size={22} color="#10b981" />
              <span>Smart Campus Parking Plaza & Real-Time Bay Allocation</span>
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              Live ultrasonic ground bay sensors across Zone A (General), Zone B (Faculty), and Zone C (EV Fast-Charging).
            </p>
          </div>

          {/* Zone Filter Pills */}
          <div className="filter-pill-group">
            <span className="filter-label"><MdFilterList size={14} /> Filter:</span>
            <button
              type="button"
              className={`filter-tab-pill ${parkingFilter === 'all' ? 'active' : ''}`}
              onClick={() => setParkingFilter('all')}
            >
              All 48 Bays
            </button>
            <button
              type="button"
              className={`filter-tab-pill ${parkingFilter === 'general' ? 'active' : ''}`}
              onClick={() => setParkingFilter('general')}
            >
              Zone A (General)
            </button>
            <button
              type="button"
              className={`filter-tab-pill ${parkingFilter === 'faculty' ? 'active' : ''}`}
              onClick={() => setParkingFilter('faculty')}
            >
              Zone B (Faculty)
            </button>
            <button
              type="button"
              className={`filter-tab-pill ${parkingFilter === 'ev' ? 'active' : ''}`}
              onClick={() => setParkingFilter('ev')}
            >
              Zone C (EV Charging)
            </button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: '#10b981', display: 'inline-block' }} />
            <b>Available Bay</b> ({availableCount} Free)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: '#ef4444', display: 'inline-block' }} />
            <b>Occupied Bay</b> ({occupiedSlots - evActiveCount} Parked)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: '#3b82f6', display: 'inline-block' }} />
            <b>EV Fast-Charging Active</b> ({evActiveCount}/8 Plugged In)
          </span>
        </div>

        {/* 48-Bay Parking Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))',
            gap: 8,
            padding: 16,
            background: '#0f172a',
            borderRadius: 16,
            border: '2px dashed rgba(255, 255, 255, 0.15)',
          }}
        >
          {filteredSlots.map((slot) => {
            const isOcc = slot.occupied;
            const isEv = slot.isEv;
            const bg = isOcc ? (isEv ? '#2563eb' : '#dc2626') : '#059669';

            return (
              <div
                key={slot.id}
                title={`${slot.number} (${slot.zoneLabel}): ${isOcc ? `Occupied by ${slot.vehicleType} (${slot.duration})` : 'Available'}`}
                style={{
                  background: bg,
                  borderRadius: 10,
                  padding: '8px 4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  color: '#ffffff',
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  transition: 'transform 0.15s ease',
                  userSelect: 'none',
                }}
              >
                {isEv ? (
                  <MdEvStation size={16} />
                ) : isOcc ? (
                  <MdDirectionsCar size={16} />
                ) : (
                  <MdLocalParking size={16} />
                )}
                <span style={{ fontSize: 10.5, fontWeight: 800 }}>{slot.number}</span>
                <span style={{ fontSize: 8.5, opacity: 0.9 }}>{isOcc ? 'OCCUPIED' : 'FREE'}</span>
              </div>
            );
          })}
        </div>

        {/* Parking Turnstile Throughput & Mobility Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 18 }}>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Gate Turnstile Throughput</div>
            <div style={{ fontSize: 22, fontWeight: 850, color: '#0f172a', margin: '4px 0' }}>
              {d.vehiclesToday ?? 482} Vehicles
            </div>
            <div style={{ fontSize: 11.5, color: '#10b981', fontWeight: 600 }}>
              ANPR cameras active at Gate 1 & 3
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Average Gate Wait Time</div>
            <div style={{ fontSize: 22, fontWeight: 850, color: (d.avgWaitingTime ?? 3.5) > 6 ? '#dc2626' : '#2563eb', margin: '4px 0' }}>
              {d.avgWaitingTime ?? 3.5} Minutes
            </div>
            <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 600 }}>
              Smooth barrier throughput (&lt; 5s/car)
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>EV Charging Station Draw</div>
            <div style={{ fontSize: 22, fontWeight: 850, color: '#7c3aed', margin: '4px 0' }}>
              28.4 kW Active
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              6 vehicles charging on DC Fast Plug
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

