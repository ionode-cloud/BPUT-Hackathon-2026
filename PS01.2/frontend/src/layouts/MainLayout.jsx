import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Radio, Gauge, BarChart3,
  Wind, Menu, AlertTriangle, Wifi, WifiOff
} from 'lucide-react';
import { useAlerts } from '../context/AlertContext';
import socket from '../services/socket';

const NAV_ITEMS = [
  { path: '/overview',   label: 'Dashboard',          icon: LayoutDashboard },
  { path: '/analytics',  label: 'Charts & Analytics', icon: BarChart3 },
  { path: '/nodes',      label: 'Nodes Management',   icon: Radio },
  { path: '/alerts',     label: 'Active Alerts',      icon: AlertTriangle, hasBadge: true },
  { path: '/sensors',    label: 'Sensors Detail',     icon: Gauge },
];

/* Map route → title for the top header bar */
const PAGE_TITLES = {
  '/overview':  'Dashboard Overview',
  '/analytics': 'Charts & Analytics',
  '/nodes':     'Nodes Management',
  '/alerts':    'Active Alerts',
  '/sensors':   'Sensor Details',
};

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [socketConn, setSocketConn]       = useState(socket.connected);
  const { activeAlertsCount }             = useAlerts();
  const location                          = useLocation();

  const closeSidebar = () => setSidebarOpen(false);

  const pageTitle = PAGE_TITLES[location.pathname] || 'AirSense IoT';

  /* Track socket connection for the live indicator */
  useEffect(() => {
    const onConn = () => setSocketConn(true);
    const onDisc = () => setSocketConn(false);
    socket.on('connect',    onConn);
    socket.on('disconnect', onDisc);
    return () => { socket.off('connect', onConn); socket.off('disconnect', onDisc); };
  }, []);

  return (
    <div className="app-layout">
      {/* ── Sidebar mobile overlay ────────────────── */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
      />

      {/* ── Sidebar ───────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Wind size={22} color="#FFFFFF" />
          </div>
          <div>
            <div className="sidebar-logo-text">
              Air<span>Sense</span> IoT
            </div>
            <div style={{
              fontSize: 10,
              color: 'rgba(110,231,183,0.65)',
              fontWeight: 700,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              marginTop: 1,
            }}>
              Environment Monitor
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">Main Menu</div>
          {NAV_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            const badgeVal = item.hasBadge
              ? (activeAlertsCount > 0 ? `+${activeAlertsCount}` : null)
              : null;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                style={{ animationDelay: `${idx * 0.07}s` }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, whiteSpace: 'normal', lineHeight: 1.25 }}>
                  {item.label}
                </span>
                {badgeVal && (
                  <span className="nav-badge-pill nav-badge-orange">
                    {badgeVal}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar footer — live indicator */}
        <div style={{
          margin: '12px 16px 20px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(16,185,129,0.15)',
          borderRadius: 12,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          {socketConn
            ? <Wifi size={14} color="#6EE7B7" />
            : <WifiOff size={14} color="#FB7185" />
          }
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: socketConn ? '#6EE7B7' : '#FB7185', letterSpacing: '0.4px' }}>
              {socketConn ? 'LIVE STREAM' : 'RECONNECTING'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(110,231,183,0.45)', marginTop: 1 }}>
              {socketConn ? 'WebSocket active' : 'Attempting connection…'}
            </div>
          </div>
          {socketConn && (
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#10B981',
              marginLeft: 'auto', flexShrink: 0,
              boxShadow: '0 0 8px #10B981',
              animation: 'liveDot 1.6s ease-in-out infinite',
            }} />
          )}
        </div>
      </aside>

      {/* ── Main content ──────────────────────────── */}
      <div className="main-content">

        {/* Mobile top bar */}
        <div className="mobile-top-bar">
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open Navigation"
          >
            <Menu size={20} />
          </button>
          <div className="mobile-brand">
            <Wind size={19} color="var(--color-primary)" />
            <span>AirSense IoT</span>
          </div>
          {activeAlertsCount > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 800,
              background: 'rgba(244,63,94,0.12)', color: '#BE123C',
              border: '1px solid rgba(244,63,94,0.3)',
              padding: '3px 10px', borderRadius: 999,
            }}>
              {activeAlertsCount} Alert{activeAlertsCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Desktop page header bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 28px 0',
          gap: 14,
          flexWrap: 'wrap',
        }}
          className="animate-in"
        >
          <div>
            <h1 style={{
              fontSize: 22,
              fontWeight: 900,
              color: 'var(--color-heading)',
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
            }}>
              {pageTitle}
            </h1>
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 3 }}>
              AirSense IoT · Environment Monitoring Platform
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Live status chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: socketConn ? 'rgba(16,185,129,0.10)' : 'rgba(244,63,94,0.10)',
              border: `1px solid ${socketConn ? 'rgba(16,185,129,0.30)' : 'rgba(244,63,94,0.30)'}`,
              borderRadius: 999, padding: '5px 12px',
              fontSize: 11.5, fontWeight: 700,
              color: socketConn ? '#047857' : '#BE123C',
              transition: 'all 0.3s ease',
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: socketConn ? '#10B981' : '#F43F5E',
                flexShrink: 0,
                boxShadow: socketConn ? '0 0 6px #10B981' : 'none',
                animation: socketConn ? 'liveDot 1.6s ease-in-out infinite' : 'none',
              }} />
              {socketConn ? 'Live Feed' : 'Offline'}
            </div>

            {/* Alert count chip (if any) */}
            {activeAlertsCount > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(244,63,94,0.10)',
                border: '1px solid rgba(244,63,94,0.30)',
                borderRadius: 999, padding: '5px 12px',
                fontSize: 11.5, fontWeight: 800, color: '#BE123C',
                animation: 'pulse 2s ease infinite',
              }}>
                <AlertTriangle size={12} />
                {activeAlertsCount} Active {activeAlertsCount === 1 ? 'Alert' : 'Alerts'}
              </div>
            )}
          </div>
        </div>

        {/* Page outlet */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
