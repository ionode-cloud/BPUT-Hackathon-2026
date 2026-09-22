import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Radio, Gauge, BarChart3,
  Wind, Menu, AlertTriangle, Search
} from 'lucide-react';
import { useAlerts } from '../context/AlertContext';

const NAV_ITEMS = [
  { path: '/overview',   label: 'Dashboard',           icon: LayoutDashboard },
  { path: '/analytics',  label: 'Charts & Analytics',  icon: BarChart3 },
  { path: '/nodes',      label: 'Nodes Management',    icon: Radio },
  { path: '/alerts',     label: 'Active Alerts',       icon: AlertTriangle, hasBadge: true },
  { path: '/sensors',    label: 'Sensors Detail',      icon: Gauge },
];

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { activeAlertsCount } = useAlerts();

  const closeSidebar = () => setSidebarOpen(false);

  const filteredNav = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="app-layout">
      {/* Sidebar overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar (Deep Navy Slate) */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Wind size={22} color="#4F75FE" />
          </div>
          <div>
            <div className="sidebar-logo-text">Air<span>Sense</span> IoT</div>
            <div style={{ fontSize: 10.5, color: '#8E99B4', fontWeight: 600, letterSpacing: '0.4px' }}>
              ENVIRONMENT MONITOR
            </div>
          </div>
        </div>

        {/* Sidebar Search */}
        <div className="sidebar-search-container">
          <div className="sidebar-search-box">
            <Search size={14} color="#8E99B4" />
            <input
              type="text"
              className="sidebar-search-input"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main Menu</div>
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const badgeVal = item.hasBadge ? (activeAlertsCount > 0 ? `+${activeAlertsCount}` : null) : null;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, whiteSpace: 'normal', lineHeight: 1.25 }}>{item.label}</span>
                {badgeVal && (
                  <span className="nav-badge-pill nav-badge-orange">
                    {badgeVal}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Mobile Top Bar (only visible on mobile screens < 900px) */}
        <div className="mobile-top-bar">
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open Navigation"
          >
            <Menu size={22} />
          </button>
          <div className="mobile-brand">
            <Wind size={20} color="var(--color-primary)" />
            <span>AirSense IoT</span>
          </div>
        </div>

        {/* Page View Container */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
