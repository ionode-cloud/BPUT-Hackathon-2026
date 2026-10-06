import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from 'lucide-react';

const ExportDropdown = ({
  onExportExcel,
  onExportPDF,
  loading = false,
  totalRecords = 0,
  label = 'Download Report',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExcel = (scope) => {
    setIsOpen(false);
    if (onExportExcel) onExportExcel(scope);
  };

  const handlePDF = (scope) => {
    setIsOpen(false);
    if (onExportPDF) onExportPDF(scope);
  };

  return (
    <div className={`export-dropdown-container ${className}`} ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="btn-secondary-esg"
        onClick={() => !disabled && !loading && setIsOpen(prev => !prev)}
        disabled={disabled || loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          fontWeight: 600,
          background: '#FFFFFF',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
        }}
        title="Download Report in Excel or PDF format"
      >
        {loading ? (
          <Loader2 size={15} className="spin-animate" />
        ) : (
          <Download size={15} style={{ color: 'var(--primary)' }} />
        )}
        <span>{loading ? 'Preparing...' : label}</span>
        <ChevronDown size={14} style={{ opacity: 0.6, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {isOpen && (
        <div
          className="export-dropdown-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 1050,
            minWidth: '240px',
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: '0.5rem',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div style={{ padding: '0.35rem 0.6rem 0.5rem', borderBottom: '1px solid var(--border-light)', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Export Options {totalRecords > 0 && `(${totalRecords} records)`}
          </div>

          <div style={{ padding: '0.25rem 0' }}>
            <button
              type="button"
              className="export-dropdown-item"
              onClick={() => handleExcel('all')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.55rem 0.75rem',
                border: 'none',
                background: 'transparent',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: '#E6F4EA', color: '#137333',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <FileSpreadsheet size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, lineHeight: 1.2 }}>Download Excel (.xlsx)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  All filtered records & summary
                </div>
              </div>
            </button>

            <button
              type="button"
              className="export-dropdown-item"
              onClick={() => handlePDF('all')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.55rem 0.75rem',
                border: 'none',
                background: 'transparent',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: '#FEE2E2', color: '#DC2626',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <FileText size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, lineHeight: 1.2 }}>Download PDF (.pdf)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Formal corporate executive report
                </div>
              </div>
            </button>
          </div>

          {totalRecords > 15 && (
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.35rem', marginTop: '0.2rem' }}>
              <div style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Current Page Only:
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => handleExcel('current')}
                  style={{
                    flex: 1,
                    padding: '0.3rem 0.4rem',
                    fontSize: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    background: '#FAFAFA',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                  }}
                  title="Export only currently visible page"
                >
                  <FileSpreadsheet size={12} style={{ color: '#137333' }} /> Page Excel
                </button>
                <button
                  type="button"
                  onClick={() => handlePDF('current')}
                  style={{
                    flex: 1,
                    padding: '0.3rem 0.4rem',
                    fontSize: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    background: '#FAFAFA',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                  }}
                  title="Export only currently visible page"
                >
                  <FileText size={12} style={{ color: '#DC2626' }} /> Page PDF
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExportDropdown;
