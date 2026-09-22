import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { nodesAPI } from '../services/api';
import socket from '../services/socket';

const NodeContext = createContext(null);

export function NodeProvider({ children }) {
  const [nodes, setNodes] = useState([]);
  const [masterNode, setMasterNode] = useState(null);
  const [selectedNodeId, setSelectedNodeIdState] = useState(() => {
    return localStorage.getItem('airsense_selected_node') || '';
  });
  const [loadingNodes, setLoadingNodes] = useState(true);

  // Fetch nodes and active master node
  const fetchNodes = useCallback(async () => {
    try {
      const [nodesRes, masterRes] = await Promise.allSettled([
        nodesAPI.getAll(),
        nodesAPI.getMaster(),
      ]);

      const list = nodesRes.status === 'fulfilled' ? (nodesRes.value.data.data || []) : [];
      const master = masterRes.status === 'fulfilled' ? masterRes.value.data.data : null;

      setNodes(list);
      setMasterNode(master);

      // Auto-selection logic:
      // 1. If stored selection exists in current nodes list, keep it.
      // 2. Otherwise auto-select the Master Node.
      // 3. Fallback to the first available node.
      setSelectedNodeIdState((prev) => {
        if (prev && list.some((n) => n.nodeId === prev)) {
          return prev;
        }
        if (master?.nodeId && list.some((n) => n.nodeId === master.nodeId)) {
          localStorage.setItem('airsense_selected_node', master.nodeId);
          return master.nodeId;
        }
        const masterFromList = list.find((n) => n.isMaster);
        if (masterFromList) {
          localStorage.setItem('airsense_selected_node', masterFromList.nodeId);
          return masterFromList.nodeId;
        }
        if (list.length > 0) {
          localStorage.setItem('airsense_selected_node', list[0].nodeId);
          return list[0].nodeId;
        }
        return '';
      });
    } catch (err) {
      console.error('Failed to load nodes in context:', err);
    } finally {
      setLoadingNodes(false);
    }
  }, []);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  // Update selected node ID across all tabs and persist to localStorage
  const setSelectedNodeId = useCallback((id) => {
    setSelectedNodeIdState(id);
    if (id) {
      localStorage.setItem('airsense_selected_node', id);
    } else {
      localStorage.removeItem('airsense_selected_node');
    }
  }, []);

  // Real-time socket sync
  useEffect(() => {
    const handleNodeCreated = () => fetchNodes();
    const handleNodeUpdated = () => fetchNodes();
    const handleNodeDeleted = (payload) => {
      fetchNodes();
      if (payload?.nodeId && payload.nodeId === selectedNodeId) {
        if (payload.newMasterNodeId) {
          setSelectedNodeId(payload.newMasterNodeId);
        }
      }
    };
    const handleMasterChanged = (newMaster) => {
      setMasterNode(newMaster);
      fetchNodes();
    };

    socket.on('node_created', handleNodeCreated);
    socket.on('node_updated', handleNodeUpdated);
    socket.on('node_deleted', handleNodeDeleted);
    socket.on('master_node_changed', handleMasterChanged);

    return () => {
      socket.off('node_created', handleNodeCreated);
      socket.off('node_updated', handleNodeUpdated);
      socket.off('node_deleted', handleNodeDeleted);
      socket.off('master_node_changed', handleMasterChanged);
    };
  }, [fetchNodes, selectedNodeId, setSelectedNodeId]);

  const selectedNode = nodes.find((n) => n.nodeId === selectedNodeId) || null;

  return (
    <NodeContext.Provider
      value={{
        nodes,
        masterNode,
        selectedNodeId,
        selectedNode,
        setSelectedNodeId,
        fetchNodes,
        loadingNodes,
      }}
    >
      {children}
    </NodeContext.Provider>
  );
}

export function useNodes() {
  const context = useContext(NodeContext);
  if (!context) {
    throw new Error('useNodes must be used within a NodeProvider');
  }
  return context;
}
