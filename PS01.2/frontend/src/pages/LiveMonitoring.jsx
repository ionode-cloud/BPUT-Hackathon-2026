import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Wifi, WifiOff, Send, CheckCircle, Clock } from 'lucide-react';
import { nodesAPI } from '../services/api';
import socket from '../services/socket';
import { LoadingState, ErrorState } from '../components/UI';
import {
  SENSOR_SPEC_TABLE, getStatus, STATUS_COLORS, STATUS_LABELS, formatValue, timeAgo, getThresholdPercentage
} from '../utils/thresholds';

function LiveSensorCard({ spec, value }) {
  const status = getStatus(spec.key, value);
  const sc = STATUS_COLORS[status] || STATUS_COLORS.unknown;
  const label = STATUS_LABELS[status] || 'No Data';
  const displayVal = formatValue(value, spec.unit);
  const pct = getThresholdPercentage(spec.key, value);

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #F1E9C8',
        borderRadius: 16,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 4px 20px rgba(210, 190, 100, 0.08)',
      }}
    >
      {/* Header with Title & Status Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--color-heading)' }}>
            {spec.name}
          </div>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: sc.bg,
            border: `1px solid ${sc.border}`,
            borderRadius: 999,
            padding: '3px 10px',
            fontSize: 10.5,
            fontWeight: 700,
            color: sc.text,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} />
          {label}
        </span>
      </div>

      {/* Main Measurement */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0' }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: sc.text, lineHeight: 1 }}>
          {displayVal.split(' ')[0]}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-label)' }}>
          {spec.unit}
        </span>
      </div>

      {/* Threshold Meter Bar */}
      <div>
        <div
          style={{
            height: 6,
            background: '#F1E9C8',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: sc.dot,
              borderRadius: 999,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10.5, color: 'var(--color-text-label)' }}>
          <span>Safe: {spec.safe}</span>
          <span>Danger: {spec.danger}</span>
        </div>
      </div>
    </div>
  );
}

export default function LiveMonitoring() {
  const [latestData, setLatestData]       = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [lastRefresh, setLastRefresh]     = useState(null);
  const [autoRefresh, setAutoRefresh]     = useState(true);
  const [sendingSample, setSendingSample] = useState(false);
  const [sampleSuccess, setSampleSuccess] = useState(null);
  const [socketConnected, setSocketConnected] = useState(socket.connected);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await nodesAPI.getLatest();
      setLatestData(res.data.data);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatest();
    if (!autoRefresh) return;
    const interval = setInterval(fetchLatest, 10000);
    return () => clearInterval(interval);
  }, [fetchLatest, autoRefresh]);

  // Socket.IO real-time updates
  useEffect(() => {
    const handleNew = (r) => {
      setLatestData(r);
      setLastRefresh(new Date());
    };
    const handleUpdate = (r) => {
      setLatestData(r);
      setLastRefresh(new Date());
    };
    const handleDelete = () => {
      fetchLatest();
    };

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('new_reading', handleNew);
    socket.on('update_reading', handleUpdate);
    socket.on('delete_reading', handleDelete);

    return () => {
      socket.off('new_reading', handleNew);
      socket.off('update_reading', handleUpdate);
      socket.off('delete_reading', handleDelete);
    };
  }, [fetchLatest]);

  const handlePushSample = async () => {
    setSendingSample(true);
    setSampleSuccess(null);
    try {
      const samplePayload = {
        co: +(Math.random() * 3 + 0.8).toFixed(1),
        co2: Math.floor(Math.random() * 800 + 500),
        no2: +(Math.random() * 40 + 20).toFixed(1),
        so2: +(Math.random() * 25 + 10).toFixed(1),
        o3: +(Math.random() * 35 + 20).toFixed(1),
        pm25: +(Math.random() * 20 + 5).toFixed(1),
        pm10: +(Math.random() * 60 + 20).toFixed(1),
        temperature: +(Math.random() * 6 + 21).toFixed(1),
        humidity: +(Math.random() * 20 + 35).toFixed(1),
        voc: Math.floor(Math.random() * 100 + 30),
        nh3: +(Math.random() * 12 + 2).toFixed(1),
        smoke: Math.floor(Math.random() * 60 + 15),
      };
      const masterRes = await nodesAPI.getMaster().catch(() => null);
      const targetId = masterRes?.data?.data?.nodeId || 'NODE-01';
      await nodesAPI.sendData(targetId, samplePayload);
      setSampleSuccess(`Sample telemetry posted to /api/nodes/${targetId} successfully!`);
      fetchLatest();
      setTimeout(() => setSampleSuccess(null), 4000);
    } catch (err) {
      setError(`Failed to post sample: ${err.message}`);
    } finally {
      setSendingSample(false);
    }
  };

  if (loading) return <LoadingState text="Connecting to live sensor telemetry..." />;
  if (error && !latestData) return <ErrorState message={error} onRetry={fetchLatest} />;

  return (
    <div>
      {/* Top Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={handlePushSample}
            disabled={sendingSample}
          >
            <Send size={13} /> {sendingSample ? 'Sending...' : 'Simulate POST Packet'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            {autoRefresh ? (
              <>
                <Wifi size={12} style={{ display: 'inline', marginRight: 4, color: '#62C89B' }} />
                Polling every 10s
              </>
            ) : (
              'Polling paused'
            )}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setAutoRefresh((v) => !v)}
          >
            {autoRefresh ? <WifiOff size={12} /> : <Wifi size={12} />}
            {autoRefresh ? 'Pause' : 'Resume'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={fetchLatest}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {sampleSuccess && (
        <div
          style={{
            background: 'rgba(98, 200, 155, 0.14)',
            border: '1px solid #62C89B',
            color: '#1e7e53',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 20,
            fontSize: 12.5,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle size={15} />
          {sampleSuccess}
        </div>
      )}

      {/* Telemetry Status Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#FFFFFF',
          border: '1px solid #F1E9C8',
          borderRadius: 12,
          padding: '12px 20px',
          marginBottom: 24,
          fontSize: 12.5,
          color: 'var(--color-text-secondary)',
          boxShadow: '0 4px 20px rgba(210, 190, 100, 0.08)',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: latestData ? '#62C89B' : '#B5B5B5',
              boxShadow: latestData ? '0 0 0 3px rgba(98, 200, 155, 0.25)' : 'none',
            }}
          />
          <span style={{ fontWeight: 700, color: 'var(--color-heading)' }}>
            Live Telemetry Feed
          </span>
          <span>· All {SENSOR_SPEC_TABLE.length} Environmental Sensor Channels Active</span>
        </div>
        {latestData?.timestamp && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-text-label)' }}>
            <Clock size={12} />
            Last payload: {new Date(latestData.timestamp).toLocaleTimeString('en-IN')} (
            {timeAgo(latestData.timestamp)})
          </div>
        )}
      </div>

      {/* Sensor Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 18,
        }}
      >
        {SENSOR_SPEC_TABLE.map((spec) => (
          <LiveSensorCard
            key={spec.key}
            spec={spec}
            value={latestData ? latestData[spec.key] : null}
          />
        ))}
      </div>
    </div>
  );
}
