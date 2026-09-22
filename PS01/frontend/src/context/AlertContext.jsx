import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import socket from '../services/socket';
import { nodesAPI } from '../services/api';
import { useNodes } from './NodeContext';
import {
  evaluateReadingAlerts,
  ALERT_POPUP_DURATION,
} from '../utils/alertConfig';

const AlertContext = createContext(null);

const STORAGE_ACTIVE_KEY = 'airsense_active_alerts';
const STORAGE_HISTORY_KEY = 'airsense_alert_history';

export function AlertProvider({ children }) {
  const { nodes } = useNodes() || { nodes: [] };
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // Active alerts map: { [alertKey]: alertObj }
  // Stored strictly in memory and synchronized with real API nodes data (no stale dummy localStorage cache)
  const [activeAlertsMap, setActiveAlertsMap] = useState({});
  const activeAlertsRef = useRef(activeAlertsMap);
  activeAlertsRef.current = activeAlertsMap;

  // Resolved alert history: Array<alertObj> (persisted in localStorage for auditing)
  const [alertHistory, setAlertHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Popup Queue: alerts waiting to be displayed sequentially
  const [popupQueue, setPopupQueue] = useState([]);
  // Currently displayed popup
  const [currentPopup, setCurrentPopup] = useState(null);

  // Socket.IO connection status
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);

  // Clear any legacy dummy/stale active alerts from localStorage once on mount
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_ACTIVE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // Save history to localStorage (keep last 100 entries)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(alertHistory.slice(0, 100)));
    } catch {
      // Ignore quota error
    }
  }, [alertHistory]);

  // ── POPUP QUEUE CONTROLLER (ONE BY ONE PLAYER) ────────────────
  // 1. Advance queue: when currentPopup is null and items exist in queue, pop next alert
  useEffect(() => {
    if (currentPopup === null && popupQueue.length > 0) {
      const nextAlert = popupQueue[0];
      const remainingQueue = popupQueue.slice(1);
      setCurrentPopup(nextAlert);
      setPopupQueue(remainingQueue);
    }
  }, [currentPopup, popupQueue]);

  // 2. Auto-close timer: run for ALERT_POPUP_DURATION (4s), then set currentPopup to null
  useEffect(() => {
    if (!currentPopup) return;

    const timer = setTimeout(() => {
      setCurrentPopup(null);
    }, ALERT_POPUP_DURATION);

    return () => {
      clearTimeout(timer);
    };
  }, [currentPopup]);

  // 3. User manually clicks "X" on popup
  const dismissCurrentPopup = useCallback(() => {
    setCurrentPopup(null);
  }, []);

  // ── SOCKET.IO CONNECTION HANDLING ──────────────────────────────
  useEffect(() => {
    const handleConnect = () => setIsSocketConnected(true);
    const handleDisconnect = () => setIsSocketConnected(false);

    if (socket.connected) setIsSocketConnected(true);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  // ── SYNCHRONIZE ACTIVE ALERTS WITH REAL API NODES ──────────────
  // Evaluates real nodes from GET /api/nodes and updates activeAlertsMap
  // Does NOT fire popupQueue (popups are reserved for live Socket.IO events)
  const syncWithApiNodes = useCallback((nodesList) => {
    if (!Array.isArray(nodesList) || nodesList.length === 0) {
      setActiveAlertsMap({});
      return;
    }

    const nextActiveMap = {};
    const validNodeIds = new Set(nodesList.map((n) => String(n.nodeId).toUpperCase().trim()));

    nodesList.forEach((n) => {
      if (n.latestReading) {
        const cleanId = String(n.nodeId).toUpperCase().trim();
        const displayName = n.name || cleanId;
        const { updatedActiveAlerts } = evaluateReadingAlerts(
          n.latestReading,
          displayName,
          {}
        );

        Object.assign(nextActiveMap, updatedActiveAlerts);
      }
    });

    setActiveAlertsMap(nextActiveMap);
  }, []);

  // Sync whenever nodes from NodeContext update
  useEffect(() => {
    if (nodes && nodes.length > 0) {
      syncWithApiNodes(nodes);
    }
  }, [nodes, syncWithApiNodes]);

  // Initial scan from backend API on mount
  useEffect(() => {
    let isMounted = true;
    const fetchAndSync = async () => {
      try {
        const res = await nodesAPI.getAll();
        if (!isMounted) return;
        const apiNodes = res.data?.data || [];
        if (apiNodes.length > 0) {
          syncWithApiNodes(apiNodes);
        }
      } catch (err) {
        console.warn('Could not sync active alerts with API nodes:', err);
      }
    };

    fetchAndSync();
    return () => {
      isMounted = false;
    };
  }, [syncWithApiNodes]);

  // ── REAL-TIME LIVE ALERT ENGINE ────────────────────────────────
  // Triggered exclusively when live socket events arrive
  const handleLiveReading = useCallback((reading) => {
    if (!reading || !reading.nodeId) return;

    const cleanId = String(reading.nodeId).toUpperCase().trim();

    // Resolve node display name from registered nodes list
    const matchedNode = (nodesRef.current || []).find(
      (n) => String(n.nodeId).toUpperCase().trim() === cleanId
    );
    const nodeDisplayName = matchedNode?.name || reading.nodeName || cleanId;

    // Evaluate sensor readings against centralized thresholds
    const { popupsToTrigger, updatedActiveAlerts, resolvedAlerts } = evaluateReadingAlerts(
      reading,
      nodeDisplayName,
      activeAlertsRef.current
    );

    // 1. Update active alerts map
    setActiveAlertsMap(updatedActiveAlerts);

    // 2. Queue newly triggered popups to show ONE BY ONE
    if (popupsToTrigger.length > 0) {
      setPopupQueue((prevQueue) => {
        const currentQueuedIds = new Set(prevQueue.map((a) => a.id));
        const filteredNew = popupsToTrigger.filter((a) => !currentQueuedIds.has(a.id));
        return [...prevQueue, ...filteredNew];
      });
    }

    // 3. Move any resolved alerts to history
    if (resolvedAlerts.length > 0) {
      setAlertHistory((prevHistory) => [...resolvedAlerts, ...prevHistory]);
    }
  }, []);

  // Listen to live events across ALL nodes
  useEffect(() => {
    const onNodeUpdated = (node) => {
      if (node?.latestReading) {
        handleLiveReading(node.latestReading);
      }
    };

    const onNodeDeleted = (deletedInfo) => {
      const deletedId = (deletedInfo?.nodeId || deletedInfo?._id || '').toString().toUpperCase().trim();
      if (!deletedId) return;

      setActiveAlertsMap((prev) => {
        const copy = { ...prev };
        Object.keys(copy).forEach((k) => {
          if (k.startsWith(`${deletedId}-`)) {
            delete copy[k];
          }
        });
        return copy;
      });
    };

    socket.on('new_reading', handleLiveReading);
    socket.on('update_reading', handleLiveReading);
    socket.on('node_updated', onNodeUpdated);
    socket.on('node_deleted', onNodeDeleted);

    return () => {
      socket.off('new_reading', handleLiveReading);
      socket.off('update_reading', handleLiveReading);
      socket.off('node_updated', onNodeUpdated);
      socket.off('node_deleted', onNodeDeleted);
    };
  }, [handleLiveReading]);

  // Manually acknowledge / dismiss an active alert
  const acknowledgeAlert = useCallback((alertId) => {
    setActiveAlertsMap((prev) => {
      const copy = { ...prev };
      const alert = copy[alertId];
      if (alert) {
        const now = new Date().toISOString();
        const durationMs = Math.max(0, new Date(now).getTime() - new Date(alert.startedAt).getTime());
        setAlertHistory((hist) => [
          {
            ...alert,
            status: 'acknowledged',
            resolvedAt: now,
            durationMs,
            duration: `${Math.round(durationMs / 1000)}s (Ack)`,
          },
          ...hist,
        ]);
        delete copy[alertId];
      }
      return copy;
    });

    // If currently displaying this alert as popup, close it
    if (currentPopup?.id === alertId) {
      dismissCurrentPopup();
    }
  }, [currentPopup, dismissCurrentPopup]);

  // Clear all alert history
  const clearHistory = useCallback(() => {
    setAlertHistory([]);
    localStorage.removeItem(STORAGE_HISTORY_KEY);
  }, []);

  const activeAlertsList = Object.values(activeAlertsMap);

  return (
    <AlertContext.Provider
      value={{
        activeAlerts: activeAlertsList,
        activeAlertsCount: activeAlertsList.length,
        alertHistory,
        currentPopup,
        popupQueue,
        isSocketConnected,
        dismissCurrentPopup,
        acknowledgeAlert,
        clearHistory,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
}

export default AlertContext;
