import { useState, useEffect, useMemo } from 'react';
import './index.css';

import {
  MdApartment,
  MdAir,
  MdElectricBolt,
  MdWaterDrop,
  MdDelete,
  MdRefresh,
  MdSignalWifiOff,
  MdLogout,
  MdShield,
  MdHome,
  MdNotificationsActive,
} from 'react-icons/md';

import { NAV_ITEMS, PAGE_TITLES } from './data/constants';
import { useSensorData } from './hooks/useSensorData';
import { loadPersistedAlerts, countActiveAlerts } from './utils/alertEngine';

import LandingPage     from './pages/LandingPage';
import AdminLoginModal from './components/AdminLoginModal';
import Overview        from './pages/Overview';
import AirQuality      from './pages/AirQuality';
import Energy          from './pages/Energy';
import Water           from './pages/Water';
import Waste           from './pages/Waste';
import AlertHistory    from './pages/AlertHistory';

const PAGE_MAP = {
  overview: Overview,
  air:      AirQuality,
  energy:   Energy,
  water:    Water,
  waste:    Waste,
  alerts:   AlertHistory,
};

const NAV_ICONS = {
  overview: <MdApartment            size={18} />,
  air:      <MdAir                  size={18} />,
  energy:   <MdElectricBolt         size={18} />,
  water:    <MdWaterDrop            size={18} />,
  waste:    <MdDelete               size={18} />,
  alerts:   <MdNotificationsActive  size={18} />,
};

// Parse active view and page from URL hash
function parseRouteFromLocation() {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase().trim();

  if (hash === 'landing' || hash === '') {
    return { view: 'landing', page: 'overview' };
  }

  if (PAGE_MAP[hash]) {
    return { view: 'dashboard', page: hash };
  }

  if (hash.startsWith('dashboard/')) {
    const sub = hash.replace('dashboard/', '');
    if (PAGE_MAP[sub]) {
      return { view: 'dashboard', page: sub };
    }
  }

  if (hash === 'dashboard') {
    return { view: 'dashboard', page: 'overview' };
  }

  return null;
}

// Determine initial route on page load / refresh
function getInitialRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase().trim();
  if (hash) {
    const hashRoute = parseRouteFromLocation();
    if (hashRoute) {
      return hashRoute;
    }
  }

  // Fallback to localStorage so refresh keeps user on current page even without hash
  try {
    const savedView = localStorage.getItem('facility_ai_view');
    const savedPage = localStorage.getItem('facility_ai_page');
    if (savedView === 'dashboard') {
      const validPage = PAGE_MAP[savedPage] ? savedPage : 'overview';
      return { view: 'dashboard', page: validPage };
    }
    if (savedView === 'landing') {
      return { view: 'landing', page: 'overview' };
    }
  } catch (err) {
    console.error('Error reading localStorage for route:', err);
  }

  return { view: 'landing', page: 'overview' };
}

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
  const [initialRoute] = useState(() => getInitialRoute());
  const [view, setView] = useState(initialRoute.view); // 'landing' | 'dashboard'
  const [page, setPage] = useState(initialRoute.page);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const stored = localStorage.getItem('facility_ai_admin') || sessionStorage.getItem('facility_ai_admin');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

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

  const isAdmin = Boolean(adminUser);

  // Compute active unresolved high alerts count for sidebar notification badge
  const activeAlertCount = useMemo(() => {
    try {
      const alertList = loadPersistedAlerts(data);
      return countActiveAlerts(alertList);
    } catch {
      return 0;
    }
  }, [data]);

  // Unified navigation helper updating state, storage, and URL hash
  const navigateTo = (newView, newPage = page) => {
    const targetPage = PAGE_MAP[newPage] ? newPage : 'overview';
    setView(newView);
    setPage(targetPage);

    try {
      localStorage.setItem('facility_ai_view', newView);
      localStorage.setItem('facility_ai_page', targetPage);
    } catch (e) {
      console.error(e);
    }

    const targetHash = newView === 'landing' ? '#/' : `#/${targetPage}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  };

  // Sync hash in address bar silently when state changes
  useEffect(() => {
    const targetHash = view === 'landing' ? '#/' : `#/${page}`;
    if (window.location.hash !== targetHash && window.location.hash !== `#${page}`) {
      window.history.replaceState(null, '', targetHash);
    }
    try {
      localStorage.setItem('facility_ai_view', view);
      localStorage.setItem('facility_ai_page', page);
    } catch (e) {
      console.error(e);
    }
  }, [view, page]);

  // Handle browser back/forward buttons (hashchange event)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase().trim();
      if (!hash || hash === 'landing') {
        setView('landing');
        try {
          localStorage.setItem('facility_ai_view', 'landing');
        } catch {}
      } else {
        const route = parseRouteFromLocation();
        if (route) {
          setView(route.view);
          setPage(route.page);
          try {
            localStorage.setItem('facility_ai_view', route.view);
            localStorage.setItem('facility_ai_page', route.page);
          } catch {}
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleOpenLogin = () => {
    setShowLoginModal(true);
  };

  const handleLoginSuccess = (session) => {
    setAdminUser(session);
    setShowLoginModal(false);
    navigateTo('dashboard', page);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('facility_ai_admin');
      sessionStorage.removeItem('facility_ai_admin');
      localStorage.setItem('facility_ai_view', 'landing');
      localStorage.setItem('facility_ai_page', 'overview');
    } catch (e) {
      console.error(e);
    }
    setAdminUser(null);
    navigateTo('landing');
  };

  const handleGoToDashboard = (targetPage = 'overview') => {
    const dest = typeof targetPage === 'string' && PAGE_MAP[targetPage] ? targetPage : 'overview';
    if (isAdmin) {
      navigateTo('dashboard', dest);
    } else {
      setPage(dest);
      try {
        localStorage.setItem('facility_ai_page', dest);
      } catch {}
      handleOpenLogin();
    }
  };

  // If in landing view, render the single-page landing page
  if (view === 'landing') {
    return (
      <>
        <LandingPage
          data={data}
          isAdmin={isAdmin}
          onOpenLogin={handleOpenLogin}
          onGoToDashboard={handleGoToDashboard}
        />
        <AdminLoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  // Dashboard View (Operations Console)
  const PageComponent = PAGE_MAP[page] || Overview;

  return (
    <div className="app">
      {/* ════ Sidebar ════ */}
      <aside className="sidebar">
        <div
          className="brand"
          onClick={() => navigateTo('landing')}
          style={{ cursor: 'pointer' }}
          title="Return to Public Landing Page"
        >
          <span className="brand-dot" />
          <span>Facility AI</span>
        </div>

        <nav className="nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={page === item.id ? 'active' : ''}
              onClick={() => navigateTo('dashboard', item.id)}
            >
              <span className="nav-icon">{NAV_ICONS[item.id]}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
              {item.id === 'alerts' && activeAlertCount > 0 && (
                <span className="nav-badge-pill" title={`${activeAlertCount} Active High Alerts`}>
                  {activeAlertCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Bottom (Return to Landing & Logout Buttons) */}
        <div className="sidebar-bottom">
          <button
            type="button"
            className="sidebar-logout-btn"
            style={{ marginBottom: '8px' }}
            onClick={() => navigateTo('landing')}
            title="Return to Landing Page"
          >
            <MdHome size={16} />
            <span>Landing Page</span>
          </button>
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Log out of Admin Console"
          >
            <MdLogout size={16} />
            <span>Logout</span>
          </button>
          <div className="sidebar-version-tag">
            Facility AI • PS04 Console
          </div>
        </div>
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
            {/* Admin Badge */}
            <div className="admin-status-pill" title={adminUser?.email || adminUser?.id || 'admin@gmail.com'}>
              <MdShield size={14} color="#38bdf8" />
              <span>{adminUser?.email || adminUser?.id ? `${adminUser.email || adminUser.id} (${adminUser?.role || 'Admin'})` : (adminUser?.name || 'admin@gmail.com')}</span>
            </div>

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
                API Error
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

      {/* Admin Login Modal (in case requested within dashboard) */}
      <AdminLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
