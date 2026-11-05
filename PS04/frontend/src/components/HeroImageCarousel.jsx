import { useState, useEffect, useRef } from 'react';
import {
  MdNavigateBefore,
  MdNavigateNext,
  MdPause,
  MdPlayArrow,
  MdCheckCircle,
  MdSensors,
  MdAir,
  MdElectricBolt,
  MdWaterDrop,
  MdApartment,
} from 'react-icons/md';

export default function HeroImageCarousel({ data = {}, onGoToDashboard }) {
  const d = data || {};

  const SLIDES = [
    {
      id: 1,
      image: '/hero-slides/slide1.jpg',
      fallbackImage: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1000&q=80',
      badge: 'Facility Command Center',
      title: 'Autonomous Campus AI Operations',
      subtitle: 'Centralized edge-to-cloud neural IoT monitoring and incident triage',
      tag: `Score: ${d.sustainabilityScore ?? 84}/100 ★`,
      icon: <MdApartment size={18} color="#38bdf8" />,
      accent: '#38bdf8',
      tab: 'overview',
    },
    {
      id: 2,
      image: '/hero-slides/slide2.jpg',
      fallbackImage: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=1000&q=80',
      badge: 'Atmospheric Microclimate',
      title: 'Multi-Gas & Air Purity Surveillance',
      subtitle: 'Particulate PM2.5, toxic NH3 gas, CO₂, smoke vapors & weather array',
      tag: `${d.aqi ?? 54} AQI • Optimal`,
      icon: <MdAir size={18} color="#10b981" />,
      accent: '#10b981',
      tab: 'air',
    },
    {
      id: 3,
      image: '/hero-slides/slide3.jpg',
      fallbackImage: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1000&q=80',
      badge: 'Electrical Grid Balancing',
      title: 'Substation Power & Peak Demand',
      subtitle: 'Intraday wattage tracking, transformer overload protection & dynamic tariffs',
      tag: `${d.livePower ?? 18.4} kW Live Draw`,
      icon: <MdElectricBolt size={18} color="#f59e0b" />,
      accent: '#f59e0b',
      tab: 'energy',
    },
    {
      id: 4,
      image: '/hero-slides/slide4.jpg',
      fallbackImage: 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=1000&q=80',
      badge: 'Hydraulic Actuation',
      title: 'Reservoir Depth & Remote Valves',
      subtitle: 'Ultrasonic tank levels, acoustic leak detection & sub-second solenoid isolation',
      tag: `${d.tankLevel ?? 78}% Storage Tank`,
      icon: <MdWaterDrop size={18} color="#06b6d4" />,
      accent: '#06b6d4',
      tab: 'water',
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imgError, setImgError] = useState({});

  const DURATION = 4000; // 4 seconds per slide

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
    }, DURATION);

    return () => clearInterval(timer);
  }, [isPaused, SLIDES.length]);

  const goTo = (idx) => setCurrentIndex(idx);
  const prev = () => setCurrentIndex((cur) => (cur - 1 + SLIDES.length) % SLIDES.length);
  const next = () => setCurrentIndex((cur) => (cur + 1) % SLIDES.length);

  const handleImgError = (idx) => {
    setImgError((prev) => ({ ...prev, [idx]: true }));
  };

  const cur = SLIDES[currentIndex];

  return (
    <div
      className="hero-carousel-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Slide Frame ── */}
      <div className="hero-carousel-viewport">
        {SLIDES.map((slide, idx) => {
          const isActive = idx === currentIndex;
          const imgSrc = imgError[idx] ? slide.fallbackImage : slide.image;

          return (
            <div
              key={slide.id}
              className={`hero-carousel-slide ${isActive ? 'active' : ''}`}
              aria-hidden={!isActive}
            >
              <img
                src={imgSrc}
                alt={slide.title}
                className="hero-carousel-img"
                onError={() => handleImgError(idx)}
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
              <div className="hero-carousel-gradient-overlay" />
            </div>
          );
        })}
      </div>

      {/* ── Floating Top Pill: Live Badge ── */}
      <div className="hero-carousel-top-badge">
        <span className="hero-carousel-dot" style={{ background: cur.accent }} />
        <span>{cur.badge}</span>
        <span className="hero-carousel-tag-pill">{cur.tag}</span>
      </div>

      {/* ── Floating Bottom Glassmorphism Info Overlay ── */}
      <div className="hero-carousel-bottom-card">
        <div className="hero-carousel-info-row">
          <div className="hero-carousel-icon-box" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
            {cur.icon}
          </div>
          <div className="hero-carousel-text-box">
            <h4 className="hero-carousel-title">{cur.title}</h4>
            <p className="hero-carousel-sub">{cur.subtitle}</p>
          </div>
        </div>

        {/* Action button inside slide card */}
        {onGoToDashboard && (
          <button
            type="button"
            className="hero-carousel-action-link"
            onClick={() => onGoToDashboard(cur.tab)}
            style={{ color: cur.accent }}
          >
            <span>Explore Console</span>
            <span style={{ fontSize: 14 }}>→</span>
          </button>
        )}
      </div>

      {/* ── Navigation Arrows ── */}
      <button
        type="button"
        className="hero-carousel-arrow hero-carousel-arrow--left"
        onClick={prev}
        aria-label="Previous image"
      >
        <MdNavigateBefore size={22} />
      </button>
      <button
        type="button"
        className="hero-carousel-arrow hero-carousel-arrow--right"
        onClick={next}
        aria-label="Next image"
      >
        <MdNavigateNext size={22} />
      </button>

      {/* ── Interactive 4-Dot Indicators ── */}
      <div className="hero-carousel-dots">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            type="button"
            className={`hero-carousel-dot-btn ${idx === currentIndex ? 'active' : ''}`}
            onClick={() => goTo(idx)}
            aria-label={`Go to image slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Play/Pause indicator */}
      <button
        type="button"
        className="hero-carousel-playpause"
        onClick={() => setIsPaused((p) => !p)}
        title={isPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
        aria-label={isPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
      >
        {isPaused ? <MdPlayArrow size={14} /> : <MdPause size={14} />}
      </button>
    </div>
  );
}

