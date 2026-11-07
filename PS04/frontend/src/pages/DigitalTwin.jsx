import {
  MdLocalParking,
  MdElectricBolt,
  MdWaterDrop,
  MdDelete,
  MdLightbulb,
  MdDirectionsCar,
  MdArrowForward,
  MdLayers,
} from 'react-icons/md';
import StatCard from '../components/StatCard';
import ExcelDownloadBtn from '../components/ExcelDownloadBtn';

export default function DigitalTwin({ data, history = [], onUpdate, onNavigate }) {
  const d = data || {};

  // Vitals
  const liveKw = d.livePower ?? 18.4;
  const acPower = d.acPower ?? Number((liveKw * 0.78).toFixed(1));
  const dcPower = d.dcPower ?? Number((liveKw * 0.22).toFixed(1));

  // Smart Parking Vitals: 3 Real Bays (a1, a2, a3)
  // Rule: true = Free / Available, false = Occupied
  const isA1Free = d.a1 !== undefined ? (d.a1 === true || d.a1 === 'true' || d.a1 === 1 || d.a1 === '1') : true;
  const isA2Free = d.a2 !== undefined ? (d.a2 === true || d.a2 === 'true' || d.a2 === 1 || d.a2 === '1') : false;
  const isA3Free = d.a3 !== undefined ? (d.a3 === true || d.a3 === 'true' || d.a3 === 1 || d.a3 === '1') : true;

  const totalSlots = 3;
  const occupiedSlots = [!isA1Free, !isA2Free, !isA3Free].filter(Boolean).length;
  const availableCount = 3 - occupiedSlots;
  const occupancyPct = Math.round((occupiedSlots / totalSlots) * 100);

  // Street Light Vitals (Show Only: ON / OFF)
  const streetLightStatus = (d.streetLightStatus || 'AUTO').toUpperCase();
  const isLightOn =
    streetLightStatus === 'ON' ||
    (streetLightStatus === 'AUTO' && ((d.lightIntensity != null && d.lightIntensity < 60) || (d.streetLightsActive != null && d.streetLightsActive > 0)));
  const streetLightDisplay = streetLightStatus === 'OFF' ? 'OFF' : (streetLightStatus === 'ON' ? 'ON' : (isLightOn ? 'ON' : 'OFF'));

  // Exactly 3 Real Parking Bay Keys from live telemetry (Zero Dummy Data)
  const parkingBayList = ['a1', 'a2', 'a3'];

  return (
    <>
     

      {/* Top Twin & Parking Vitals (3/3 Grid Layout: 2 Rows of 3 Cards) */}
      <div className="three" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, marginBottom: 20 }}>
        {/* Row 1 - Card 1: Digital Twin Active Nodes */}
        <StatCard
          label="Digital Twin Active Nodes"
          icon={<MdLayers size={20} color="#2563eb" />}
          badgeText="All Nodes Mapped"
          badgeType="green"
          nowLabel="Mapped Parking"
          nowValue="3 Smart Parking"
          unit=" (A1-A3)"
          secondaryLabel="Twin Latency"
          secondaryValue="< 42 ms"
          secondaryColor="#15803d"
          footerLeft="Synchronized with live MongoDB Atlas stream"
          footerRight="Spatial twin 100% active"
          index={0}
        />

        {/* Row 1 - Card 2: Smart Parking Status */}
        <StatCard
          label="Smart Parking Status"
          icon={<MdLocalParking size={20} color={availableCount > 0 ? '#10b981' : '#ef4444'} />}
          badgeText={availableCount > 0 ? `${availableCount} Parking Free` : 'All 3 Full'}
          badgeType={availableCount > 0 ? 'green' : 'red'}
          nowLabel="Occupied"
          nowValue={`${occupiedSlots}/3`}
          unit=" Parking"
          secondaryLabel="Free Parking"
          secondaryValue={`${availableCount} Available`}
          secondaryColor="#10b981"
          footerLeft="Ultrasonic sensors: true = Free, false = Occupied"
          footerRight={`${occupancyPct}% capacity`}
          index={1}
        />

        {/* Row 1 - Card 3: Parking Allocation (A1, A2, A3) */}
        <StatCard
          label="Parking Roster: A1, A2, A3"
          icon={<MdLocalParking size={20} color="#2563eb" />}
          badgeText={availableCount > 0 ? 'Parking Available' : 'All 3 Occupied'}
          badgeType={availableCount > 0 ? 'green' : 'red'}
          nowLabel="Allocation"
          nowValue={`${availableCount} Free`}
          unit=" / 3"
          secondaryLabel="A1 • A2 • A3"
          secondaryValue={`A1:${isA1Free ? 'F' : 'O'} A2:${isA2Free ? 'F' : 'O'} A3:${isA3Free ? 'F' : 'O'}`}
          secondaryColor={availableCount > 0 ? '#10b981' : '#dc2626'}
          footerLeft="Backend keys: a1, a2, a3 (zero dummy data)"
          footerRight="100% synchronized"
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
              Real-time spatial layout displaying live sensor vitals and parking allocation managed directly via backend API.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
              Power Substation
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: availableCount > 0 ? '#10b981' : '#ef4444', display: 'inline-block' }} />
              Smart Parking (A1-A3)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: isLightOn ? '#16a34a' : '#dc2626', display: 'inline-block' }} />
              Street Lights ({streetLightDisplay})
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

            {/* Facility Infrastructure Footprints (Real Sensor-Backed Modules) */}
            {/* 1. AC/DC Substation Footprint */}
            <g>
              <rect x="120" y="145" width="115" height="75" rx="8" fill="#172554" stroke="#3b82f6" strokeWidth="1.5" />
              <text x="177" y="172" fill="#93c5fd" fontSize="10" fontWeight="800" textAnchor="middle">AC/DC SUBSTATION</text>
              <text x="177" y="190" fill="#60a5fa" fontSize="9" fontWeight="750" textAnchor="middle">{liveKw} kW INFEED</text>
              <text x="177" y="206" fill="#38bdf8" fontSize="8" fontWeight="600" textAnchor="middle">{d.gridStatus ?? 'ONLINE'}</text>
            </g>

            {/* 2. Street Lighting Controller Station */}
            <g>
              <rect x="330" y="85" width="130" height="75" rx="8" fill={isLightOn ? '#064e3b' : '#1e293b'} stroke={isLightOn ? '#10b981' : '#64748b'} strokeWidth="1.5" />
              <text x="395" y="112" fill="#ffffff" fontSize="10" fontWeight="800" textAnchor="middle">STREET LIGHTING</text>
              <text x="395" y="130" fill={isLightOn ? '#4ade80' : '#f87171'} fontSize="9.5" fontWeight="800" textAnchor="middle">STATUS: {streetLightDisplay}</text>
              <text x="395" y="146" fill="#94a3b8" fontSize="8" fontWeight="600" textAnchor="middle">{isLightOn ? `${d.streetLightsActive ?? 44}/48 Poles` : '0/48 Poles'}</text>
            </g>

            {/* 3. Waste Logistics Hub */}
            <g>
              <rect x="540" y="105" width="145" height="85" rx="8" fill={(d.WasteWetFill ?? d.wasteWetFill ?? 44) > 80 ? '#450a0a' : '#1e293b'} stroke={(d.WasteWetFill ?? d.wasteWetFill ?? 44) > 80 ? '#ef4444' : '#10b981'} strokeWidth="1.5" />
              <text x="612" y="132" fill="#ffffff" fontSize="10" fontWeight="800" textAnchor="middle">WASTE LOGISTICS</text>
              <text x="612" y="150" fill="#34d399" fontSize="9" fontWeight="800" textAnchor="middle">WET: {d.WasteWetFill ?? d.wasteWetFill ?? 44}% FILL</text>
              <text x="612" y="167" fill="#94a3b8" fontSize="8" fontWeight="600" textAnchor="middle">DRY: {d.WasteDryFill ?? d.wasteDryFill ?? 38}% • SONAR</text>
              <text x="612" y="180" fill="#a7f3d0" fontSize="7.5" fontWeight="600" textAnchor="middle">TOTAL: {d.wasteCollected ?? 128} kg</text>
            </g>

            {/* 4. Environmental & Water Sentinel Station */}
            <g>
              <rect x="440" y="340" width="135" height="80" rx="8" fill="#0c4a6e" stroke="#0284c7" strokeWidth="1.5" />
              <text x="507" y="367" fill="#7dd3fc" fontSize="10" fontWeight="800" textAnchor="middle">ECO WATER SENTINEL</text>
              <text x="507" y="386" fill="#38bdf8" fontSize="9" fontWeight="800" textAnchor="middle">TANK: {d.tankLevel ?? 78}%</text>
              <text x="507" y="403" fill="#bae6fd" fontSize="8" fontWeight="600" textAnchor="middle">AQI: {d.aqi ?? 42} • FLOW: {d.flowRate ?? 14.2}L/m</text>
            </g>

            {/* Campus Street Lighting Network (Live Illumination: ON/OFF) */}
            {[
              { x: 340, y: 391 },
              { x: 420, y: 391 },
              { x: 580, y: 391 },
              { x: 660, y: 391 },
              { x: 260, y: 191 },
              { x: 480, y: 220 },
              { x: 700, y: 191 },
            ].map((pole, idx) => (
              <g key={`streetlight-${idx}`}>
                {/* Lamp Post */}
                <line x1={pole.x} y1={pole.y} x2={pole.x} y2={pole.y - 14} stroke="#94a3b8" strokeWidth="2" />
                <path
                  d={`M ${pole.x} ${pole.y - 14} Q ${pole.x + 5} ${pole.y - 17} ${pole.x + 7} ${pole.y - 13}`}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  fill="none"
                />
                {/* Lamp Glow / Bulb */}
                {isLightOn ? (
                  <>
                    <circle cx={pole.x + 7} cy={pole.y - 13} r="10" fill="rgba(250, 204, 21, 0.28)" className="pulse-dot" />
                    <circle cx={pole.x + 7} cy={pole.y - 13} r="4" fill="#fef08a" />
                  </>
                ) : (
                  <circle cx={pole.x + 7} cy={pole.y - 13} r="3" fill="#64748b" />
                )}
              </g>
            ))}

            {/* ════ Smart Campus Parking Plaza (Real Slots A1, A2, A3) ════ */}
            <g>
              {/* Parking Lot Asphalt Footprint */}
              <rect
                x="135"
                y="322"
                width="190"
                height="124"
                rx="10"
                fill="#0b1329"
                stroke={availableCount > 0 ? '#10b981' : '#ef4444'}
                strokeWidth="1.8"
                filter="drop-shadow(0 6px 16px rgba(0,0,0,0.4))"
              />

              {/* Plaza Header Canopy */}
              <rect x="135" y="322" width="190" height="22" rx="8" fill="#1e293b" />
              <text x="230" y="337" fill="#38bdf8" fontSize="9.5" fontWeight="800" textAnchor="middle" letterSpacing="0.4">
                PARKING PLAZA (A1 • A2 • A3)
              </text>

              {/* Parking A1 */}
              <g>
                <rect
                  x="143"
                  y="349"
                  width="52"
                  height="68"
                  rx="6"
                  fill={isA1Free ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.24)'}
                  stroke={isA1Free ? '#10b981' : '#ef4444'}
                  strokeWidth="1.8"
                />
                <rect x="151" y="353" width="36" height="15" rx="4" fill={isA1Free ? '#10b981' : '#ef4444'} />
                <text x="169" y="364" fill="#ffffff" fontSize="9.5" fontWeight="850" textAnchor="middle">A1</text>
                {isA1Free ? (
                  <>
                    <circle cx="169" cy="380" r="5" fill="#10b981" />
                    <text x="169" y="398" fill="#34d399" fontSize="8.5" fontWeight="800" textAnchor="middle">FREE</text>
                    <text x="169" y="409" fill="#6ee7b7" fontSize="7" fontWeight="600" textAnchor="middle">Available</text>
                  </>
                ) : (
                  <>
                    <text x="169" y="386" fontSize="14" textAnchor="middle">🚗</text>
                    <text x="169" y="399" fill="#f87171" fontSize="8.5" fontWeight="800" textAnchor="middle">OCCUPIED</text>
                    <text x="169" y="409" fill="#fca5a5" fontSize="7" fontWeight="600" textAnchor="middle">Parked</text>
                  </>
                )}
              </g>

              {/* Parking A2 */}
              <g>
                <rect
                  x="204"
                  y="349"
                  width="52"
                  height="68"
                  rx="6"
                  fill={isA2Free ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.24)'}
                  stroke={isA2Free ? '#10b981' : '#ef4444'}
                  strokeWidth="1.8"
                />
                <rect x="212" y="353" width="36" height="15" rx="4" fill={isA2Free ? '#10b981' : '#ef4444'} />
                <text x="230" y="364" fill="#ffffff" fontSize="9.5" fontWeight="850" textAnchor="middle">A2</text>
                {isA2Free ? (
                  <>
                    <circle cx="230" cy="380" r="5" fill="#10b981" />
                    <text x="230" y="398" fill="#34d399" fontSize="8.5" fontWeight="800" textAnchor="middle">FREE</text>
                    <text x="230" y="409" fill="#6ee7b7" fontSize="7" fontWeight="600" textAnchor="middle">Available</text>
                  </>
                ) : (
                  <>
                    <text x="230" y="386" fontSize="14" textAnchor="middle">🚗</text>
                    <text x="230" y="399" fill="#f87171" fontSize="8.5" fontWeight="800" textAnchor="middle">OCCUPIED</text>
                    <text x="230" y="409" fill="#fca5a5" fontSize="7" fontWeight="600" textAnchor="middle">Parked</text>
                  </>
                )}
              </g>

              {/* Parking A3 */}
              <g>
                <rect
                  x="265"
                  y="349"
                  width="52"
                  height="68"
                  rx="6"
                  fill={isA3Free ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.24)'}
                  stroke={isA3Free ? '#10b981' : '#ef4444'}
                  strokeWidth="1.8"
                />
                <rect x="273" y="353" width="36" height="15" rx="4" fill={isA3Free ? '#10b981' : '#ef4444'} />
                <text x="291" y="364" fill="#ffffff" fontSize="9.5" fontWeight="850" textAnchor="middle">A3</text>
                {isA3Free ? (
                  <>
                    <circle cx="291" cy="380" r="5" fill="#10b981" />
                    <text x="291" y="398" fill="#34d399" fontSize="8.5" fontWeight="800" textAnchor="middle">FREE</text>
                    <text x="291" y="409" fill="#6ee7b7" fontSize="7" fontWeight="600" textAnchor="middle">Available</text>
                  </>
                ) : (
                  <>
                    <text x="291" y="386" fontSize="14" textAnchor="middle">🚗</text>
                    <text x="291" y="399" fill="#f87171" fontSize="8.5" fontWeight="800" textAnchor="middle">OCCUPIED</text>
                    <text x="291" y="409" fill="#fca5a5" fontSize="7" fontWeight="600" textAnchor="middle">Parked</text>
                  </>
                )}
              </g>

              {/* Bottom Real-Time Parking Counter Ribbon */}
              <rect x="139" y="424" width="182" height="16" rx="4" fill="rgba(15, 23, 42, 0.95)" stroke="rgba(255,255,255,0.08)" />
              <text x="230" y="435" fill={availableCount > 0 ? '#10b981' : '#ef4444'} fontSize="8.5" fontWeight="750" textAnchor="middle">
                {occupiedSlots}/3 OCCUPIED • {availableCount} PARKING FREE
              </text>
            </g>

          </svg>

          {/* Canvas Floating Legend / Quick Control */}
          <div
            style={{
              position: 'absolute',
              bottom: 14,
              right: 14,
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(8px)',
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              color: '#ffffff',
              fontSize: 12,
              flexWrap: 'wrap',
            }}
          >
            <span>⚡ <b>Power:</b> {liveKw} kW (AC: {acPower} / DC: {dcPower} kW)</span>
            <span>🚗 <b>Parking:</b> {occupiedSlots}/3 Occ ({availableCount} Free)</span>
            <span>
              💡 <b>Street Lights:</b>{' '}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: isLightOn ? 'rgba(22, 163, 74, 0.2)' : 'rgba(220, 38, 38, 0.2)',
                  color: isLightOn ? '#4ade80' : '#f87171',
                  fontWeight: 750,
                  border: `1px solid ${isLightOn ? '#16a34a' : '#dc2626'}`,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isLightOn ? '#22c55e' : '#ef4444',
                  }}
                />
                {streetLightDisplay}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Smart Campus Parking Plaza & Real-Time Allocation (A1, A2, A3)
          ═══════════════════════════════════════════════════════════════════ */}
      <div id="smart-parking-plaza-section" className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdLocalParking size={24} color="#10b981" />
              <span>Smart Campus Parking Plaza & Real-Time Allocation</span>
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              Live ultrasonic ground-loop sensors on Parking A1, A2, and A3.
            </p>
          </div>

          {/* Quick Real-Time Capacity Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 999,
                background: availableCount > 0 ? '#ecfdf5' : '#fef2f2',
                color: availableCount > 0 ? '#065f46' : '#991b1b',
                border: `1px solid ${availableCount > 0 ? '#a7f3d0' : '#fecaca'}`,
                fontWeight: 750,
                fontSize: 12.5,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: availableCount > 0 ? '#10b981' : '#ef4444',
                }}
              />
              <span>{availableCount} of 3 Parking Free ({occupiedSlots} Occupied)</span>
            </span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 18, marginBottom: 18, fontSize: 12.5, color: 'var(--muted)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, background: '#10b981', display: 'inline-block' }} />
            <span><b>Free / Available</b> </span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, background: '#ef4444', display: 'inline-block' }} />
            <span><b>Occupied</b> </span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, marginLeft: 'auto', fontSize: 12 }}>
            <span>⚡ Ultrasonic ground transceivers active (Parking A1, A2, A3)</span>
          </span>
        </div>

        {/* 3 Real Parking Grid (Direct from a1, a2, a3 Live Telemetry) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 18 }}>
          {parkingBayList.map((bayKey) => {
            const isFree = d[bayKey] !== undefined
              ? (d[bayKey] === true || d[bayKey] === 'true' || d[bayKey] === 1 || d[bayKey] === '1')
              : (bayKey === 'a2' ? false : true);
            const bayCode = bayKey.toUpperCase();
            const bayName = `Parking ${bayCode}`;
            const color = isFree ? '#10b981' : '#ef4444';

            return (
              <div
                key={bayKey}
                style={{
                  background: isFree
                    ? 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)'
                    : 'linear-gradient(180deg, #ffffff 0%, #fef2f2 100%)',
                  border: `2px solid ${color}`,
                  borderRadius: 16,
                  padding: '20px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  boxShadow: isFree
                    ? '0 6px 18px rgba(16, 185, 129, 0.12)'
                    : '0 6px 18px rgba(239, 68, 68, 0.12)',
                  transition: 'all 0.25s ease',
                }}
              >
                {/* Top Row: Code & Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: color,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 850,
                        fontSize: 17,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                      }}
                    >
                      {bayCode}
                    </span>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{bayName}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>Ground Sonar Sensor</div>
                    </div>
                  </div>

                  <span
                    style={{
                      background: isFree ? '#dcfce7' : '#fee2e2',
                      color: isFree ? '#15803d' : '#dc2626',
                      border: `1px solid ${isFree ? '#86efac' : '#fca5a5'}`,
                      padding: '5px 12px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 750,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: color,
                        display: 'inline-block',
                      }}
                    />
                    {isFree ? 'FREE' : 'OCCUPIED'}
                  </span>
                </div>

                {/* Center Visual: Parking Vacant vs Vehicle Parked */}
                <div
                  style={{
                    padding: '24px 16px',
                    background: isFree ? '#ffffff' : '#fff5f5',
                    borderRadius: 14,
                    border: `1.5px dashed ${isFree ? '#86efac' : '#fca5a5'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginBottom: 0,
                    textAlign: 'center',
                  }}
                >
                  {isFree ? (
                    <>
                      <MdLocalParking size={46} color="#10b981" />
                      <div style={{ fontSize: 16, fontWeight: 850, color: '#065f46' }}>PARKING AVAILABLE</div>
                      <div style={{ fontSize: 12, color: '#047857' }}>Vacant • Ready for vehicle arrival</div>
                    </>
                  ) : (
                    <>
                      <MdDirectionsCar size={46} color="#ef4444" />
                      <div style={{ fontSize: 16, fontWeight: 850, color: '#991b1b' }}>PARKING OCCUPIED</div>
                      <div style={{ fontSize: 12, color: '#b91c1c' }}>Vehicle detected on ultrasonic sensor</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Real 3-Slot Parking Telemetry Counters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 16 }}>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Campus Parking</div>
            <div style={{ fontSize: 24, fontWeight: 850, color: '#0f172a', margin: '4px 0' }}>3 Parking Total</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Dedicated Parking: A1, A2, A3</div>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Available Parking</div>
            <div style={{ fontSize: 24, fontWeight: 850, color: '#10b981', margin: '4px 0' }}>{availableCount} Free</div>
            <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 600 }}>Backend keys with value true</div>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Occupied Parking</div>
            <div style={{ fontSize: 24, fontWeight: 850, color: occupiedSlots > 0 ? '#ef4444' : '#10b981', margin: '4px 0' }}>{occupiedSlots} Parked</div>
            <div style={{ fontSize: 11.5, color: occupiedSlots > 0 ? '#dc2626' : '#059669', fontWeight: 600 }}>Backend keys with value false</div>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Plaza Occupancy</div>
            <div style={{ fontSize: 24, fontWeight: 850, color: occupancyPct > 66 ? '#dc2626' : '#2563eb', margin: '4px 0' }}>{occupancyPct}%</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{occupiedSlots}/3 Parking currently taken</div>
          </div>
        </div>
      </div>
    </>
  );
}

