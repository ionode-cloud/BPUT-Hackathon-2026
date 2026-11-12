import { useState } from 'react';
import { RiFileExcel2Fill } from 'react-icons/ri';
import { MdFileDownload, MdCheckCircle } from 'react-icons/md';
import { exportTabToExcel } from '../utils/exportToExcel';

export default function ExcelDownloadBtn({
  tabName = 'overview',
  tabLabel = '',
  data = {},
  history = [],
  allHistory = [],
  alerts = [],
  extraData = {},
  className = '',
  variant = 'standard', // 'standard' | 'header' | 'pill'
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const displayLabel = tabLabel || tabName.charAt(0).toUpperCase() + tabName.slice(1);

  const handleExport = async (e) => {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    setDownloaded(false);

    try {
      // 1. Initial historical records from props
      let exportHistory = Array.isArray(allHistory) && allHistory.length > 0
        ? [...allHistory]
        : (Array.isArray(history) && history.length > 0 ? [...history] : []);

      // 2. Fetch the entire database telemetry history (all 90+ records) directly
      const candidateEndpoints = [
        'http://localhost:5011/api/data?all=true',
        'http://127.0.0.1:5011/api/data?all=true',
        '/api/data?all=true',
        'http://localhost:5010/api/data?all=true',
      ];

      for (const ep of candidateEndpoints) {
        try {
          const res = await fetch(ep);
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json.data) && json.data.length > 0) {
              const map = new Map();
              [...json.data, ...exportHistory].forEach(item => {
                if (item && typeof item === 'object') {
                  const key = item._id
                    ? `id_${String(item._id)}`
                    : (item._historyId
                        ? `hist_${String(item._historyId)}`
                        : (item.timestamp || item.createdAt));
                  if (key && !map.has(key)) map.set(key, item);
                }
              });
              exportHistory = Array.from(map.values()).sort((a, b) => {
                const ta = new Date(a.timestamp || a.createdAt || 0).getTime();
                const tb = new Date(b.timestamp || b.createdAt || 0).getTime();
                return tb - ta;
              });
              break;
            }
          }
        } catch {
          // try next candidate
        }
      }

      // 3. Fallback / supplement from localStorage telemetry store
      try {
        const cached = localStorage.getItem('facility_ai_telemetry_history_store_v1');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const map = new Map();
            [...exportHistory, ...parsed].forEach(item => {
              if (item && typeof item === 'object') {
                const key = item._id
                  ? `id_${String(item._id)}`
                  : (item._historyId
                      ? `hist_${String(item._historyId)}`
                      : (item.timestamp || item.createdAt));
                if (key && !map.has(key)) map.set(key, item);
              }
            });
            exportHistory = Array.from(map.values()).sort((a, b) => {
              const ta = new Date(a.timestamp || a.createdAt || 0).getTime();
              const tb = new Date(b.timestamp || b.createdAt || 0).getTime();
              return tb - ta;
            });
          }
        }
      } catch {}

      // 4. Trigger Excel (.xlsx) file generation & direct download
      exportTabToExcel({
        tabName,
        tabLabel: displayLabel,
        data,
        history: exportHistory,
        allHistory: exportHistory,
        alerts,
        extraData,
      });

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2400);
    } catch (err) {
      console.error('Failed to export to Excel:', err);
      alert('Could not generate Excel report: ' + err.message);
    } finally {
      setTimeout(() => setDownloading(false), 600);
    }
  };

  if (variant === 'header' || variant === 'pill') {
    return (
      <button
        type="button"
        className={`btn-excel-header ${downloaded ? 'is-downloaded' : ''} ${className}`}
        onClick={handleExport}
        disabled={downloading}
        title={`Download ${displayLabel} entire telemetry to Excel (.xlsx)`}
      >
        <RiFileExcel2Fill size={16} className="excel-brand-icon" />
        <span className="btn-excel-text">
          {downloading ? 'Exporting…' : downloaded ? 'Excel Downloaded!' : 'Download in Excel'}
        </span>
        {downloaded ? <MdCheckCircle size={15} color="#10b981" /> : <MdFileDownload size={15} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`tab-excel-download-btn ${downloaded ? 'is-downloaded' : ''} ${className}`}
      onClick={handleExport}
      disabled={downloading}
      title={`Download ${displayLabel} entire telemetry dataset to Excel (.xlsx)`}
    >
      <div className="excel-btn-icon-box">
        <RiFileExcel2Fill size={16} />
      </div>
      <div className="excel-btn-content">
        <span className="excel-btn-title">
          {downloading ? 'Compiling Sheet…' : downloaded ? 'Workbook Ready!' : `Download in Excel`}
        </span>
        <span className="excel-btn-sub">
          {displayLabel} • .xlsx Format
        </span>
      </div>
      <div className="excel-btn-action-icon">
        {downloaded ? <MdCheckCircle size={18} color="#10b981" /> : <MdFileDownload size={18} />}
      </div>
    </button>
  );
}
