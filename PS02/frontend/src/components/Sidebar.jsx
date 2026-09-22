import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Cpu,
  Flame,
  LineChart,
  MapPin,
  Search,
  Radio,
  Bell,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Nodes', path: '/nodes', icon: Cpu },
  { name: 'Analytics', path: '/analytics', icon: LineChart },
  { name: 'Alert History', path: '/alerts', icon: Bell },
];

export default function Sidebar({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();

  const filteredNav = NAV_ITEMS.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Area */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Radio size={18} color="#1B496B" strokeWidth={2.5} />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-title">Edge AI Heat</span>
            <span className="sidebar-brand-subtitle">Arduino UNO Q</span>
          </div>
        </div>

        {/* Search */}
        <div className="sidebar-search">
          <div className="sidebar-search-box">
            <Search size={14} color="#B4CEE0" />
            <input
              type="text"
              placeholder="Search sections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={17} strokeWidth={1.8} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
