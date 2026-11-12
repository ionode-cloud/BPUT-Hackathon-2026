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
  MdAutoAwesome,
  MdTune,
  MdLayers,
  MdHistory,
  MdTroubleshoot,
  MdAdminPanelSettings,
  MdLockOutline,
} from 'react-icons/md';

import { NAV_ITEMS, PAGE_TITLES } from './data/constants';
import { useSensorData } from './hooks/useSensorData';
import { loadPersistedAlerts, countActiveAlerts } from './utils/alertEngine';

import LandingPage      from './pages/LandingPage';
import AdminLoginModal  from './components/AdminLoginModal';
import Overview         from './pages/Overview';
import DigitalTwin      from './pages/DigitalTwin';
import AirQuality       from './pages/AirQuality';
import Energy           from './pages/Energy';
import Water            from './pages/Water';
import Waste            from './pages/Waste';
import Forecasting      from './pages/Forecasting';
import PriorityEngine   from './pages/PriorityEngine';
import AlertHistory     from './pages/AlertHistory';
import AnomalyDetection from './pages/AnomalyDetection';
import History          from './pages/History';
import AdminConsole    from './pages/AdminConsole';

const PAGE_MAP = {
  overview:     Overview,
  digitaltwin:  DigitalTwin,
  air:          AirQuality,
  energy:       Energy,
  water:        Water,
  waste:        Waste,
  forecasting:  Forecasting,
  priority:     PriorityEngine,
  alerts:       AlertHistory,
  anomalydetection: AnomalyDetection,
  history:      History,
  adminconsole: AdminConsole,
};

const NAV_ICONS = {
  overview:     <MdApartment           size={18} />,
  digitaltwin:  <MdLayers              size={18} />,
  air:          <MdAir                 size={18} />,
  energy:       <MdElectricBolt        size={18} />,
  water:        <MdWaterDrop           size={18} />,
  waste:        <MdDelete              size={18} />,
  forecasting:  <MdAutoAwesome         size={18} />,
  priority:     <MdTune                size={18} />,
  alerts:       <MdNotificationsActive size={18} />,
  anomalydetection: <MdTroubleshoot    size={18} />,
  history:      <MdHistory             size={18} />,
  adminconsole: <MdAdminPanelSettings  size={18} />,
};

// Parse active view and page from clean URL pathname (with optional legacy hash fallback)
function parseRouteFromLocation() {
  const rawPath = (window.location.pathname || '/').replace(/^\/+|\/+$/g, '').toLowerCase().trim();
  const rawHash = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase().trim();
  const routeKey = rawPath || rawHash;

  if (routeKey === 'landing' || routeKey === '') {
    return { view: 'landing', page: 'overview' };
  }

  if (PAGE_MAP[routeKey]) {
    return { view: 'dashboard', page: routeKey };
  }

  if (routeKey.startsWith('dashboard/')) {
    const sub = routeKey.replace('dashboard/', '');
    if (PAGE_MAP[sub]) {
      return { view: 'dashboard', page: sub };
    }
  }

  if (routeKey === 'dashboard') {
    return { view: 'dashboard', page: 'overview' };
  }

  return null;
}

// Determine initial route on page load / refresh
function getInitialRoute() {
  const rawPath = (window.location.pathname || '/').replace(/^\/+|\/+$/g, '').toLowerCase().trim();
  const rawHash = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase().trim();
  if (rawPath || rawHash) {
    const pathRoute = parseRouteFromLocation();
    if (pathRoute) {
      return pathRoute;
    }
  }

  // Fallback to localStorage so refresh keeps user on current page
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
      const stored = localStorage.getItem('facility_ai_admin') || sessionStorage.getItem('facility_ai_admin') || localStorage.getItem('facility_ai_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const clock = useClock();

  const {
    data,
    history,
    allHistory,
    loading,
    error,
    isEmpty,
    refetch,
    updateData,
    pollInterval,
    setPollInterval,
  } = useSensorData();

  const isAdmin = Boolean(adminUser && adminUser.role === 'admin');

  // Compute authorized navigation items for sidebar
  const visibleNavItems = useMemo(() => {
    if (!adminUser) return NAV_ITEMS.filter(item => !item.adminOnly);
    if (adminUser.role === 'admin') {
      return NAV_ITEMS;
    }
    const allowed = Array.isArray(adminUser.allowedTabs) ? adminUser.allowedTabs : ['overview'];
    return NAV_ITEMS.filter((item) => {
      if (item.adminOnly) return false;
      return allowed.includes(item.id);
    });
  }, [adminUser]);

  // Check if current user is authorized for the active page
  const isPageAuthorized = useMemo(() => {
    if (!adminUser) return true;
    if (adminUser.role === 'admin') return true;
    if (page === 'adminconsole') return false;
    const allowed = Array.isArray(adminUser.allowedTabs) ? adminUser.allowedTabs : ['overview'];
    return allowed.includes(page);
  }, [adminUser, page]);

  // Compute active unresolved high alerts count for sidebar notification badge
  const activeAlertCount = useMemo(() => {
    try {
      const alertList = loadPersistedAlerts(data);
      return countActiveAlerts(alertList);
    } catch {
      return 0;
    }
  }, [data]);

  // Unified navigation helper updating state, storage, and clean URL path (no #)
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

    const targetPath = newView === 'landing' ? '/' : `/${targetPage}`;
    if (window.location.pathname !== targetPath || window.location.hash) {
      window.history.pushState(null, '', targetPath);
    }
  };

  // Sync clean URL path silently when state changes (strips any legacy #)
  useEffect(() => {
    const targetPath = view === 'landing' ? '/' : `/${page}`;
    if (window.location.pathname !== targetPath || window.location.hash) {
      window.history.replaceState(null, '', targetPath);
    }
    try {
      localStorage.setItem('facility_ai_view', view);
      localStorage.setItem('facility_ai_page', page);
    } catch (e) {
      console.error(e);
    }
  }, [view, page]);

  // Handle browser back/forward buttons (popstate event)
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRouteFromLocation();
      if (route) {
        setView(route.view);
        setPage(route.page);
        try {
          localStorage.setItem('facility_ai_view', route.view);
          localStorage.setItem('facility_ai_page', route.page);
        } catch {}
      } else {
        setView('landing');
        try {
          localStorage.setItem('facility_ai_view', 'landing');
        } catch {}
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenLogin = () => {
    setShowLoginModal(true);
  };

  const handleLoginSuccess = (session) => {
    setAdminUser(session);
    setShowLoginModal(false);

    // If user is non-admin and current page is not in their allowedTabs, route to first allowed tab
    if (session.role !== 'admin') {
      const allowed = Array.isArray(session.allowedTabs) && session.allowedTabs.length > 0
        ? session.allowedTabs
        : ['overview'];
      const target = allowed.includes(page) ? page : allowed[0];
      navigateTo('dashboard', target);
    } else {
      navigateTo('dashboard', page);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('facility_ai_admin');
      localStorage.removeItem('facility_ai_user');
      localStorage.removeItem('facility_ai_token');
      sessionStorage.removeItem('facility_ai_admin');
      sessionStorage.removeItem('facility_ai_user');
      sessionStorage.removeItem('facility_ai_token');
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
          <span>Greenexa</span>
        </div>

        <nav className="nav">
          {visibleNavItems.map(item => (
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
            className="sidebar-landing-btn"
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
        </div>
      </aside>

      {/* ════ Main Content ════ */}
      <main className="main">
        {page !== 'anomalydetection' && (
          <header className="header">
            <div>
              <h1>{PAGE_TITLES[page]}</h1>
              <div className="subtitle">
                Intelligent IoT Telemetry • Dynamic Sensor Curves • Live API Stream
              </div>
            </div>

            <div className="header-actions">
              {/* Admin / User Role Badge */}
              <div className="admin-status-pill" title={adminUser?.email || adminUser?.id || 'admin@gmail.com'}>
                <MdShield size={14} color={adminUser?.role === 'admin' ? '#38bdf8' : '#10b981'} />
                <span>
                  {adminUser?.email || adminUser?.id
                    ? `${adminUser.email || adminUser.id} (${(adminUser?.role || 'User').toUpperCase()})`
                    : 'admin@gmail.com (ADMIN)'}
                </span>
              </div>

              {/* Auto-Refresh Control & Manual Refresh Button */}
              <div className="refresh-control-group" title="Auto-refresh interval and manual refresh">
                <select
                  className="poll-interval-select"
                  value={pollInterval || 0}
                  onChange={(e) => setPollInterval(Number(e.target.value))}
                  title="Select how frequently telemetry reloads / refreshes"
                >
                  <option value={10000}>Auto: 10s</option>
                  <option value={15000}>Auto: 15s</option>
                  <option value={30000}>Auto: 30s</option>
                  <option value={60000}>Auto: 60s</option>
                  <option value={0}>Auto: Off</option>
                </select>
                <button
                  className="btn-action btn-refresh"
                  onClick={refetch}
                  title="Query latest sensor state from API (Manual Refresh)"
                >
                  <MdRefresh size={18} />
                </button>
              </div>

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
        )}

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

        {/* Access Restricted Banner if user is not authorized for this tab */}
        {!isPageAuthorized ? (
          <div className="state-box" style={{ maxWidth: '640px', margin: '4rem auto', textAlign: 'center', padding: '2.5rem' }}>
            <MdLockOutline size={56} color="#ef4444" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Subsystem Access Restricted
            </h2>
            <p style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Your account (<strong>{adminUser?.email || adminUser?.id || 'User'}</strong>) with role{' '}
              <span className="role-badge" style={{ verticalAlign: 'middle' }}>
                {(adminUser?.role || 'user').toUpperCase()}
              </span>{' '}
              is not granted access to the <strong>{PAGE_TITLES[page] || page}</strong> subsystem.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Authorized Subsystem Domains:
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {(Array.isArray(adminUser?.allowedTabs) ? adminUser.allowedTabs : ['overview']).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="btn-action"
                    onClick={() => navigateTo('dashboard', t)}
                    style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
                  >
                    {PAGE_TITLES[t] || t}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="btn-action btn-action--primary"
              style={{ marginTop: '2rem' }}
              onClick={() => {
                const target = Array.isArray(adminUser?.allowedTabs) && adminUser.allowedTabs[0]
                  ? adminUser.allowedTabs[0]
                  : 'overview';
                navigateTo('dashboard', target);
              }}
            >
              Switch to Authorized Dashboard
            </button>
          </div>
        ) : (
          /* Active Page — Always rendered when authorized */
          (!loading || data || isEmpty) && (
            <PageComponent
              data={data || {}}
              history={history || []}
              allHistory={allHistory || []}
              onUpdate={updateData}
              onNavigate={navigateTo}
              onRefresh={refetch}
            />
          )
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
