import { useMemo } from 'react';

function getBadgeStyle(type = 'green') {
  switch (type) {
    case 'green':
      return {
        bg: '#dcfce7',
        color: '#15803d',
        border: '1px solid transparent',
      };
    case 'amber':
    case 'warn':
      return {
        bg: '#fef3c7',
        color: '#b45309',
        border: '1px solid #fde68a',
      };
    case 'red':
    case 'bad':
    case 'critical':
      return {
        bg: '#fee2e2',
        color: '#dc2626',
        border: '1px solid #fecaca',
      };
    case 'blue':
      return {
        bg: '#e0f2fe',
        color: '#0284c7',
        border: '1px solid #bae6fd',
      };
    case 'gray':
    default:
      return {
        bg: '#ffffff',
        color: '#4b5563',
        border: '1px solid #e5e7eb',
      };
  }
}

export default function StatCard({
  label = 'Metric',
  badgeText = null,
  badgeType = 'green',
  nowLabel = 'Now',
  nowValue = '-',
  unit = '',
  secondaryLabel = null,
  secondaryValue = null,
  secondaryColor = '#15803d',
  points = [],
  footerLeft = null,
  footerRight = null,
  icon = null,
  index = 0,
  style = {},
}) {
  const badge = getBadgeStyle(badgeType);

  // Compute points and SVG curve coordinates
  const curveData = useMemo(() => {
    let pts = Array.isArray(points) ? points : [];

    // Fallback dynamic smooth wave if no points provided
    if (pts.length === 0) {
      const base = Number(String(nowValue).replace(/[^0-9.-]+/g, '')) || 50;
      pts = [
        { value: base, lower: base * 0.94, upper: base * 1.06 },
        { value: base * 1.02, lower: base * 0.90, upper: base * 1.12 },
        { value: base * 1.05, lower: base * 0.86, upper: base * 1.18 },
        { value: base * 1.03, lower: base * 0.82, upper: base * 1.22 },
        { value: base * 1.06, lower: base * 0.78, upper: base * 1.26 },
        { value: base * 1.08, lower: base * 0.75, upper: base * 1.30 },
      ];
    } else if (typeof pts[0] === 'number') {
      pts = pts.map((v, i) => ({
        value: v,
        lower: v * (1 - 0.05 * (i + 1)),
        upper: v * (1 + 0.05 * (i + 1)),
      }));
    }

    const svgWidth = 260;
    const svgHeight = 64;
    const padTop = 8;
    const padBottom = 8;
    const chartHeight = svgHeight - padTop - padBottom;

    const rawNow = Number(String(nowValue).replace(/[^0-9.-]+/g, '')) || 0;
    const allY = [rawNow];
    pts.forEach(p => {
      if (p.value != null && !isNaN(p.value)) allY.push(Number(p.value));
      if (p.lower != null && !isNaN(p.lower)) allY.push(Number(p.lower));
      if (p.upper != null && !isNaN(p.upper)) allY.push(Number(p.upper));
    });

    let minY = Math.min(...allY);
    let maxY = Math.max(...allY);
    if (maxY === minY) {
      maxY += 1;
      minY -= 1;
    }
    const rangeY = maxY - minY;

    const getY = val => {
      const norm = (val - minY) / rangeY;
      return padTop + chartHeight * (1 - norm);
    };

    const nowX = 14;
    const nowY = getY(rawNow);

    const startX = 40;
    const endX = svgWidth - 10;
    const stepX = pts.length > 1 ? (endX - startX) / (pts.length - 1) : 0;

    const upperCoords = [];
    const lowerCoords = [];
    const lineCoords = [];

    pts.forEach((p, idx) => {
      const x = startX + idx * stepX;
      const yVal = getY(p.value != null ? Number(p.value) : rawNow);
      const yUpper = getY(p.upper != null ? Number(p.upper) : (p.value ?? rawNow));
      const yLower = getY(p.lower != null ? Number(p.lower) : (p.value ?? rawNow));

      upperCoords.push(`${x.toFixed(1)},${yUpper.toFixed(1)}`);
      lowerCoords.unshift(`${x.toFixed(1)},${yLower.toFixed(1)}`);
      lineCoords.push(`${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yVal.toFixed(1)}`);
    });

    const polygonPoints = [...upperCoords, ...lowerCoords].join(' ');
    const linePath = lineCoords.join(' ');
    const firstPointY = pts.length > 0 ? getY(pts[0].value != null ? Number(pts[0].value) : rawNow) : nowY;

    return {
      svgWidth,
      svgHeight,
      nowX,
      nowY,
      startX,
      firstPointY,
      polygonPoints,
      linePath,
    };
  }, [points, nowValue]);

  return (
    <div
      className="card ai-forecast-card"
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        padding: '18px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease',
        animation: `cardEntrance 0.45s cubic-bezier(0.16, 1, 0.3, 1) both`,
        animationDelay: `${Math.min(index * 0.05, 0.4)}s`,
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* ── Header: Title & Pill Badge ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
          <span>{label}</span>
        </div>

        {badgeText && (
          <span
            style={{
              background: badge.bg,
              color: badge.color,
              border: badge.border,
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 9999,
              padding: '3px 10px',
              display: 'inline-block',
              letterSpacing: '0.01em',
              transition: 'transform 0.2s ease',
            }}
          >
            {badgeText}
          </span>
        )}
      </div>

      {/* ── Values: Now vs Secondary/Benchmark ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{nowLabel}</div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#111827',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {nowValue}
            {unit && (
              <span style={{ fontSize: 15, fontWeight: 500, color: '#64748b', marginLeft: 4 }}>
                {unit}
              </span>
            )}
          </div>
        </div>

        {secondaryValue != null && (
          <div style={{ textAlign: 'right' }}>
            {secondaryLabel && (
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{secondaryLabel}</div>
            )}
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: secondaryColor,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
              }}
            >
              {secondaryValue}
            </div>
          </div>
        )}
      </div>

      {/* ── Visual: Animated Mini Curve / Trend Area ── */}
      <div style={{ margin: '4px 0 10px' }}>
        <svg
          viewBox={`0 0 ${curveData.svgWidth} ${curveData.svgHeight}`}
          style={{ width: '100%', height: 64, display: 'block', overflow: 'visible' }}
        >
          {/* Shaded confidence / threshold envelope */}
          <polygon
            points={curveData.polygonPoints}
            fill="rgba(34, 197, 94, 0.16)"
            style={{
              transition: 'all 0.5s ease',
            }}
          />

          {/* Dotted connecting line from Now dot to the curve start */}
          <line
            x1={curveData.nowX}
            y1={curveData.nowY}
            x2={curveData.startX}
            y2={curveData.firstPointY}
            stroke="#111827"
            strokeWidth="1.4"
            strokeDasharray="2,3"
          />

          {/* Solid Black "Now" Dot with subtle pulse */}
          <circle
            cx={curveData.nowX}
            cy={curveData.nowY}
            r="3"
            fill="#111827"
          />

          {/* Smooth Trend Curve Line */}
          <path
            d={curveData.linePath}
            fill="none"
            stroke={secondaryColor || '#15803d'}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* ── Footer: Change & Context ── */}
      {(footerLeft || footerRight) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11.5,
            paddingTop: 8,
            borderTop: '1px solid #f3f4f6',
          }}
        >
          <span style={{ color: '#4b5563', fontWeight: 500 }}>
            {footerLeft || ''}
          </span>
          <span style={{ color: '#6b7280' }}>
            {footerRight || ''}
          </span>
        </div>
      )}
    </div>
  );
}

