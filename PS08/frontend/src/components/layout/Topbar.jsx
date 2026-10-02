import { useState, useEffect, useRef } from 'react';
import { Bell, Menu, ChevronDown, LogOut, CheckCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const TYPE_ICONS = {
  ESG_SUBMITTED: { icon: '📋', bg: '#E8F0FE', color: '#3B5BDB' },
  ESG_APPROVED: { icon: '✅', bg: 'var(--success-bg, #E8F5E9)', color: 'var(--success, #2B8A3E)' },
  ESG_REJECTED: { icon: '❌', bg: 'var(--danger-bg, #FFEBEE)', color: 'var(--danger, #C92A2A)' },
  CORRECTION_REQUIRED: { icon: '⚠️', bg: 'var(--warning-bg, #FFF3BF)', color: 'var(--warning, #E67700)' },
  REVIEW_ASSIGNED: { icon: '👁️', bg: 'var(--accent-light, #E3FAFC)', color: 'var(--accent, #0C8599)' },
  REPORT_GENERATED: { icon: '📄', bg: 'var(--secondary, #E6F4EA)', color: 'var(--primary, #1B5E3B)' },
  REMINDER: { icon: '🔔', bg: 'var(--warning-bg, #FFF3BF)', color: 'var(--warning, #E67700)' },
  SYSTEM: { icon: '🔧', bg: 'var(--bg, #F8F9FA)', color: 'var(--text-muted, #868E96)' },
};

const Topbar = ({ onMobileMenuToggle, pageTitle, pageSubtitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications', { params: { isRead: false, limit: 1 } });
      setUnread(res.data.unreadCount || 0);
    } catch {}
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [user]);

  // Handle outside clicks to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const res = await api.get('/notifications', { params: { limit: 15 } });
      setNotifications(res.data.data || []);
      setUnread(res.data.unreadCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  // Toggle notification popover on bell click (click once to open, click again to close)
  const toggleNotif = () => {
    setNotifOpen(prev => {
      const next = !prev;
      if (next) {
        fetchNotifications();
      }
      return next;
    });
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemClick = (n) => {
    if (!n.isRead) {
      handleMarkAsRead(n._id);
    }
    if (n.relatedRecord?.model === 'Document') {
      navigate('/documents');
      setNotifOpen(false);
    } else if (n.relatedRecord?.model === 'BRSRReport') {
      navigate('/brsr');
      setNotifOpen(false);
    } else if (n.relatedRecord?.model === 'ESGData') {
      navigate('/approvals');
      setNotifOpen(false);
    } else if (n.relatedRecord?.model === 'Organization') {
      navigate('/organizations');
      setNotifOpen(false);
    }
  };

  const timeAgo = (date) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Mobile menu toggle */}
        <button
          className="topbar-action-btn"
          onClick={onMobileMenuToggle}
          style={{ display: 'none' }}
          id="mobile-menu-btn"
        >
          <Menu size={18} />
        </button>

        <div>
          {pageTitle && <div className="topbar-title">{pageTitle}</div>}
          {pageSubtitle && <div className="topbar-subtitle">{pageSubtitle}</div>}
        </div>

        {user?.organization && (
          <span className="topbar-badge">
            {user.organization?.name || 'All Organizations'}
          </span>
        )}
      </div>

      <div className="topbar-right">
        {/* Notifications Popover Toggle */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            className={`topbar-action-btn ${notifOpen ? 'active' : ''}`}
            onClick={toggleNotif}
            title="Notifications"
            aria-label="Notifications"
            style={{
              borderColor: notifOpen ? 'var(--primary)' : undefined,
              background: notifOpen ? 'var(--secondary)' : undefined,
              color: notifOpen ? 'var(--primary)' : undefined,
            }}
          >
            <Bell size={18} />
            {Number(unread) > 0 && (
              <span className="badge-count">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="notif-flyout">
              <div className="notif-flyout-header">
                <div className="notif-flyout-title">
                  <span>Notifications</span>
                  {Number(unread) > 0 ? (
                    <span className="notif-badge-pill">
                      {unread} new
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      All read
                    </span>
                  )}
                </div>
                <div className="notif-flyout-actions">
                  {Number(unread) > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'none',
                        border: 'none',
                        fontSize: '0.72rem',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        padding: '3px 6px',
                        borderRadius: '4px',
                      }}
                      title="Mark all as read"
                    >
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setNotifOpen(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Close notifications"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="notif-flyout-list">
                {loadingNotifs ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                    <Bell size={32} style={{ color: 'var(--text-muted)', opacity: 0.35, margin: '0 auto 0.5rem', display: 'block' }} />
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>No notifications</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>You're all caught up!</div>
                  </div>
                ) : (
                  notifications.map(n => {
                    const typeInfo = TYPE_ICONS[n.type] || TYPE_ICONS.SYSTEM;
                    return (
                      <div
                        key={n._id}
                        className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                        onClick={() => handleItemClick(n)}
                        style={{
                          display: 'flex',
                          gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid var(--border-light)',
                          cursor: 'pointer',
                          background: !n.isRead ? 'var(--secondary)' : 'transparent',
                          transition: 'background 0.15s ease',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: typeInfo.bg,
                            color: typeInfo.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem',
                            flexShrink: 0,
                          }}
                        >
                          {typeInfo.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.8rem',
                            fontWeight: !n.isRead ? 700 : 500,
                            color: 'var(--text-primary)',
                            lineHeight: 1.3,
                            marginBottom: '2px',
                          }}>
                            {n.title}
                          </div>
                          <div style={{
                            fontSize: '0.73rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.4,
                            wordBreak: 'break-word',
                          }}>
                            {n.message}
                          </div>
                          <div style={{
                            fontSize: '0.68rem',
                            color: 'var(--text-muted)',
                            marginTop: '4px',
                          }}>
                            {n.triggeredBy?.name && <span>{n.triggeredBy.name} • </span>}
                            {timeAgo(n.createdAt)}
                          </div>
                        </div>
                        {!n.isRead && (
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: 'var(--danger)',
                              flexShrink: 0,
                              marginTop: '5px',
                            }}
                            title="Unread"
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="notif-flyout-footer">
                <button
                  onClick={() => {
                    setNotifOpen(false);
                    navigate('/notifications');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '2px 8px',
                  }}
                >
                  Open Full Notifications Center &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div style={{ position: 'relative' }} ref={userMenuRef}>
          <button
            className="topbar-action-btn"
            style={{
              width: 'auto',
              padding: '0 0.75rem',
              gap: '0.5rem',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={() => setDropdownOpen(v => !v)}
          >
            <div
              style={{
                width: 28, height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {initials}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>
              {user?.name?.split(' ')[0]}
            </span>
            <ChevronDown size={14} />
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute', right: 0, top: '110%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                minWidth: 180,
                zIndex: 200,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user?.role}</div>
              </div>
              <button
                onClick={handleLogout}
                style={{ width: '100%', textAlign: 'left', padding: '0.625rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
};

export default Topbar;
