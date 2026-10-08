import { useState, useEffect } from 'react';
import {
  LuBell as Bell,
  LuCheckCheck as CheckCheck,
  LuEye as Eye
} from 'react-icons/lu';
import Breadcrumbs from '../components/common/Breadcrumbs';
import { LoadingState, EmptyState } from '../components/common/States';
import Pagination from '../components/common/Pagination';
import api from '../services/api';

const TYPE_ICONS = {
  ESG_SUBMITTED: { icon: '📋', bg: '#E8F0FE', color: '#3B5BDB' },
  ESG_APPROVED: { icon: '✅', bg: 'var(--success-bg)', color: 'var(--success)' },
  ESG_REJECTED: { icon: '❌', bg: 'var(--danger-bg)', color: 'var(--danger)' },
  CORRECTION_REQUIRED: { icon: '⚠', bg: 'var(--warning-bg)', color: 'var(--warning)' },
  REVIEW_ASSIGNED: { icon: '👁', bg: 'var(--accent-light)', color: 'var(--accent)' },
  REPORT_GENERATED: { icon: '📄', bg: 'var(--secondary)', color: 'var(--primary)' },
  REMINDER: { icon: '🔔', bg: 'var(--warning-bg)', color: 'var(--warning)' },
  SYSTEM: { icon: '🔧', bg: 'var(--bg)', color: 'var(--text-muted)' },
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [isRead, setIsRead] = useState('');

  const fetchNotifications = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (isRead !== '') params.isRead = isRead;
      const res = await api.get('/notifications', { params });
      setNotifications(res.data.data);
      setUnreadCount(res.data.unreadCount);
      setPagination(res.data.pagination);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifications(1); }, [isRead]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(n => n.map(item => item._id === id ? { ...item, isRead: true } : item));
      setUnreadCount(u => Math.max(0, u - 1));
    } catch { }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(n => n.map(item => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch { }
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'Notifications', path: '/notifications' }]} />
      <div className="page-header">
        <div className="d-flex justify-between align-center">
          <div>
            <h1 className="page-title">Notifications</h1>
            <p className="page-subtitle">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select className="filter-select" value={isRead} onChange={e => setIsRead(e.target.value)}>
              <option value="">All</option>
              <option value="false">Unread</option>
              <option value="true">Read</option>
            </select>
            {unreadCount > 0 && (
              <button className="btn-secondary-esg" onClick={markAllRead}>
                <CheckCheck size={14} /> Mark All Read
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? <LoadingState /> : notifications.length === 0 ? (
        <div className="esg-card">
          <EmptyState
            icon={<Bell size={48} />}
            title="No notifications"
            message={isRead === 'false' ? 'You have no unread notifications.' : 'No notifications found.'}
          />
        </div>
      ) : (
        <div className="esg-card" style={{ padding: 0, overflow: 'hidden' }}>
          {notifications.map(n => {
            const typeInfo = TYPE_ICONS[n.type] || TYPE_ICONS.SYSTEM;
            return (
              <div
                key={n._id}
                className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                onClick={() => !n.isRead && markAsRead(n._id)}
              >
                <div className="notif-icon" style={{ background: typeInfo.bg }}>
                  <span style={{ fontSize: '1rem' }}>{typeInfo.icon}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-message">{n.message}</div>
                  <div className="notif-time">
                    {n.triggeredBy?.name && <span>{n.triggeredBy.name} • </span>}
                    {timeAgo(n.createdAt)}
                  </div>
                </div>
                {!n.isRead && <div className="notif-unread-dot" />}
              </div>
            );
          })}
        </div>
      )}
      <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPageChange={p => fetchNotifications(p)} />
    </div>
  );
};

export default Notifications;
