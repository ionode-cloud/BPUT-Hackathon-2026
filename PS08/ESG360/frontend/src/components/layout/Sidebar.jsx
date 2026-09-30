import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Database, Leaf, Users, Shield,
  FileText, CheckSquare, FolderOpen, ClipboardCheck, BarChart2,
  TrendingUp, ScrollText, ChevronLeft, ChevronRight, LogOut,
  Settings, Menu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  {
    section: 'Main',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard' },
      { path: '/organizations', label: 'Organizations', icon: Building2, permission: 'organizations' },
    ],
  },
  {
    section: 'ESG Data',
    items: [
      { path: '/data-collection', label: 'Data Collection', icon: Database, permission: 'esg' },
      { path: '/environmental', label: 'Environmental', icon: Leaf, permission: 'environmental' },
      { path: '/social', label: 'Social', icon: Users, permission: 'social' },
      { path: '/governance', label: 'Governance', icon: Shield, permission: 'governance' },
    ],
  },
  {
    section: 'Compliance',
    items: [
      { path: '/brsr', label: 'BRSR Reporting', icon: FileText, permission: 'brsr' },
      { path: '/validation', label: 'Validation', icon: CheckSquare, permission: 'validation' },
      { path: '/documents', label: 'Documents', icon: FolderOpen, permission: 'documents' },
      { path: '/approvals', label: 'Approvals', icon: ClipboardCheck, permission: 'approvals' },
    ],
  },
  {
    section: 'Insights',
    items: [
      { path: '/reports', label: 'Reports', icon: BarChart2, permission: 'reports' },
      { path: '/analytics', label: 'Analytics', icon: TrendingUp, permission: 'analytics' },
    ],
  },
  {
    section: 'System',
    items: [
      { path: '/audit-logs', label: 'Audit Logs', icon: ScrollText, permission: 'audit-logs' },
    ],
  },
];

const Sidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`}
        onClick={onMobileClose}
      />

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-logo">E</div>
          <div className="sidebar-brand-text">
            <h2>ESG360</h2>
            <span>Smart BRSR Reporting</span>
          </div>
          <button
            className="sidebar-toggle"
            onClick={onToggle}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((section) => {
            const visibleItems = section.items.filter(item => hasPermission(item.permission));
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.section}>
                <div className="nav-section-label">{section.section}</div>
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title={collapsed ? item.label : undefined}
                    onClick={onMobileClose}
                  >
                    <span className="nav-icon"><item.icon size={18} /></span>
                    <span className="nav-text">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user" title={user?.name}>
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <NavLink
            to="#"
            className="nav-item"
            onClick={handleLogout}
            style={{ marginTop: '0.25rem' }}
          >
            <span className="nav-icon"><LogOut size={18} /></span>
            <span className="nav-text">Logout</span>
          </NavLink>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
