import React from 'react';
import { Menu } from 'lucide-react';

export default function Header({ onMenuClick }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Toggle navigation menu"
        >
          <Menu size={22} />
        </button>
        <div className="header-title-wrap">
          <h1 className="header-title">Heatwaves & Edge AI Dashboard</h1>
        </div>
      </div>
    </header>
  );
}
