import { useState, useEffect, useCallback, useRef } from 'react';

const CACHE_KEY_DATA = 'facility_ai_last_active_data';
const CACHE_KEY_HISTORY = 'facility_ai_telemetry_history_store_v1';
const CACHE_KEY_INTERVAL = 'facility_ai_poll_interval_ms';

function getCached(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setCached(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore quota errors
  }
}

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

// Prioritize local relative endpoint first (uses Vite proxy with 0 CORS & 0 network latency)
const API_ENDPOINTS = [
  '/api/data',
  ...(normApi && normApi !== '/api/data' ? [normApi] : []),
  ...(rawApiUrl && rawApiUrl !== '/api/data' ? [rawApiUrl.trim().replace(/\/+$/, '')] : []),
  'http://localhost:5011/api/data',
  'http://127.0.0.1:5011/api/data',
  ...(normBackend ? [normBackend] : []),
  '/api',
].filter((val, idx, arr) => arr.indexOf(val) === idx);

let activeWorkingEndpoint = null;

async function apiFetch(path = '', options = {}) {
  // Try known good working endpoint first to eliminate connection round-trips
  const candidates = activeWorkingEndpoint
    ? [activeWorkingEndpoint, ...API_ENDPOINTS.filter(e => e !== activeWorkingEndpoint)]
    : API_ENDPOINTS;

  let lastErr = null;
  for (const base of candidates) {
    try {
      const sep = path && !path.startsWith('?') && !path.startsWith('/') && !base.endsWith('/') ? '/' : '';
      const url = path ? `${base}${sep}${path}` : base;
      const res = await fetch(url, options);
      if (res.ok) {
        activeWorkingEndpoint = base;
        return res;
      }

      // Accept expected 404 "No sensor data found" from backend
      if (res.status === 404) {
        try {
          const clone = res.clone();
          const json = await clone.json();
          if (json && (json.message === 'No sensor data found.' || json.data === null)) {
            activeWorkingEndpoint = base;
            return res;
          }
        } catch {
          // not backend data api 404
        }
      }
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Failed to connect to API');
}

export function useSensorData() {
  const cachedData = getCached(CACHE_KEY_DATA, null);
  const cachedAllHistory = getCached(CACHE_KEY_HISTORY, []);

  // State initialized from local storage cache for instant 0ms first-paint on reload/refresh
  const [data, setData] = useState(() => cachedData);
  const [allHistory, setAllHistory] = useState(() => cachedAllHistory);
  const [history, setHistory] = useState(() => {
    return Array.isArray(cachedAllHistory) && cachedAllHistory.length > 0
      ? [...cachedAllHistory.slice(0, 20)].reverse()
      : [];
  });
  // If cache exists, loading is false immediately — no blank screen or spinner delay on refresh!
  const [loading, setLoading] = useState(() => !cachedData);
  const [error, setError] = useState(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => cachedData ? new Date() : null);

  // Configurable polling interval (defaults to 15s so refresh takes more time, avoiding frequent flickering)
  const defaultInterval = Number(import.meta.env?.VITE_POLL_INTERVAL) || 15000;
  const [pollInterval, setPollIntervalState] = useState(() => {
    try {
      const saved = localStorage.getItem(CACHE_KEY_INTERVAL);
      if (saved !== null) {
        const parsed = Number(saved);
        if (!isNaN(parsed)) return parsed;
      }
    } catch {}
    return defaultInterval;
  });

  const setPollInterval = useCallback((newInterval) => {
    const val = Number(newInterval);
    setPollIntervalState(val);
    try {
      localStorage.setItem(CACHE_KEY_INTERVAL, String(val));
    } catch {}
  }, []);

  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async (isManual = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      if (isManual) {
        setLoading(true);
      }

      // Execute latest snapshot fetch and historical fetch concurrently in parallel
      const [latestRes, histRes] = await Promise.all([
        apiFetch('').catch(err => ({ ok: false, status: 500, error: err })),
        apiFetch('?all=true').catch(err => ({ ok: false, status: 500, error: err }))
      ]);

      if (latestRes.status === 404) {
        setData(null);
        setHistory([]);
        setAllHistory([]);
        setIsEmpty(true);
        setError(null);
        setLoading(false);
        setCached(CACHE_KEY_DATA, null);
        setCached(CACHE_KEY_HISTORY, []);
        return;
      }

      if (!latestRes.ok && !latestRes.json) {
        throw latestRes.error || new Error(`HTTP ${latestRes.status || 'Error'}`);
      }

      const latestJson = await latestRes.json();
      let activeData = latestJson?.data || null;

      let allRecords = [];
      if (histRes.ok && histRes.json) {
        try {
          const histJson = await histRes.json();
          allRecords = Array.isArray(histJson?.data) ? histJson.data : [];
          setAllHistory(allRecords);
          setCached(CACHE_KEY_HISTORY, allRecords);

          const chartSlice = [...allRecords.slice(0, 20)].reverse();
          setHistory(chartSlice);
        } catch (histErr) {
          console.warn('Could not parse history:', histErr);
        }
      }

      // Merge non-null history into current snapshot if any field is null (excluding dynamic anomalyDetection)
      if (activeData && allRecords.length > 0) {
        const merged = { ...activeData };
        for (const rec of allRecords) {
          for (const [key, val] of Object.entries(rec)) {
            if (key === 'anomalyDetection') continue; // Do not backfill anomalyDetection from old history
            if ((merged[key] === null || merged[key] === undefined) && val !== null && val !== undefined) {
              merged[key] = val;
            }
          }
        }
        activeData = merged;
      }

      if (activeData) {
        setData(activeData);
        setCached(CACHE_KEY_DATA, activeData);
      }
      setIsEmpty(false);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (!data && !cachedData) {
        setError(err.message);
      } else {
        console.warn('Background sync error:', err.message);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [data, cachedData]);

  // Clear synthetic / demo seed records as requested
  const clearSeedData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch('?seedOnly=true', { method: 'DELETE' });
      const json = await res.json();
      await fetchData(true);
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
      await fetchData(true);
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
    await fetchData(true);
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
      setData(prev => {
        const next = { ...(prev || {}), ...json.data };
        setCached(CACHE_KEY_DATA, next);
        return next;
      });
      setAllHistory(prev => {
        const map = new Map();
        [json.data, ...(prev || [])].forEach(item => {
          if (item && item._id && !map.has(String(item._id))) {
            map.set(String(item._id), item);
          }
        });
        const nextAll = Array.from(map.values());
        setCached(CACHE_KEY_HISTORY, nextAll);
        return nextAll;
      });
    }
    fetchData(false);
    return json;
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    if (!pollInterval || pollInterval <= 0) return;
    const id = setInterval(() => {
      fetchData(false);
    }, pollInterval);
    return () => clearInterval(id);
  }, [fetchData, pollInterval]);

  return {
    data,
    history,
    allHistory,
    loading,
    error,
    isEmpty,
    lastUpdated,
    refetch: () => fetchData(true),
    pollInterval,
    setPollInterval,
    clearSeedData,
    clearAllData,
    sendData,
    updateData,
  };
}
