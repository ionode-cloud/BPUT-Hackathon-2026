import { useState, useEffect, useCallback } from 'react';

function normalizeEndpoint(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.trim().replace(/\/+$/, '');
  if (!clean) return null;
  if (clean.endsWith('/data')) return clean;
  if (clean.endsWith('/api')) return `${clean}/data`;
  return `${clean}/api/data`;
}

const rawApiUrl = import.meta.env?.VITE_API_URL;
const rawBackendUrl = import.meta.env?.VITE_BACKEND_URL;
const normApi = normalizeEndpoint(rawApiUrl);
const normBackend = normalizeEndpoint(rawBackendUrl);

const API_ENDPOINTS = [
  ...(normApi ? [normApi] : []),
  ...(rawApiUrl ? [rawApiUrl.trim().replace(/\/+$/, '')] : []),
  ...(normBackend ? [normBackend] : []),
  'http://localhost:5011/api/data',
  'http://127.0.0.1:5011/api/data',
  'http://localhost:5010/api/data',
  'http://127.0.0.1:5010/api/data',
  '/api/data',
  'http://localhost:5000/api/data',
  'http://127.0.0.1:5000/api/data',
  '/api',
  'http://localhost:5011/api',
  'http://127.0.0.1:5011/api',
  'http://localhost:5010/api',
  'http://127.0.0.1:5010/api',
  'http://localhost:5000/api',
  'http://127.0.0.1:5000/api',
].filter((val, idx, arr) => arr.indexOf(val) === idx);

const POLL_INTERVAL = Number(import.meta.env?.VITE_POLL_INTERVAL) || 5000; // Configurable polling interval

async function apiFetch(path = '', options = {}) {
  let lastErr = null;
  for (const base of API_ENDPOINTS) {
    try {
      const sep = path && !path.startsWith('?') && !path.startsWith('/') && !base.endsWith('/') ? '/' : '';
      const url = path ? `${base}${sep}${path}` : base;
      const res = await fetch(url, options);
      if (res.ok) return res;

      // Only accept 404 if it's the expected "No sensor data found" JSON payload from data collection
      if (res.status === 404) {
        try {
          const clone = res.clone();
          const json = await clone.json();
          if (json && (json.message === 'No sensor data found.' || json.data === null)) {
            return res;
          }
        } catch {
          // not our data api 404, fallback to next endpoint in list
        }
      }
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Failed to connect to API');
}

export function useSensorData() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch latest snapshot
      const latestRes = await apiFetch();

      if (latestRes.status === 404) {
        setData(null);
        setHistory([]);
        setIsEmpty(true);
        setError(null);
        setLoading(false);
        return;
      }

      if (!latestRes.ok) {
        throw new Error(`HTTP ${latestRes.status}`);
      }

      const latestJson = await latestRes.json();
      let activeData = latestJson.data || null;

      // 2. Fetch recent history for dynamic time-series charts (newest first, limit to 20)
      let records = [];
      try {
        const histRes = await apiFetch('?all=true&limit=20');
        if (histRes.ok) {
          const histJson = await histRes.json();
          // Reverse so chronological (oldest to newest)
          records = Array.isArray(histJson.data) ? [...histJson.data].reverse() : [];
          setHistory(records);
        }
      } catch (histErr) {
        console.warn('Could not load history for charts:', histErr);
      }

      // Merge non-null history into current snapshot if any field is null
      if (activeData && records.length > 0) {
        const merged = { ...activeData };
        for (const rec of records) {
          for (const [key, val] of Object.entries(rec)) {
            if ((merged[key] === null || merged[key] === undefined) && val !== null && val !== undefined) {
              merged[key] = val;
            }
          }
        }
        activeData = merged;
      }

      setData(activeData);
      setIsEmpty(false);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear synthetic / demo seed records as requested
  const clearSeedData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch('?seedOnly=true', { method: 'DELETE' });
      const json = await res.json();
      await fetchData();
      return json;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  // Wipe all records if user wants a 100% blank slate
  const clearAllData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch('', { method: 'DELETE' });
      const json = await res.json();
      await fetchData();
      return json;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  // Quick API sender helper to post real data to /api/data
  const sendData = useCallback(async (payload) => {
    const res = await apiFetch('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    await fetchData();
    return json;
  }, [fetchData]);

  // Live IoT telemetry updater (uses PUT or fallback to POST)
  const updateData = useCallback(async (payload) => {
    let res;
    try {
      res = await apiFetch('', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      res = await apiFetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json?.data) {
      setData(prev => ({
        ...(prev || {}),
        ...json.data,
      }));
    }
    fetchData();
    return json;
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  return {
    data,
    history,
    loading,
    error,
    isEmpty,
    lastUpdated,
    refetch: fetchData,
    clearSeedData,
    clearAllData,
    sendData,
    updateData,
  };
}
