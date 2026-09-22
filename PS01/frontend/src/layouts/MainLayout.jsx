import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Radio, Activity, Gauge, BarChart3,
  Wind, Menu, Wifi, WifiOff, Calendar, AlertTriangle
} from 'lucide-react';
import { dashboardAPI } from '../services/api';
import socket from '../services/socket';
import { useAlerts } from '../context/AlertContext';

const NAV_ITEMS = [
  { path: '/overview',   label: 'Overview',                     icon: LayoutDashboard },
  { path: '/alerts',     label: 'Active Environmental Alerts',   icon: AlertTriangle },
  { path: '/nodes',      label: 'Nodes',                        icon: Radio },
  { path: '/sensors',    label: 'Sensors',                      icon: Gauge },
  { path: '/analytics',  label: 'Analytics',                    icon: BarChart3 },
];

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="header-time">
      {time.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })}
    </span>
  );
}

const PAGE_TITLES = {
  '/overview':   { title: 'Dashboard Overview',   subtitle: 'Real-time environmental quality and key sensor metrics' },
  '/alerts':     { title: 'Active Environmental Alerts', subtitle: 'Live multi-node threshold breaches and complete incident history' },
  '/nodes':      { title: 'Node Management',       subtitle: 'Hardware telemetry nodes (Node 1, 2...) and master node assignment' },
  '/sensors':    { title: 'Sensors Detail & Logs', subtitle: 'Detailed sensor metrics and reading history' },
  '/analytics':  { title: 'Analytics & Trends',    subtitle: 'Multi-parameter trends and visual analysis' },
};

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(socket.connected);
  const { activeAlertsCount } = useAlerts();
  const location = useLocation();
  const pageInfo = PAGE_TITLES[location.pathname] || {
    title: 'AirSense IoT',
    subtitle: 'Environmental Monitoring'
  };

  // Socket.IO real-time connectivity
  useEffect(() => {
    const handleConnect = () => setIsOnline(true);
    const handleDisconnect = () => setIsOnline(false);

    if (socket.connected) setIsOnline(true);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Fallback polling
    const checkOnline = async () => {
      try {
        await dashboardAPI.getSummary();
        setIsOnline(true);
      } catch {
        if (!socket.connected) setIsOnline(false);
      }
    };
    const interval = setInterval(checkOnline, 20000);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      clearInterval(interval);
    };
  }, []);

  const closeSidebar = () => setSidebarOpen(false);

  const todayDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="app-layout">
      {/* Sidebar overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Wind size={20} color="#4A4200" />
          </div>
          <div>
            <div className="sidebar-logo-text">Air<span>Sense</span> IoT</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-label)', fontWeight: 500 }}>
              Environmental Monitor
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Dashboard Navigation</div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <Icon size={17} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, whiteSpace: 'normal', lineHeight: 1.25 }}>{item.label}</span>
                {item.path === '/alerts' && activeAlertsCount > 0 && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: '#E87878',
                      color: '#FFFFFF',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: 999,
                      lineHeight: 1.4,
                      boxShadow: '0 1px 4px rgba(232, 120, 120, 0.4)',
                    }}
                  >
                    {activeAlertsCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-network-status">
            {isOnline
              ? <><span className="dot-online" /> <span>API Connected</span></>
              : <><span className="dot-offline" /> <span style={{ color: 'var(--color-danger)' }}>API Offline</span></>
            }
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        <header className="top-header">
          <div className="flex items-center gap-3">
            <button className="hamburger" onClick={() => setSidebarOpen(true)}>
              <Menu size={18} />
            </button>
            <div className="header-left">
              <h1>{pageInfo.title}</h1>
              <p>{pageInfo.subtitle}</p>
            </div>
          </div>

          <div className="header-right">
            {/* Date Pill */}
            <div className="header-date-pill">
              <Calendar size={13} color="var(--color-text-label)" />
              <span>{todayDate}</span>
              <span style={{ color: 'var(--color-border)', margin: '0 2px' }}>|</span>
              <Clock />
            </div>

            {/* Connection Status Icon */}
            <div className="header-btn" title={isOnline ? 'Backend Online (Socket.IO)' : 'Backend Offline'}>
              {isOnline ? <Wifi size={16} color="var(--color-safe)" /> : <WifiOff size={16} color="var(--color-danger)" />}
            </div>

            {/* User Avatar */}
            <div className="header-avatar" title="System Administrator">
              A
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
