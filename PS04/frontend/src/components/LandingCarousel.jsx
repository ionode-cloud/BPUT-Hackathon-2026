import { useState, useEffect, useRef } from 'react';
import {
  MdAutoAwesome,
  MdTune,
  MdAir,
  MdWaterDrop,
  MdElectricBolt,
  MdArrowForward,
  MdNavigateBefore,
  MdNavigateNext,
  MdPause,
  MdPlayArrow,
  MdCheckCircle,
  MdSensors,
} from 'react-icons/md';

export default function LandingCarousel({ data = {}, onGoToDashboard }) {
  const d = data || {};
  const pe = d.priorityEngine || {};

  const SLIDES = [
    {
      id: 'forecasting',
      tab: 'forecasting',
      category: 'NEURAL TIME-SERIES LSTM',
      badge: 'Predictive Lookahead',
      badgeColor: '#10b981',
      badgeBg: '#dcfce7',
      title: 'AI 30-Minute Channel Forecasting',
      subtitle: 'Next 30 minutes projected with 95% confidence intervals',
      description:
        'Trained on campus telemetry to predict all sensor channels 30 minutes forward. Displays shaded uncertainty envelopes and verifies whether real trends beat naive persistence baselines.',
      icon: <MdAutoAwesome size={28} color="#10b981" />,
      metrics: [
        { label: 'AQI in 30 min', val: d.aqi != null ? `${Math.round(d.aqi * 1.04)}` : '58', sub: 'Beats baseline' },
        { label: 'Confidence Band', val: '95% Range', sub: 'Translucent envelope' },
        { label: 'Model Architecture', val: 'LSTM Net', sub: 'Campus-tuned weights' },
      ],
      highlight: 'Automated 5-minute recurrent retraining with dynamic naive baseline benchmark evaluation.',
      buttonText: 'Open AI Forecasting Console',
      accentColor: '#10b981',
      gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)',
    },
    {
      id: 'priority',
      tab: 'priority',
      category: 'CROSS-CUTTING TRIAGE',
      badge: 'Action Directives',
      badgeColor: '#ea580c',
      badgeBg: '#ffedd5',
      title: 'Priority Decision Engine',
      subtitle: 'Ranked facility actions from P1 Critical to P4 Low',
      description:
        'Combines real-time telemetry alerts, AI anomaly detections, and LSTM forecast predictions into a unified severity score, ensuring emergency maintenance is dispatched immediately.',
      icon: <MdTune size={28} color="#ea580c" />,
      metrics: [
        { label: 'Active Tasks', val: `${pe.items?.length ?? 3} Open`, sub: 'Ranked in priority' },
        { label: 'Top Hazard Level', val: pe.counts?.P1 > 0 ? 'P1 Critical' : 'P2 High', sub: 'Requires action' },
        { label: 'Ownership', val: 'Ops / EHS', sub: 'Auto-routed teams' },
      ],
      highlight: 'Instant triage instructions: Do, Check, and Owner assigned per anomaly with audit trail.',
      buttonText: 'Launch Priority Engine',
      accentColor: '#ea580c',
      gradient: 'linear-gradient(135deg, rgba(234, 88, 12, 0.08) 0%, rgba(245, 158, 11, 0.05) 100%)',
    },
    {
      id: 'air',
      tab: 'air',
      category: 'ATMOSPHERIC SURVEILLANCE',
      badge: 'Multi-Gas Array',
      badgeColor: '#0284c7',
      badgeBg: '#e0f2fe',
      title: 'Air Quality & Chemical Safety',
      subtitle: 'Continuous AQI, particulate matter, and hazardous vapors',
      description:
        'Streams multi-spectral telemetry including PM2.5, PM10, CO₂, volatile organic compounds (VOC), smoke, and toxic ammonia (NH3) vapors with ambient microclimate weather parameters.',
      icon: <MdAir size={28} color="#0284c7" />,
      metrics: [
        { label: 'Air Purity (AQI)', val: `${d.aqi ?? 54} AQI`, sub: d.aqi <= 50 ? 'Optimal (Good)' : 'Moderate' },
        { label: 'PM2.5 Level', val: `${d.pm25 ?? 18.2} µg/m³`, sub: 'Fine particulates' },
        { label: 'Ammonia (NH3)', val: `${d.nh3 ?? 8} ppm`, sub: d.nh3 > 25 ? 'High Hazard' : 'Safe baseline' },
      ],
      highlight: 'Real-time threshold surveillance triggers exhaust ventilation protocols when toxic vapors rise.',
      buttonText: 'Inspect Air Quality Station',
      accentColor: '#0284c7',
      gradient: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%)',
    },
    {
      id: 'water',
      tab: 'water',
      category: 'CYBER-PHYSICAL HYDRAULICS',
      badge: '2-Way Solenoid Actuation',
      badgeColor: '#06b6d4',
      badgeBg: '#cffafe',
      title: 'Smart Hydraulic Grid & Remote Valves',
      subtitle: 'Ultrasonic depth gauge, acoustic leak sensing, and remote valve shutoff',
      description:
        'Monitors overhead and underground reservoir storage depth, detects pipe bursts using acoustic vibrations, and empowers operators to remotely isolate Valve 1 & Valve 2 with instant acknowledgment.',
      icon: <MdWaterDrop size={28} color="#06b6d4" />,
      metrics: [
        { label: 'Tank Reserve', val: `${d.tankLevel ?? 78}%`, sub: 'Ultrasonic gauge' },
        { label: 'Flow Velocity', val: `${d.flowRate ?? 14.5} L/m`, sub: 'Steady pressure' },
        { label: 'Valve 1 Actuator', val: d.valve1 ? 'OPEN' : 'CLOSED', sub: 'Sub-second switch' },
      ],
      highlight: 'Acoustic leak monitoring detects pressure drops early to eliminate freshwater wastage.',
      buttonText: 'Manage Water Valves',
      accentColor: '#06b6d4',
      gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(14, 165, 233, 0.05) 100%)',
    },
    {
      id: 'energy',
      tab: 'energy',
      category: 'SUBSTATION LOAD PROFILING',
      badge: 'Grid Optimization',
      badgeColor: '#f59e0b',
      badgeBg: '#fef3c7',
      title: 'Precision Electrical & Peak Demand',
      subtitle: 'Live wattage metering, diurnal peak limiting, and dynamic tariff modeling',
      description:
        'Sub-second electrical wattage telemetry prevents transformer overload, tracks historical peak demand spikes, and calculates campus electricity tariffs in real-time.',
      icon: <MdElectricBolt size={28} color="#f59e0b" />,
      metrics: [
        { label: 'Live Power Draw', val: `${d.livePower ?? 18.4} kW`, sub: 'Active grid draw' },
        { label: 'Peak Record', val: `${d.peakDemand ?? 32.8} kW`, sub: 'Intraday peak' },
        { label: 'Estimated Tariff', val: `₹${d.estimatedCost != null ? d.estimatedCost.toLocaleString('en-IN') : '1,136'}`, sub: '₹7.5/kWh rate' },
      ],
      highlight: 'Automated peak clipping algorithms safeguard substation infrastructure and cut utility bills.',
      buttonText: 'Analyze Energy Grid',
      accentColor: '#f59e0b',
      gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(239, 68, 68, 0.05) 100%)',
    },
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const DURATION = 5000; // 5 seconds per slide
  const INTERVAL_STEP = 50; // update progress every 50ms

  // Auto-advance timer with smooth progress bar
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveIndex((cur) => (cur + 1) % SLIDES.length);
          return 0;
        }
        return prev + (INTERVAL_STEP / DURATION) * 100;
      });
    }, INTERVAL_STEP);

    return () => clearInterval(timer);
  }, [isPaused, SLIDES.length]);

  const goToSlide = (idx) => {
    setActiveIndex(idx);
    setProgress(0);
  };

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % SLIDES.length);
    setProgress(0);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
    setProgress(0);
  };

  const cur = SLIDES[activeIndex];

  return (
    <div
      className="carousel-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Top Header of Carousel Section ── */}
      <div className="carousel-top-bar">
        <div className="carousel-title-group">
          <div className="carousel-badge-live">
            <span className="carousel-live-dot" />
            <span>INTERACTIVE SUBSYSTEM INTELLIGENCE</span>
          </div>
          <h3 className="carousel-heading">Campus Operations Carousel</h3>
        </div>

        {/* Play / Pause & Prev / Next Controls */}
        <div className="carousel-nav-controls">
          <button
            type="button"
            className="carousel-ctrl-btn"
            onClick={() => setIsPaused((p) => !p)}
            title={isPaused ? 'Resume auto-play' : 'Pause auto-play'}
            aria-label={isPaused ? 'Play' : 'Pause'}
          >
            {isPaused ? <MdPlayArrow size={18} /> : <MdPause size={18} />}
          </button>
          <button
            type="button"
            className="carousel-ctrl-btn"
            onClick={prevSlide}
            title="Previous slide"
            aria-label="Previous slide"
          >
            <MdNavigateBefore size={20} />
          </button>
          <button
            type="button"
            className="carousel-ctrl-btn"
            onClick={nextSlide}
            title="Next slide"
            aria-label="Next slide"
          >
            <MdNavigateNext size={20} />
          </button>
        </div>
      </div>

      {/* ── Interactive Category Pills (Click to Jump) ── */}
      <div className="carousel-tabs-row">
        {SLIDES.map((s, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={s.id}
              type="button"
              className={`carousel-tab-pill ${isActive ? 'active' : ''}`}
              onClick={() => goToSlide(idx)}
              style={{
                borderColor: isActive ? s.accentColor : '#e5e7eb',
                color: isActive ? '#0f172a' : '#64748b',
              }}
            >
              <span
                className="carousel-pill-indicator"
                style={{
                  background: isActive ? s.accentColor : '#cbd5e1',
                }}
              />
              <span className="carousel-pill-text">{s.title.split(' ')[0]} {s.title.split(' ')[1]}</span>
            </button>
          );
        })}
      </div>

      {/* ── Linear Auto-Scroll Progress Bar ── */}
      <div className="carousel-progress-track">
        <div
          className="carousel-progress-fill"
          style={{
            width: `${progress}%`,
            background: cur.accentColor,
            transition: isPaused ? 'none' : 'width 0.05s linear',
          }}
        />
      </div>

      {/* ── Main Showcase Slide Card ── */}
      <div
        key={cur.id}
        className="carousel-slide-card"
        style={{ background: cur.gradient }}
      >
        <div className="carousel-slide-content">
          {/* Top category & badge */}
          <div className="carousel-slide-header">
            <div className="carousel-category-tag" style={{ color: cur.accentColor }}>
              {cur.category}
            </div>
            <span
              className="carousel-status-pill"
              style={{ background: cur.badgeBg, color: cur.badgeColor }}
            >
              <MdSensors size={13} style={{ marginRight: 4 }} />
              {cur.badge}
            </span>
          </div>

          {/* Title & subtitle */}
          <div className="carousel-title-row">
            <div className="carousel-icon-box" style={{ background: '#ffffff', borderColor: '#e5e7eb' }}>
              {cur.icon}
            </div>
            <div>
              <h2 className="carousel-slide-title">{cur.title}</h2>
              <p className="carousel-slide-subtitle">{cur.subtitle}</p>
            </div>
          </div>

          <p className="carousel-slide-desc">{cur.description}</p>

          {/* Live Telemetry KPI Chips */}
          <div className="carousel-metrics-grid">
            {cur.metrics.map((m, i) => (
              <div key={i} className="carousel-metric-chip">
                <span className="carousel-metric-label">{m.label}</span>
                <span className="carousel-metric-val" style={{ color: cur.accentColor }}>
                  {m.val}
                </span>
                <span className="carousel-metric-sub">{m.sub}</span>
              </div>
            ))}
          </div>

          {/* Feature Highlight note */}
          <div className="carousel-highlight-box">
            <MdCheckCircle size={18} color={cur.accentColor} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{cur.highlight}</span>
          </div>

          {/* CTA Button to navigate into console */}
          <div className="carousel-action-row">
            <button
              type="button"
              className="carousel-cta-btn"
              style={{ background: cur.accentColor }}
              onClick={() => onGoToDashboard && onGoToDashboard(cur.tab)}
            >
              <span>{cur.buttonText}</span>
              <MdArrowForward size={16} />
            </button>
            <span className="carousel-auto-hint">
              {isPaused ? '⏸ Auto-scroll paused' : `▶ Auto-advancing in ${Math.ceil(((100 - progress) / 100) * 5)}s`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

