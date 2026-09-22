import React from 'react';
import { X, Flame, Maximize2 } from 'lucide-react';

export default function ThermalMapModal({ isOpen, onClose, matrix, nodeId = 'MASTER-01', surfaceTemp = 44.5 }) {
  if (!isOpen) return null;

  // Generate fallback 32x24 if none provided
  const rows = matrix?.length || 24;
  const cols = matrix?.[0]?.length || 32;

  // Color mapper for thermal pixel
  const getPixelColor = (val) => {
    // Normal heat range 30°C to 55°C
    const min = 32.0;
    const max = 54.0;
    const normalized = Math.max(0, Math.min(1, (val - min) / (max - min)));

    if (normalized < 0.25) {
      return '#3D8888'; // Teal cool
    } else if (normalized < 0.5) {
      return '#C5ED8D'; // Lime moderate
    } else if (normalized < 0.75) {
      return '#E7C86A'; // Yellow high
    } else {
      return '#D96C6C'; // Red dangerous hotspot
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(23, 59, 90, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '4px',
          border: '1px solid #D9D9D9',
          maxWidth: '680px',
          width: '100%',
          padding: '20px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #ECECEC',
            paddingBottom: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#173B5A', fontWeight: 700 }}>
              <Flame size={18} color="#D96C6C" />
              <span>MLX90640 32×24 Thermal Surface Matrix</span>
            </div>
            <div style={{ fontSize: '12px', color: '#8A8A8A' }}>
              Node: <strong>{nodeId}</strong> • I2C Thermal Array • Roof & Wall Hotspot Radiance
            </div>
          </div>
          <button onClick={onClose} style={{ color: '#8A8A8A', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Matrix Grid */}
        <div
          style={{
            backgroundColor: '#173B5A',
            padding: '12px',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'center',
            overflowX: 'auto',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 12px)`,
              gridTemplateRows: `repeat(${rows}, 10px)`,
              gap: '1px',
              backgroundColor: '#0F273D',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {Array.from({ length: rows }).map((_, r) =>
              Array.from({ length: cols }).map((_, c) => {
                const val = matrix?.[r]?.[c] || (surfaceTemp - 4 + ((r * c) % 12) * 0.7);
                const color = getPixelColor(val);
                return (
                  <div
                    key={`${r}-${c}`}
                    title={`Pixel (${c},${r}): ${val.toFixed(1)}°C`}
                    style={{
                      backgroundColor: color,
                      width: '100%',
                      height: '100%',
                    }}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '14px',
            fontSize: '11px',
            color: '#8A8A8A',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Low (32°C)</span>
            <div
              style={{
                width: '120px',
                height: '8px',
                borderRadius: '2px',
                background: 'linear-gradient(to right, #3D8888, #C5ED8D, #E7C86A, #D96C6C)',
              }}
            />
            <span>Hotspot (55°C+)</span>
          </div>

          <div>
            Peak Surface: <strong style={{ color: '#D96C6C' }}>{surfaceTemp}°C</strong>
          </div>
        </div>

        <div style={{ marginTop: '14px', textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Close Thermal View
          </button>
        </div>
      </div>
    </div>
  );
}
