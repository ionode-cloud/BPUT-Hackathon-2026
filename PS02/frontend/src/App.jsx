import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';

import Dashboard from './pages/Dashboard';
import Nodes from './pages/Nodes';
import Analytics from './pages/Analytics';
import AlertHistory from './pages/AlertHistory';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="live-monitoring" element={<Navigate to="/" replace />} />
          <Route path="nodes" element={<Nodes />} />
          <Route path="heat-stress" element={<Navigate to="/" replace />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="alerts" element={<AlertHistory />} />
          <Route path="alert-history" element={<Navigate to="/alerts" replace />} />
          <Route path="heat-map" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
