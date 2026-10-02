const KPICard = ({ title, value, icon: Icon, variant = 'primary', suffix = '', subtitle, onClick }) => {
  const variantMap = {
    primary: { cardClass: '', iconClass: 'primary' },
    success: { cardClass: 'kpi-approved', iconClass: 'success' },
    warning: { cardClass: 'kpi-pending', iconClass: 'warning' },
    danger: { cardClass: 'kpi-danger', iconClass: 'danger' },
    info: { cardClass: 'kpi-info', iconClass: 'info' },
  };
  const { cardClass, iconClass } = variantMap[variant] || variantMap.primary;

  return (
    <div
      className={`kpi-card ${cardClass} fade-in`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      title={onClick ? `Click to view ${title}` : undefined}
    >
      <div className={`kpi-icon ${iconClass}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="kpi-value">
          {value}{suffix && <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{suffix}</span>}
        </div>
        <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {title}
          {onClick && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>→</span>}
        </div>
        {subtitle && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{subtitle}</div>}
      </div>
    </div>
  );
};

export default KPICard;
