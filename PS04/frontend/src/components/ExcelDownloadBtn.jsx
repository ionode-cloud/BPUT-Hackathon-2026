import { useState } from 'react';
import { RiFileExcel2Fill } from 'react-icons/ri';
import { MdFileDownload, MdCheckCircle } from 'react-icons/md';
import { exportTabToExcel } from '../utils/exportToExcel';

export default function ExcelDownloadBtn({
  tabName = 'overview',
  tabLabel = '',
  data = {},
  history = [],
  alerts = [],
  extraData = {},
  className = '',
  variant = 'standard', // 'standard' | 'header' | 'pill'
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const displayLabel = tabLabel || tabName.charAt(0).toUpperCase() + tabName.slice(1);

  const handleExport = (e) => {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    setDownloaded(false);

    try {
      exportTabToExcel({
        tabName,
        data,
        history,
        alerts,
        extraData,
      });

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2400);
    } catch (err) {
      console.error('Failed to export to Excel:', err);
    } finally {
      setTimeout(() => setDownloading(false), 600);
    }
  };

  if (variant === 'header') {
    return (
      <button
        type="button"
        className={`btn-excel-header ${downloaded ? 'is-downloaded' : ''} ${className}`}
        onClick={handleExport}
        disabled={downloading}
        title={`Download current ${displayLabel} telemetry to Excel (.xlsx)`}
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
      title={`Download ${displayLabel} data sheet to Excel (.xlsx)`}
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
