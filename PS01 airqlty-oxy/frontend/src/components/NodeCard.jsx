import { Network, Wifi, WifiOff, Battery, Signal } from 'lucide-react';
import { timeAgo } from '../utils/thresholds';

const statusColor = { online: 'var(--color-safe)', offline: 'var(--color-offline)', warning: 'var(--color-moderate)' };

export default function NodeCard({ node, onClick }) {
  const isOnline = node.status === 'online';
  const batteryColor = node.batteryLevel > 50 ? 'var(--color-safe)' : node.batteryLevel > 20 ? 'var(--color-moderate)' : 'var(--color-danger)';

  return (
    <div className="node-card" style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div className="node-card-header">
        <div className="node-icon">
          <Network size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="node-id font-mono">{node.nodeId}</div>
          <div className="node-name truncate">{node.nodeName}</div>
          <div className="node-location text-muted text-sm truncate">{node.location}</div>
        </div>
        <div>
          {isOnline
            ? <Wifi size={16} color={statusColor.online} />
            : <WifiOff size={16} color={statusColor.offline} />
          }
        </div>
      </div>

      <div className="node-meta">
        <div className="node-meta-row">
          <span className="node-meta-label">Status</span>
          <span className={`badge badge-${node.status === 'online' ? 'online' : 'offline'}`}>
            <span className="status-dot" style={{ background: statusColor[node.status] || statusColor.offline }} />
            {node.status === 'online' ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="node-meta-row">
          <span className="node-meta-label">Type</span>
          <span className="node-meta-value" style={{ textTransform: 'capitalize' }}>{node.nodeType}</span>
        </div>
        <div className="node-meta-row">
          <span className="node-meta-label">Last Seen</span>
          <span className="node-meta-value">{timeAgo(node.lastSeen)}</span>
        </div>
        {node.signalStrength !== null && node.signalStrength !== undefined && (
          <div className="node-meta-row">
            <span className="node-meta-label flex items-center gap-1"><Signal size={11} /> Signal</span>
            <span className="node-meta-value">{node.signalStrength} dBm</span>
          </div>
        )}
        {node.batteryLevel !== null && node.batteryLevel !== undefined && (
          <div className="node-meta-row">
            <span className="node-meta-label flex items-center gap-1"><Battery size={11} /> Battery</span>
            <span className="node-meta-value" style={{ color: batteryColor }}>{node.batteryLevel}%</span>
          </div>
        )}
        <div className="node-meta-row">
          <span className="node-meta-label">Firmware</span>
          <span className="node-meta-value">{node.firmwareVersion || '—'}</span>
        </div>
        <div className="node-meta-row">
          <span className="node-meta-label">Readings</span>
          <span className="node-meta-value">{(node.totalReadings || 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
