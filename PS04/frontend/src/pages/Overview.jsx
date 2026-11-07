import { useState } from 'react';
import {
  MdAir,
  MdElectricBolt,
  MdWaterDrop,
  MdDelete,
  MdLocalParking,
  MdArrowForward,
  MdFilterList,
  MdPieChart,
  MdTimeline,
} from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import {
  getOverviewChartData,
  getAirQualityChartData,
  getEnergyBarData,
  getAcDcEnergyData,
  getWaterTrendData,
  getDryWetBlockData,
  getParkingDistribution,
} from '../utils/chartHelpers';
import ExcelDownloadBtn from '../components/ExcelDownloadBtn';
import StatCard from '../components/StatCard';

export default function Overview({ data, history = [], onNavigate }) {
  const d = data || {};
  const [tabFilter, setTabFilter] = useState('all'); // 'all' | 'air' | 'energy' | 'water' | 'waste' | 'digitaltwin'

  // Dynamic Telemetry Datasets for each Dashboard Tab
  const overviewTrend = getOverviewChartData(d, history);
  const airQualityData = getAirQualityChartData(d, history);
  const energyBarData = getEnergyBarData(d, history);
  const acDcData = getAcDcEnergyData(d);
  const waterTrendData = getWaterTrendData(d, history);
  const wasteBlockData = getDryWetBlockData(d);
  const parkingData = getParkingDistribution(d);

  const tabsConfig = [
    { id: 'all', label: 'All Tab Graphs', icon: <MdTimeline size={14} /> },
    { id: 'air', label: 'Air Quality Tab', icon: <MdAir size={14} /> },
    { id: 'energy', label: 'Energy Tab', icon: <MdElectricBolt size={14} /> },
    { id: 'water', label: 'Water Tab', icon: <MdWaterDrop size={14} /> },
    { id: 'waste', label: 'Waste Tab', icon: <MdDelete size={14} /> },
    { id: 'digitaltwin', label: 'Digital Twin & Parking', icon: <MdLocalParking size={14} /> },
  ];

  return (
    <>
      {/* Tab Control / Export Banner */}
      <div className="tab-control-banner">
        <div className="banner-left-info">
          <div className="engine-status-pill">
            <span className="pulse-dot-small" />
            <span>Campus Cross-Domain Overview Telemetry</span>
          </div>
          <p className="banner-subtext">
            Unified multi-domain operational vitals displaying synchronized sensor curves for Air Quality, Energy, Water, Waste, and Smart Parking.
          </p>
        </div>
        <div className="banner-right-actions">
          <ExcelDownloadBtn tabName="overview" tabLabel="Overview" data={d} history={history} />
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid">
        <StatCard
          label="Sustainability Score"
          badgeText={d.sustainabilityScore != null ? (d.sustainabilityScore >= 80 ? 'Optimal' : d.sustainabilityScore >= 60 ? 'Good' : 'Needs attention') : 'Monitoring'}
          badgeType={d.sustainabilityScore != null ? (d.sustainabilityScore >= 80 ? 'green' : d.sustainabilityScore >= 60 ? 'blue' : 'amber') : 'gray'}
          nowLabel="Current Score"
          nowValue={d.sustainabilityScore ?? '-'}
          unit={d.sustainabilityScore != null ? '/100' : ''}
          secondaryLabel="Target Benchmark"
          secondaryValue="85+"
          secondaryColor="#15803d"
          footerLeft={d.sustainabilityScore != null ? (d.sustainabilityScore >= 80 ? '★ Excellent rating' : 'Active monitoring') : 'Live Ingestion'}
          footerRight="Benchmark: 80+"
          index={0}
        />

        <StatCard
          label="Air Quality Index (AQI)"
          badgeText={d.aqi != null ? (d.aqi <= 50 ? 'Good Quality' : d.aqi <= 100 ? 'Moderate' : 'Unhealthy') : 'Monitoring'}
          badgeType={d.aqi != null ? (d.aqi <= 50 ? 'green' : d.aqi <= 100 ? 'amber' : 'red') : 'gray'}
          nowLabel="AQI Now"
          nowValue={d.aqi ?? '-'}
          secondaryLabel="Threshold"
          secondaryValue="< 50"
          secondaryColor="#0284c7"
          footerLeft={d.pm25 != null ? `PM2.5: ${d.pm25} µg/m³` : 'Continuous monitoring'}
          footerRight="Safe range: 0–100"
          index={1}
        />

        <StatCard
          label="Today's Energy Meter"
          badgeText={d.livePower != null ? `Live ${d.livePower} kW` : 'Beats baseline'}
          badgeType="green"
          nowLabel="Consumed"
          nowValue={d.todaysEnergy ?? '-'}
          unit={d.todaysEnergy != null ? 'kWh' : ''}
          secondaryLabel="Peak Demand"
          secondaryValue={d.peakDemand != null ? `${d.peakDemand} kW` : '-'}
          secondaryColor="#f59e0b"
          footerLeft={d.estimatedCost != null ? `Est. Cost: ₹${d.estimatedCost}` : 'Grid draw active'}
          footerRight="Within grid quota"
          index={2}
        />

        <StatCard
          label="Water Storage & Consumption"
          badgeText={d.tankLevel != null ? `Tank ${d.tankLevel}%` : 'Normal Quota'}
          badgeType={d.tankLevel != null ? (d.tankLevel < 25 ? 'red' : d.tankLevel < 50 ? 'amber' : 'blue') : 'gray'}
          nowLabel="Consumed"
          nowValue={d.todaysUsage != null ? d.todaysUsage.toLocaleString('en-IN') : '-'}
          unit={d.todaysUsage != null ? 'L' : ''}
          secondaryLabel="Flow Rate"
          secondaryValue={d.flowRate != null ? `${d.flowRate} L/m` : '0 L/m'}
          secondaryColor="#0284c7"
          footerLeft={d.leakStatus ? `Leak: ${d.leakStatus}` : 'Acoustic normal'}
          footerRight="Quota: 5,000 L/day"
          index={3}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Section: Filter Controls for Tab-Specific Graphs
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, margin: '24px 0 16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Subsystem Graphs According to Tabs</span>
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            Real-time live sensor curves and telemetry distributions organized by dashboard functional tabs.
          </p>
        </div>

        <div className="filter-pill-group">
          <span className="filter-label"><MdFilterList size={14} /> View Tab:</span>
          {tabsConfig.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`filter-tab-pill ${tabFilter === tab.id ? 'active' : ''}`}
              onClick={() => setTabFilter(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Master Overview Campus Trend (shown when "All" or toggled) */}
      {(tabFilter === 'all') && (
        <div className="card card-full" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdTimeline size={20} color="#2563eb" />
              <span>Campus Multi-System Telemetry: Real-time Energy & Water Trends</span>
            </h3>
            <span className="card-tag">Cross-Domain Baseline</span>
          </div>
          <ChartBox id="overviewMasterChart" type="line" labels={overviewTrend.labels} datasets={overviewTrend.datasets} />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Graphs According to Tabs
          ═══════════════════════════════════════════════════════════════════ */}

      {/* 1. AIR QUALITY TAB GRAPH */}
      {(tabFilter === 'all' || tabFilter === 'air') && (
        <div className={tabFilter === 'air' ? 'card card-full' : ''}>
          {tabFilter !== 'air' ? null : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MdAir size={22} color="#0284c7" />
                <span>Air Quality & Multi-Pollutant Live Stream (Air Quality Tab)</span>
              </h3>
              {onNavigate && (
                <button
                  type="button"
                  className="btn-action btn-action--primary"
                  onClick={() => onNavigate('dashboard', 'air')}
                  style={{ gap: 6, fontSize: 12.5 }}
                >
                  <span>Open Full Air Quality Tab</span>
                  <MdArrowForward size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* When 'all' is selected: Render balanced 2-column grid */}
      {tabFilter === 'all' && (
        <>
          {/* Row 1: Air Quality + Energy Power Draw */}
          <div className="two-even">
            {/* Air Quality Tab Graph */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MdAir size={20} color="#0284c7" />
                  <span style={{ fontSize: 15.5, fontWeight: 750 }}>Air Quality: Pollutants Timeline</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="card-tag">Air Quality Tab</span>
                  {onNavigate && (
                    <button
                      type="button"
                      className="btn-action"
                      style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8, gap: 3 }}
                      onClick={() => onNavigate('dashboard', 'air')}
                      title="Open Air Quality Tab"
                    >
                      <span>Tab</span>
                      <MdArrowForward size={12} />
                    </button>
                  )}
                </div>
              </div>
              <ChartBox id="overviewAirChart" type="line" labels={airQualityData.labels} datasets={airQualityData.datasets} />
              <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>PM2.5: <b>{d.pm25 ?? 18} µg/m³</b> • PM10: <b>{d.pm10 ?? 42}</b></span>
                <span>AQI: <b>{d.aqi ?? 42}</b></span>
              </div>
            </div>

            {/* Energy Tab Graph */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MdElectricBolt size={20} color="#f59e0b" />
                  <span style={{ fontSize: 15.5, fontWeight: 750 }}>Energy: Power Draw & Daily Curve</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="card-tag">Energy Tab</span>
                  {onNavigate && (
                    <button
                      type="button"
                      className="btn-action"
                      style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8, gap: 3 }}
                      onClick={() => onNavigate('dashboard', 'energy')}
                      title="Open Energy Tab"
                    >
                      <span>Tab</span>
                      <MdArrowForward size={12} />
                    </button>
                  )}
                </div>
              </div>
              <ChartBox id="overviewEnergyChart" type="bar" labels={energyBarData.labels} datasets={energyBarData.datasets} />
              <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Live Power: <b>{d.livePower ?? 18.4} kW</b></span>
                <span>Today's Energy: <b>{d.todaysEnergy ?? 142.5} kWh</b></span>
              </div>
            </div>
          </div>

          {/* Row 2: Water Consumption + Block-Wise Waste */}
          <div className="two-even">
            {/* Water Tab Graph */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MdWaterDrop size={20} color="#06b6d4" />
                  <span style={{ fontSize: 15.5, fontWeight: 750 }}>Water: Consumption & Flow Rates</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="card-tag">Water Tab</span>
                  {onNavigate && (
                    <button
                      type="button"
                      className="btn-action"
                      style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8, gap: 3 }}
                      onClick={() => onNavigate('dashboard', 'water')}
                      title="Open Water Tab"
                    >
                      <span>Tab</span>
                      <MdArrowForward size={12} />
                    </button>
                  )}
                </div>
              </div>
              <ChartBox id="overviewWaterChart" type="line" labels={waterTrendData.labels} datasets={waterTrendData.datasets} />
              <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Consumed: <b>{d.todaysUsage ? d.todaysUsage.toLocaleString('en-IN') : '3,420'} L</b></span>
                <span>Flow: <b>{d.flowRate ?? 14.2} L/m</b> • Tank: <b>{d.tankLevel ?? 78}%</b></span>
              </div>
            </div>

            {/* Waste Tab Graph */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MdDelete size={20} color="#10b981" />
                  <span style={{ fontSize: 15.5, fontWeight: 750 }}>Waste: Block-Wise Dry vs. Wet</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="card-tag">Waste Tab</span>
                  {onNavigate && (
                    <button
                      type="button"
                      className="btn-action"
                      style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8, gap: 3 }}
                      onClick={() => onNavigate('dashboard', 'waste')}
                      title="Open Waste Tab"
                    >
                      <span>Tab</span>
                      <MdArrowForward size={12} />
                    </button>
                  )}
                </div>
              </div>
              <ChartBox id="overviewWasteChart" type="bar" labels={wasteBlockData.labels} datasets={wasteBlockData.datasets} />
              <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Dry: <b>{d.wasteDry ?? 142} kg</b> • Wet: <b>{d.wasteWet ?? 120} kg</b></span>
                <span>Blocks A–E Monitored</span>
              </div>
            </div>
          </div>

          {/* Row 3: AC/DC Distribution + Smart Parking Allocation */}
          <div className="two-even">
            {/* Energy AC vs DC Doughnut */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MdPieChart size={20} color="#2563eb" />
                  <span style={{ fontSize: 15.5, fontWeight: 750 }}>Energy: AC vs. DC Sub-Metering</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="card-tag">Energy Tab</span>
                  {onNavigate && (
                    <button
                      type="button"
                      className="btn-action"
                      style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8, gap: 3 }}
                      onClick={() => onNavigate('dashboard', 'energy')}
                      title="Open Energy Tab"
                    >
                      <span>Tab</span>
                      <MdArrowForward size={12} />
                    </button>
                  )}
                </div>
              </div>
              <ChartBox id="overviewAcDcChart" type="doughnut" labels={acDcData.labels} datasets={acDcData.datasets} />
              <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>AC Mains (415V): <b>78%</b></span>
                <span>DC Clean Infeed (380V): <b>22%</b></span>
              </div>
            </div>

            {/* Smart Parking Allocation Doughnut */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MdLocalParking size={20} color="#8b5cf6" />
                  <span style={{ fontSize: 15.5, fontWeight: 750 }}>Parking: Status & Availability</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="card-tag">Digital Twin Tab</span>
                  {onNavigate && (
                    <button
                      type="button"
                      className="btn-action"
                      style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8, gap: 3 }}
                      onClick={() => onNavigate('dashboard', 'digitaltwin')}
                      title="Open Digital Twin & Parking Tab"
                    >
                      <span>Tab</span>
                      <MdArrowForward size={12} />
                    </button>
                  )}
                </div>
              </div>
              <ChartBox id="overviewParkingChart" type="doughnut" labels={parkingData.labels} datasets={parkingData.datasets} />
              <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Occupied: <b>{d.occupiedSlots ?? 1} / 3 Parking</b></span>
                <span>Free: <b>{(d.totalSlots ?? 3) - (d.occupiedSlots ?? 1)} Parking</b> ({Math.round(((d.occupiedSlots ?? 1) / (d.totalSlots ?? 3)) * 100)}% Cap)</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Specific Filtered Tab Views (Enlarged Full-Width View) */}
      {tabFilter === 'air' && (
        <div className="card card-full">
          <ChartBox id="overviewSingleAirChart" type="line" labels={airQualityData.labels} datasets={airQualityData.datasets} />
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              Live Pollutant Ingestion: PM2.5 (<b>{d.pm25 ?? 18} µg/m³</b>), PM10 (<b>{d.pm10 ?? 42} µg/m³</b>), VOC (<b>{d.voc ?? 0.12} ppm</b>), NH3 (<b>{d.nh3 ?? 8} ppm</b>)
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: (d.aqi ?? 42) <= 50 ? '#15803d' : '#d97706' }}>
              AQI Score: {d.aqi ?? 42} (Safe Baseline)
            </span>
          </div>
        </div>
      )}

      {tabFilter === 'energy' && (
        <div className="two-even">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15.5 }}>Hourly Power Draw & Energy Timeline</h3>
              <span className="card-tag">Energy Profile</span>
            </div>
            <ChartBox id="overviewSingleEnergyBar" type="bar" labels={energyBarData.labels} datasets={energyBarData.datasets} />
          </div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15.5 }}>AC Supply vs. DC Supply Share</h3>
              <span className="card-tag">Sub-Metering</span>
            </div>
            <ChartBox id="overviewSingleAcDc" type="doughnut" labels={acDcData.labels} datasets={acDcData.datasets} />
          </div>
        </div>
      )}

      {tabFilter === 'water' && (
        <div className="card card-full">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdWaterDrop size={22} color="#06b6d4" />
              <span>Water Consumption & Solenoid Flow Rate Timeline (Water Tab)</span>
            </h3>
            {onNavigate && (
              <button
                type="button"
                className="btn-action btn-action--primary"
                onClick={() => onNavigate('dashboard', 'water')}
                style={{ gap: 6, fontSize: 12.5 }}
              >
                <span>Open Full Water Tab</span>
                <MdArrowForward size={14} />
              </button>
            )}
          </div>
          <ChartBox id="overviewSingleWaterChart" type="line" labels={waterTrendData.labels} datasets={waterTrendData.datasets} />
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              Hydraulic Status: Flow Rate <b>{d.flowRate ?? 14.2} L/min</b> • Reservoir Storage <b>{d.tankLevel ?? 78}%</b>
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0284c7' }}>
              Today's Water Quota: {d.todaysUsage ? d.todaysUsage.toLocaleString('en-IN') : '3,420'} / 5,000 L
            </span>
          </div>
        </div>
      )}

      {tabFilter === 'waste' && (
        <div className="card card-full">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdDelete size={22} color="#10b981" />
              <span>Block-Wise Dry vs. Wet Waste Segregation (Waste Tab)</span>
            </h3>
            {onNavigate && (
              <button
                type="button"
                className="btn-action btn-action--primary"
                onClick={() => onNavigate('dashboard', 'waste')}
                style={{ gap: 6, fontSize: 12.5 }}
              >
                <span>Open Full Waste Tab</span>
                <MdArrowForward size={14} />
              </button>
            )}
          </div>
          <ChartBox id="overviewSingleWasteChart" type="bar" labels={wasteBlockData.labels} datasets={wasteBlockData.datasets} />
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              Campus Blocks A through E Ultrasound Sonar Tracking: Dry Recyclables vs. Organic Wet Waste
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
              Sorting Compliance: 91.2%
            </span>
          </div>
        </div>
      )}

      {tabFilter === 'digitaltwin' && (
        <div className="two-even">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MdLocalParking size={22} color="#8b5cf6" />
                <span>Smart Parking Status (Digital Twin Tab)</span>
              </h3>
              {onNavigate && (
                <button
                  type="button"
                  className="btn-action"
                  onClick={() => onNavigate('dashboard', 'digitaltwin')}
                  style={{ gap: 4, fontSize: 11 }}
                >
                  <span>Open Twin</span>
                  <MdArrowForward size={12} />
                </button>
              )}
            </div>
            <ChartBox id="overviewSingleParkingDoughnut" type="doughnut" labels={parkingData.labels} datasets={parkingData.datasets} />
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 800 }}>Campus Spatial & Parking Summary</h4>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 16px' }}>
              The Digital Twin integrates 7 active campus nodes, 3 ultrasonic parking detectors (A1, A2, A3), and automated ANPR turnstiles with sub-second MongoDB sync.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total Parking</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>3 Parking (A1, A2, A3)</div>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Available Free</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{(d.totalSlots ?? 3) - (d.occupiedSlots ?? 1)} Free</div>
              </div>
            </div>
            {onNavigate && (
              <button
                type="button"
                className="btn-action btn-action--primary"
                onClick={() => onNavigate('dashboard', 'digitaltwin')}
                style={{ width: '100%', justifyContent: 'center', gap: 6 }}
              >
                <span>Launch Interactive 3D Digital Twin</span>
                <MdArrowForward size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
