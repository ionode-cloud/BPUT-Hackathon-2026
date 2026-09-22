import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

const BASE_SCALES = {
  y: {
    beginAtZero: true,
    grid: { color: 'rgba(226, 232, 240, 0.7)' },
    ticks: { color: '#64748b', font: { family: "'Inter', sans-serif", size: 11 } },
  },
  x: {
    grid: { display: false },
    ticks: { color: '#64748b', font: { family: "'Inter', sans-serif", size: 11 } },
  },
};

const DOUGHNUT_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 750,
    easing: 'easeOutQuart',
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#475569',
        usePointStyle: true,
        padding: 16,
        font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
      },
    },
    tooltip: {
      backgroundColor: '#0f172a',
      titleFont: { family: "'Inter', sans-serif", size: 12, weight: '600' },
      bodyFont: { family: "'Inter', sans-serif", size: 12 },
      padding: 10,
      cornerRadius: 8,
    },
  },
  cutout: '72%',
};

export default function ChartBox({ id, type = 'line', labels = [], datasets = [] }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const hasData =
    labels &&
    labels.length > 0 &&
    datasets &&
    datasets.length > 0 &&
    datasets.some(d => Array.isArray(d.data) && d.data.length > 0 && d.data.some(v => v !== null && v !== undefined));

  useEffect(() => {
    if (!hasData) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      return;
    }

    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');

    const hasDualY = datasets.some(d => d.yAxisID === 'y1');
    const scales = type === 'doughnut' ? undefined : {
      ...BASE_SCALES,
      ...(hasDualY
        ? {
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: { color: '#10b981', font: { family: "'Inter', sans-serif", size: 11 } },
            },
          }
        : {}),
    };

    const options = type === 'doughnut' ? DOUGHNUT_OPTIONS : {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 800,
        easing: 'easeOutQuart',
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#475569',
            usePointStyle: true,
            padding: 14,
            font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
          },
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { family: "'Inter', sans-serif", size: 12, weight: '600' },
          bodyFont: { family: "'Inter', sans-serif", size: 12 },
          padding: 10,
          cornerRadius: 8,
        },
      },
      scales,
    };

    if (chartRef.current && chartRef.current.config.type === type) {
      chartRef.current.data.labels = labels;
      chartRef.current.data.datasets = datasets;
      chartRef.current.update();
      return;
    }

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(ctx, {
      type,
      data: { labels, datasets },
      options,
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [type, labels, datasets, hasData]);

  if (!hasData) {
    return (
      <div className="chartbox chartbox--empty">
        <span className="chartbox-empty-dash">-</span>
      </div>
    );
  }

  return (
    <div className="chartbox">
      <canvas ref={canvasRef} id={id} />
    </div>
  );
}
