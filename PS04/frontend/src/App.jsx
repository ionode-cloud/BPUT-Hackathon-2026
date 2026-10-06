import { useState, useEffect } from 'react';
import './index.css';

import {
  MdApartment,
  MdAir,
  MdElectricBolt,
  MdWaterDrop,
  MdDelete,
  MdDirectionsCar,
  MdPrecisionManufacturing,
  MdShield,
  MdAutoAwesome,
  MdRefresh,
  MdSignalWifiOff,
} from 'react-icons/md';

import { NAV_ITEMS, PAGE_TITLES } from './data/constants';
import { useSensorData } from './hooks/useSensorData';

import Overview   from './pages/Overview';
import AirQuality from './pages/AirQuality';
import Energy     from './pages/Energy';
import Water      from './pages/Water';
import Waste      from './pages/Waste';
import Traffic    from './pages/Traffic';
import Assets     from './pages/Assets';
import Safety     from './pages/Safety';
import AIInsights from './pages/AIInsights';

const PAGE_MAP = {
  overview: Overview,
  air:      AirQuality,
  energy:   Energy,
  water:    Water,
  waste:    Waste,
  traffic:  Traffic,
  assets:   Assets,
  safety:   Safety,
  ai:       AIInsights,
};

const NAV_ICONS = {
  overview: <MdApartment              size={18} />,
  air:      <MdAir                    size={18} />,
  energy:   <MdElectricBolt           size={18} />,
  water:    <MdWaterDrop              size={18} />,
  waste:    <MdDelete                 size={18} />,
  traffic:  <MdDirectionsCar          size={18} />,
  assets:   <MdPrecisionManufacturing size={18} />,
  safety:   <MdShield                 size={18} />,
  ai:       <MdAutoAwesome            size={18} />,
};

function useClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function App() {
  const [page, setPage] = useState('overview');
  const clock = useClock();

  const {
    data,
    history,
    loading,
    error,
    isEmpty,
    refetch,
    updateData,
  } = useSensorData();

  const PageComponent = PAGE_MAP[page] || Overview;

  return (
    <div className="app">
      {/* ════ Sidebar ════ */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-dot" />
          <span>Facility AI</span>
        </div>

        <nav className="nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={page === item.id ? 'active' : ''}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{NAV_ICONS[item.id]}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ════ Main Content ════ */}
      <main className="main">
        <header className="header">
          <div>
            <h1>{PAGE_TITLES[page]}</h1>
            <div className="subtitle">
              Intelligent IoT Telemetry • Dynamic Sensor Curves • Live API Stream
            </div>
          </div>

          <div className="header-actions">
            {/* Refresh Button */}
            <button
              className="btn-action"
              onClick={refetch}
              title="Query latest sensor state from API"
            >
              <MdRefresh size={18} />
            </button>

            {/* Status Pill */}
            {error ? (
              <div className="status status--error">
                <MdSignalWifiOff size={14} />
                API Connection Error
              </div>
            ) : isEmpty || !data ? (
              <div className="status status--empty">
                <span className="pulse-dot" style={{ background: '#f59e0b' }} />
                Status: -
              </div>
            ) : (
              <div className="status">
                <span className="pulse-dot" />
                Live • {clock}
              </div>
            )}
          </div>
        </header>

        {/* Loading Spinner during initial fetch */}
        {loading && !data && !isEmpty && (
          <div className="state-box">
            <div className="spinner" />
            <h2>Connecting to Sensor API</h2>
            <p>Fetching real-time sensor snapshot from <code>/api/data</code>…</p>
          </div>
        )}

        {/* Error State */}
        {error && !data && (
          <div className="state-box">
            <MdSignalWifiOff size={48} color="#ef4444" />
            <h2>Cannot Reach Sensor Backend</h2>
            <p>Make sure the backend server is running on port 5000.<br /><code>{error}</code></p>
            <button className="btn-action btn-action--primary" onClick={refetch}>
              Retry Connection
            </button>
          </div>
        )}

        {/* Active Page — Always rendered; displays '-' if API has no data */}
        {(!loading || data || isEmpty) && (
          <PageComponent data={data || {}} history={history || []} onUpdate={updateData} />
        )}
      </main>
    </div>
  );
}
